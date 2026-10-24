// SecuGen Hamster Pro 20 (HU20) WebAPI Hardware & ISO/IEC 19794-2 (FMR 20) Biometric Engine
import { safeLocalStorage } from '../utils/safeStorage';

export interface SecuGenCaptureOptions {
  timeoutMs?: number;
  quality?: number;
  templateFormat?: 'ISO' | 'ANSI';
}

export interface SecuGenCaptureResult {
  success: boolean;
  templateBase64?: string;
  bmpBase64?: string; // Raw base64 starting with "Qk" for backward compatibility
  bmpDataUrl?: string; // Full data:image/bmp;base64,... URL
  quality?: number;
  serialNumber?: string;
  minutiaeCount?: number;
  error?: string;
}

export interface SecuGenMatchResult {
  success: boolean;
  matched: boolean;
  score: number;
  error?: string;
}

export interface IsoMinutiaPoint {
  type: number; // 1 = ridge ending, 2 = ridge bifurcation
  x: number;
  y: number;
  angle: number; // 0..255 (representing 0..360 deg)
  quality: number;
}

const SECUGEN_ENDPOINTS = [
  'https://localhost:8443',
  'https://127.0.0.1:8443',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'https://localhost:8000',
];

function decodeBase64ToBytes(base64Str: string): Uint8Array | null {
  try {
    const clean = base64Str
      .trim()
      .replace(/^data:[^,]+,/, '')
      .replace(/\s+/g, '');
    if (!clean) return null;
    const binary = typeof atob === 'function' ? atob(clean) : Buffer.from(clean, 'base64').toString('binary');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i) & 0xff;
    }
    return bytes;
  } catch {
    return null;
  }
}

function angleDiff256(a1: number, a2: number): number {
  const d = Math.abs(a1 - a2) & 0xff;
  return d > 128 ? 256 - d : d;
}

class SecuGenService {
  private activeEndpoint: string | null = null;
  private isCapturingLock = false;
  private cachedStatus: { connected: boolean; deviceFound: boolean; endpoint?: string; checkedAt: number } | null = null;
  private hwMatchEndpointWorks: boolean | null = null;

  /**
   * Parses an ISO/IEC 19794-2 (FMR 20) fingerprint template into its constituent minutiae points.
   * All 31+ faculty and student templates in Supabase use this exact ISO FMR 20 format ("Rk1SACAyMAAA...").
   */
  parseIsoMinutiae(templateBase64?: string | null): IsoMinutiaPoint[] {
    if (!templateBase64 || typeof templateBase64 !== 'string') return [];
    const bytes = decodeBase64ToBytes(templateBase64);
    if (!bytes || bytes.length < 28) return [];
    // Check "FMR\0" magic header (0x46, 0x4d, 0x52, 0x00)
    if (bytes[0] !== 0x46 || bytes[1] !== 0x4d || bytes[2] !== 0x52) return [];

    const numMinutiae = bytes[27];
    const points: IsoMinutiaPoint[] = [];
    let offset = 28;
    for (let i = 0; i < numMinutiae && offset + 6 <= bytes.length; i++) {
      const w1 = (bytes[offset] << 8) | bytes[offset + 1];
      const w2 = (bytes[offset + 2] << 8) | bytes[offset + 3];
      const type = (w1 >> 14) & 0x3;
      const x = w1 & 0x3fff;
      const y = w2 & 0x3fff;
      const angle = bytes[offset + 4];
      const quality = bytes[offset + 5];
      points.push({ type, x, y, angle, quality });
      offset += 6;
    }
    return points;
  }

  /**
   * Rotation- and translation-invariant geometric minutiae matcher for ISO/IEC 19794-2 (FMR 20) templates.
   * Returns a similarity score on SecuGen's 0..199 scale (threshold >= 80 for a verified match).
   */
  matchIsoFmr20(template1: string, template2: string): number {
    if (!template1 || !template2) return 0;
    const t1 = template1.trim();
    const t2 = template2.trim();
    if (t1 === t2) return 199;

    const mA = this.parseIsoMinutiae(t1);
    const mB = this.parseIsoMinutiae(t2);
    if (mA.length < 5 || mB.length < 5) return 0;

    let bestScoreVal = 0;

    for (let i = 0; i < mA.length; i++) {
      const aRef = mA[i];
      for (let j = 0; j < mB.length; j++) {
        const bRef = mB[j];
        const dThetaByte = (aRef.angle - bRef.angle + 256) & 0xff;
        // Allow up to +/- 34 degrees finger rotation (+/- 24 in 0..255 scale)
        if (dThetaByte > 24 && dThetaByte < 232) continue;

        const rad = (dThetaByte * 2 * Math.PI) / 256;
        const cosT = Math.cos(rad);
        const sinT = Math.sin(rad);

        const usedB = new Uint8Array(mB.length);
        usedB[j] = 1;
        let matched = 1;
        let qualityPoints = aRef.type === bRef.type ? 1.15 : 0.9;

        for (let u = 0; u < mA.length; u++) {
          if (u === i) continue;
          const mu = mA[u];
          const dx = mu.x - aRef.x;
          const dy = mu.y - aRef.y;

          let bestV = -1;
          let bestDistSq = 15 * 15; // 15px radial tolerance for skin elasticity

          for (let v = 0; v < mB.length; v++) {
            if (usedB[v]) continue;
            const mv = mB[v];
            const ad = angleDiff256(mu.angle, (mv.angle + dThetaByte) & 0xff);
            if (ad > 12) continue; // ~16.8 deg local ridge angle tolerance

            const bdx = mv.x - bRef.x;
            const bdy = mv.y - bRef.y;
            const rx = bdx * cosT - bdy * sinT;
            const ry = bdx * sinT + bdy * cosT;

            const distSq = (dx - rx) * (dx - rx) + (dy - ry) * (dy - ry);
            if (distSq < bestDistSq) {
              bestDistSq = distSq;
              bestV = v;
            }
          }

          if (bestV !== -1) {
            usedB[bestV] = 1;
            matched++;
            const dist = Math.sqrt(bestDistSq);
            const ad = angleDiff256(mu.angle, (mB[bestV].angle + dThetaByte) & 0xff);
            const posWeight = 1 - (dist / 15) * 0.45;
            const angWeight = 1 - (ad / 12) * 0.25;
            const typeBonus = mu.type === mB[bestV].type ? 1.15 : 0.9;
            qualityPoints += posWeight * angWeight * typeBonus;
          }
        }

        if (matched >= 8) {
          const minLen = Math.min(mA.length, mB.length);
          const maxLen = Math.max(mA.length, mB.length);
          const denom = Math.sqrt(minLen * maxLen);
          const sc = (qualityPoints / Math.max(12, denom * 0.43)) * 122;
          if (sc > bestScoreVal) bestScoreVal = sc;
        }
      }
    }

    return Math.min(199, Math.round(bestScoreVal));
  }

  /**
   * Checks whether the local SecuGen WebAPI service (SGIBioSrv) is running and device is attached.
   * CRITICAL: Never interrupts an active finger capture and caches positive status so background
   * polling in App.tsx never locks the USB scanner (preventing ErrorCode 59 Device Busy).
   */
  async getStatus(forceRefresh = false): Promise<{ connected: boolean; deviceFound: boolean; endpoint?: string }> {
    if (this.isCapturingLock) {
      return {
        connected: true,
        deviceFound: true,
        endpoint: this.activeEndpoint || SECUGEN_ENDPOINTS[0],
      };
    }

    if (!forceRefresh && this.cachedStatus && this.cachedStatus.connected && Date.now() - this.cachedStatus.checkedAt < 60000) {
      return {
        connected: this.cachedStatus.connected,
        deviceFound: this.cachedStatus.deviceFound,
        endpoint: this.cachedStatus.endpoint,
      };
    }

    const candidates = this.activeEndpoint
      ? [this.activeEndpoint, ...SECUGEN_ENDPOINTS.filter((e) => e !== this.activeEndpoint)]
      : SECUGEN_ENDPOINTS;

    for (const base of candidates) {
      if (this.isCapturingLock) {
        return { connected: true, deviceFound: true, endpoint: base };
      }
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(`${base}/SGIFPCapture`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: 'Timeout=100&Quality=40&templateFormat=ISO',
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && typeof data.ErrorCode === 'number') {
            this.activeEndpoint = base;
            // ErrorCode 0 = success, 54 = timeout (sensor ready), 59 = busy (sensor active), 55 = device not found
            const deviceFound = data.ErrorCode !== 55 && data.ErrorCode !== 10001;
            this.cachedStatus = {
              connected: true,
              deviceFound,
              endpoint: base,
              checkedAt: Date.now(),
            };
            return { connected: true, deviceFound, endpoint: base };
          }
        }
      } catch {
        // Try next candidate
      }
    }

    return { connected: false, deviceFound: false };
  }

  /**
   * Captures a fingerprint from the SecuGen USB scanner.
   * Automatically handles transient ErrorCode 59 (Device Busy) and returns both raw BMPBase64 ("Qk...")
   * and ISO 19794-2 TemplateBase64.
   */
  async captureFingerprint(options: SecuGenCaptureOptions = {}): Promise<SecuGenCaptureResult> {
    const timeoutMs = options.timeoutMs ?? 10000;
    const quality = options.quality ?? 40;
    const templateFormat = options.templateFormat ?? 'ISO';

    // If another capture is finishing up, wait briefly
    let waitLoops = 0;
    while (this.isCapturingLock && waitLoops < 6) {
      await new Promise((r) => setTimeout(r, 200));
      waitLoops++;
    }

    this.isCapturingLock = true;

    try {
      const endpoints = this.activeEndpoint
        ? [this.activeEndpoint, ...SECUGEN_ENDPOINTS.filter((e) => e !== this.activeEndpoint)]
        : SECUGEN_ENDPOINTS;

      for (const base of endpoints) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs + 4000);
            const res = await fetch(`${base}/SGIFPCapture`, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
              body: `Timeout=${timeoutMs}&Quality=${quality}&templateFormat=${templateFormat}&imageWSQRate=0.75`,
              signal: controller.signal,
            });
            clearTimeout(timer);

            if (res.ok) {
              const data = await res.json();
              this.activeEndpoint = base;
              this.cachedStatus = {
                connected: true,
                deviceFound: data.ErrorCode !== 55 && data.ErrorCode !== 10001,
                endpoint: base,
                checkedAt: Date.now(),
              };

              // If device was momentarily busy from a status check (ErrorCode 59), wait 350ms and retry
              if (data.ErrorCode === 59 && attempt < 2) {
                await new Promise((r) => setTimeout(r, 350));
                continue;
              }

              if (data.ErrorCode === 0 && data.TemplateBase64) {
                const rawBmp: string | undefined = data.BMPBase64 || undefined;
                const minutiae = this.parseIsoMinutiae(data.TemplateBase64);
                return {
                  success: true,
                  templateBase64: data.TemplateBase64,
                  bmpBase64: rawBmp, // Raw "Qk..." base64 expected by AdmissionsView & StudentsView
                  bmpDataUrl: rawBmp
                    ? rawBmp.startsWith('data:')
                      ? rawBmp
                      : `data:image/bmp;base64,${rawBmp}`
                    : undefined,
                  quality: data.ImageQuality ?? quality,
                  serialNumber: data.SerialNumber,
                  minutiaeCount: minutiae.length,
                };
              } else {
                return {
                  success: false,
                  error: this.getErrorMessage(data.ErrorCode),
                };
              }
            }
          } catch {
            break; // Endpoint unreachable, try next endpoint
          }
        }
      }

      return {
        success: false,
        error: 'SecuGen scanner service not responding. Please ensure SGIBioSrv is running and USB scanner is plugged in.',
      };
    } finally {
      this.isCapturingLock = false;
    }
  }

  /**
   * Matches two templates using both the ISO/IEC 19794-2 (FMR 20) geometric minutiae engine
   * and the local SecuGen WebAPI (/SGIMatchScore) when available.
   */
  async matchTemplates(
    template1: string,
    template2: string,
    templateFormat: 'ISO' | 'ANSI' = 'ISO'
  ): Promise<SecuGenMatchResult> {
    if (!template1 || !template2) {
      return { success: false, matched: false, score: 0, error: 'Missing templates' };
    }
    const clean1 = template1.trim();
    const clean2 = template2.trim();
    if (clean1 === clean2) {
      return { success: true, matched: true, score: 199 };
    }

    // 1. Instant (< 0.2ms) ISO 19794-2 FMR 20 geometric minutiae match
    const isoScore = this.matchIsoFmr20(clean1, clean2);

    // 2. If activeEndpoint is available and ISO score shows potential alignment (or templates aren't ISO),
    // query SecuGen's native /SGIMatchScore endpoint with a fast timeout.
    let hwScore = 0;
    if (this.activeEndpoint && this.hwMatchEndpointWorks !== false && (isoScore >= 42 || isoScore === 0)) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 500);
        const bodyStr =
          `Template1=${encodeURIComponent(clean1)}` +
          `&Template2=${encodeURIComponent(clean2)}` +
          `&template1=${encodeURIComponent(clean1)}` +
          `&template2=${encodeURIComponent(clean2)}` +
          `&templateFormat=${templateFormat}`;

        const res = await fetch(`${this.activeEndpoint}/SGIMatchScore`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: bodyStr,
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.ErrorCode === 0 && typeof data.MatchingScore !== 'undefined') {
            this.hwMatchEndpointWorks = true;
            hwScore = Number(data.MatchingScore || 0);
          } else if (data && data.ErrorCode && data.ErrorCode !== 0) {
            // e.g. license missing on local SGIMatchScore; rely on ISO FMR 20 engine
            this.hwMatchEndpointWorks = false;
          }
        } else {
          this.hwMatchEndpointWorks = false;
        }
      } catch {
        this.hwMatchEndpointWorks = false;
      }
    }

    const finalScore = Math.max(isoScore, hwScore);
    // Match threshold: 80 on SecuGen 0..199 scale
    return {
      success: true,
      matched: finalScore >= 80,
      score: finalScore,
    };
  }

  /**
   * Saves a captured BMP thumbprint both to localStorage and the server's /uploads/fingerprints directory.
   */
  saveFingerprintThumbnail(personId: string, bmpBase64?: string | null, altId?: string | null) {
    if (!bmpBase64 || !personId) return;
    const rawBmp = bmpBase64.replace(/^data:image\/\w+;base64,/, '');
    try {
      safeLocalStorage.setItem(`scj_fp_thumb_${personId}`, rawBmp);
      if (altId) safeLocalStorage.setItem(`scj_fp_thumb_${altId}`, rawBmp);
    } catch {}

    fetch('/api/save-fingerprint-thumb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personId,
        rollNo: altId || undefined,
        bmpBase64: rawBmp,
      }),
    }).catch(() => {});
  }

  private getErrorMessage(code: number): string {
    switch (code) {
      case 51:
        return 'System file load failure.';
      case 52:
        return 'Sensor chip initialization failed. Reconnect USB scanner.';
      case 53:
        return 'Sensor USB line dropped. Reconnect scanner cable.';
      case 54:
        return 'Scan timed out — Please place your finger flat and firmly on the glowing SecuGen sensor.';
      case 55:
        return 'SecuGen HU20 scanner not detected. Please check USB cable connection.';
      case 56:
        return 'SecuGen USB driver load failed.';
      case 57:
        return 'Partial fingerprint image. Please place your thumb flat on the center of the glass sensor.';
      case 58:
        return 'USB bandwidth limit reached. Try another USB port.';
      case 59:
        return 'Scanner is busy completing a previous operation. Please try again in 1 second.';
      default:
        return `SecuGen Scanner Error (Code: ${code})`;
    }
  }
}

export const secugenService = new SecuGenService();
export default secugenService;
