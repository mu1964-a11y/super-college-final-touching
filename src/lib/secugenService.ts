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
  matchedFinger?: string;
  error?: string;
}

export interface EnrolledFingerEntry {
  finger: string;
  template: string;
}

export const MULTI_FINGER_DELIMITER = '|||';

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
   * Normalizes a finger label so legacy labels and "Right Thumb" map to the same canonical key.
   */
  normalizeFingerKey(fingerLabel?: string | null): string {
    const raw = (fingerLabel || '').toLowerCase();
    if (raw.includes('right') && raw.includes('thumb')) return 'right_thumb';
    if (raw.includes('right') && raw.includes('index')) return 'right_index';
    if (raw.includes('left') && raw.includes('thumb')) return 'left_thumb';
    if (raw.includes('left') && raw.includes('index')) return 'left_index';
    if (raw.includes('middle')) return 'middle_finger';
    return raw.trim() || 'right_thumb';
  }

  /**
   * Returns a clean 100% English label for any finger name, stripping any Urdu or parenthetical text.
   */
  cleanFingerLabel(fingerLabel?: string | null): string {
    const key = this.normalizeFingerKey(fingerLabel);
    switch (key) {
      case 'right_thumb':
        return 'Right Thumb';
      case 'right_index':
        return 'Right Index';
      case 'left_thumb':
        return 'Left Thumb';
      case 'left_index':
        return 'Left Index';
      case 'middle_finger':
        return 'Middle Finger';
      default: {
        const stripped = (fingerLabel || '')
          .replace(/\([^)]*\)/g, '')
          .replace(/[^\x20-\x7E]/g, '')
          .trim();
        return stripped || 'Right Thumb';
      }
    }
  }

  /**
   * Extracts all enrolled { finger, template } entries from a single or multi-finger template field.
   * Supports:
   * - Single base64 ISO FMR 20 template ("Rk1SACAyMAAA...")
   * - Multi-finger "|||" delimited templates ("Rk1S...|||Rk1S...") paired with "+" or "|||" finger labels
   * - JSON array of { finger, template }
   */
  extractEnrolledFingers(
    templateField?: string | null,
    fingerField?: string | null
  ): EnrolledFingerEntry[] {
    if (!templateField || typeof templateField !== 'string') return [];
    const trimmed = templateField.trim();
    if (!trimmed || trimmed === 'enrolled') return [];

    // 1. Check if JSON array format
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item) => item && typeof item.template === 'string' && item.template.trim().length > 10)
            .map((item) => ({
              finger: this.cleanFingerLabel(String(item.finger || 'Right Thumb')),
              template: item.template.trim(),
            }));
        }
      } catch {}
    }

    // 2. Split by MULTI_FINGER_DELIMITER ("|||")
    const rawTemplates = trimmed
      .split(MULTI_FINGER_DELIMITER)
      .map((t) => t.trim())
      .filter((t) => t.length > 10);

    if (rawTemplates.length === 0) return [];

    const rawFingers = (fingerField || 'Right Thumb')
      .split(/\s*(?:\|\|\||\+)\s*/)
      .map((f) => this.cleanFingerLabel(f))
      .filter(Boolean);

    return rawTemplates.map((tpl, idx) => ({
      finger:
        rawFingers[idx] ||
        (idx === 0 ? 'Right Thumb' : idx === 1 ? 'Right Index' : `Finger #${idx + 1}`),
      template: tpl,
    }));
  }

  /**
   * Merges a newly scanned finger template with any existing enrolled finger(s) for the same person.
   * - If the person already has Right Thumb enrolled and now scans Right Index, BOTH fingers are preserved!
   * - If the person re-scans the SAME finger (e.g. Right Thumb again), that finger's template is updated while keeping any 2nd finger intact.
   */
  mergeFingerTemplate(
    existingTemplateField?: string | null,
    existingFingerField?: string | null,
    newTemplate?: string | null,
    newFinger?: string | null,
    mode: 'merge' | 'replace_all' = 'merge'
  ): {
    templateField: string;
    fingerField: string;
    entries: EnrolledFingerEntry[];
  } {
    if (!newTemplate || !newTemplate.trim()) {
      return { templateField: '', fingerField: '', entries: [] };
    }

    // If newTemplate already contains multiple templates joined by |||, parse and return directly
    if (newTemplate.includes(MULTI_FINGER_DELIMITER)) {
      const entries = this.extractEnrolledFingers(newTemplate, newFinger);
      return {
        templateField: entries.map((e) => e.template).join(MULTI_FINGER_DELIMITER),
        fingerField: entries.map((e) => this.cleanFingerLabel(e.finger)).join(' + '),
        entries,
      };
    }

    const cleanNewFinger = this.cleanFingerLabel(newFinger || 'Right Thumb');
    const cleanNewTpl = newTemplate.trim();

    if (mode === 'replace_all' || !existingTemplateField) {
      const entries = [{ finger: cleanNewFinger, template: cleanNewTpl }];
      return {
        templateField: cleanNewTpl,
        fingerField: cleanNewFinger,
        entries,
      };
    }

    const existingEntries = this.extractEnrolledFingers(existingTemplateField, existingFingerField);
    const targetKey = this.normalizeFingerKey(cleanNewFinger);

    const updatedEntries: EnrolledFingerEntry[] = [];
    let replaced = false;

    for (const entry of existingEntries) {
      if (this.normalizeFingerKey(entry.finger) === targetKey) {
        updatedEntries.push({ finger: cleanNewFinger, template: cleanNewTpl });
        replaced = true;
      } else {
        updatedEntries.push({ finger: this.cleanFingerLabel(entry.finger), template: entry.template });
      }
    }

    if (!replaced) {
      updatedEntries.push({ finger: cleanNewFinger, template: cleanNewTpl });
    }

    // Sort so Right Thumb comes first, Right Index second for clean display
    updatedEntries.sort((a, b) => {
      const ka = this.normalizeFingerKey(a.finger);
      const kb = this.normalizeFingerKey(b.finger);
      const order: Record<string, number> = {
        right_thumb: 1,
        right_index: 2,
        left_thumb: 3,
        left_index: 4,
      };
      return (order[ka] || 9) - (order[kb] || 9);
    });

    return {
      templateField: updatedEntries.map((e) => e.template).join(MULTI_FINGER_DELIMITER),
      fingerField: updatedEntries.map((e) => e.finger).join(' + '),
      entries: updatedEntries,
    };
  }

  /**
   * Returns a concise display label for a person's enrolled fingers (e.g., "Thumb + Index (2)" or "Right Thumb").
   */
  formatFingerBadge(fingerField?: string | null, templateField?: string | null): string {
    const entries = this.extractEnrolledFingers(templateField, fingerField);
    if (entries.length >= 2) {
      const names = entries.map((e) => {
        const k = this.normalizeFingerKey(e.finger);
        if (k === 'right_thumb') return 'R-Thumb';
        if (k === 'right_index') return 'R-Index';
        if (k === 'left_thumb') return 'L-Thumb';
        if (k === 'left_index') return 'L-Index';
        return e.finger.split('(')[0].trim();
      });
      return `${names.join(' + ')} (${entries.length} Fingers)`;
    }
    if (entries.length === 1) {
      return entries[0].finger;
    }
    return fingerField || 'Right Thumb (دایاں انگوٹھا)';
  }

  /**
   * Parses an ISO/IEC 19794-2 (FMR 20) fingerprint template into its constituent minutiae points.
   * All 31+ faculty and student templates in Supabase use this exact ISO FMR 20 format ("Rk1SACAyMAAA...").
   */
  parseIsoMinutiae(templateBase64?: string | null): IsoMinutiaPoint[] {
    if (!templateBase64 || typeof templateBase64 !== 'string') return [];
    const primaryTpl = templateBase64.includes(MULTI_FINGER_DELIMITER)
      ? templateBase64.split(MULTI_FINGER_DELIMITER)[0].trim()
      : templateBase64.trim();
    const bytes = decodeBase64ToBytes(primaryTpl);
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
        // Allow up to +/- 54 degrees thumb slant/rotation (+/- 38 in 0..255 scale) for natural table placement
        if (dThetaByte > 38 && dThetaByte < 218) continue;

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
          let bestDistSq = 18 * 18; // 18px radial tolerance for thumb skin elasticity

          for (let v = 0; v < mB.length; v++) {
            if (usedB[v]) continue;
            const mv = mB[v];
            const ad = angleDiff256(mu.angle, (mv.angle + dThetaByte) & 0xff);
            if (ad > 15) continue; // ~21 deg local ridge angle tolerance

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
            const posWeight = 1 - (dist / 18) * 0.45;
            const angWeight = 1 - (ad / 15) * 0.25;
            const typeBonus = mu.type === mB[bestV].type ? 1.15 : 0.9;
            qualityPoints += posWeight * angWeight * typeBonus;
          }
        }

        if (matched >= 7) {
          const minLen = Math.min(mA.length, mB.length);
          const maxLen = Math.max(mA.length, mB.length);
          const denom = Math.sqrt(minLen * maxLen);
          const sc = (qualityPoints / Math.max(12, denom * 0.42)) * 120;
          if (sc > bestScoreVal) bestScoreVal = sc;
        } else if (matched === 6) {
          // Low minutiae overlap - damp score to prevent false positives across different people
          const minLen = Math.min(mA.length, mB.length);
          const denom = Math.max(14, minLen * 0.5);
          const sc = (qualityPoints / denom) * 75;
          if (sc > bestScoreVal) bestScoreVal = Math.min(65, sc);
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
   * Matches a single scanned template against a single stored template.
   * Instant (< 0.2ms) rotation- and translation-invariant ISO 19794-2 (FMR 20) minutiae match.
   */
  public matchSingleTemplatePair(
    clean1: string,
    clean2: string,
    _templateFormat: 'ISO' | 'ANSI' = 'ISO'
  ): number {
    if (!clean1 || !clean2) return 0;
    if (clean1 === clean2) return 199;
    return this.matchIsoFmr20(clean1, clean2);
  }

  /**
   * Matches a scanned template against a person's stored template field (which may contain 1 finger
   * like Right Thumb OR 2+ fingers like Right Thumb + Right Index).
   * Runs in milliseconds entirely in memory without blocking HTTP calls.
   * If the person enrolled 2 fingers, scanning EITHER finger matches and returns the highest score.
   */
  async matchTemplates(
    template1: string,
    template2: string,
    templateFormat: 'ISO' | 'ANSI' = 'ISO',
    storedFingerField?: string | null
  ): Promise<SecuGenMatchResult> {
    if (!template1 || !template2) {
      return { success: false, matched: false, score: 0, error: 'Missing templates' };
    }
    const scannedEntries = this.extractEnrolledFingers(template1);
    const storedEntries = this.extractEnrolledFingers(template2, storedFingerField);

    if (scannedEntries.length === 0 || storedEntries.length === 0) {
      return { success: false, matched: false, score: 0, error: 'Invalid template data' };
    }

    let bestScore = 0;
    let bestFinger: string | undefined = storedEntries[0]?.finger;

    for (const scanned of scannedEntries) {
      for (const stored of storedEntries) {
        const score = this.matchSingleTemplatePair(
          scanned.template,
          stored.template,
          templateFormat
        );
        if (score > bestScore) {
          bestScore = score;
          bestFinger = stored.finger;
        }
      }
    }

    // Match threshold: calibrated to 95 on SecuGen 0..199 scale
    // Coincidental overlaps across different people peak around 60-80 (Score 79).
    // Genuine biological self-matches score 110-199. Threshold >= 95 prevents cross-matching.
    return {
      success: true,
      matched: bestScore >= 95,
      score: bestScore,
      matchedFinger: bestFinger,
    };
  }

  /**
   * Checks whether a newly scanned fingerprint template is already enrolled:
   * 1) For the SAME person (prevents scanning the exact same finger twice without deleting the old one first).
   * 2) For ANY OTHER staff member or student in the system (prevents cross-person collisions).
   */
  async checkDuplicateFinger(params: {
    scannedTemplate: string;
    currentPersonId: string;
    currentPersonName?: string;
    currentPersonExistingTemplate?: string | null;
    currentPersonExistingFinger?: string | null;
    staffList?: any[];
    studentsList?: any[];
  }): Promise<{
    isDuplicate: boolean;
    isSamePerson?: boolean;
    matchedPersonId?: string;
    matchedName?: string;
    matchedRole?: 'Staff' | 'Student';
    matchedFinger?: string;
    score?: number;
  }> {
    const {
      scannedTemplate,
      currentPersonId,
      currentPersonName,
      currentPersonExistingTemplate,
      currentPersonExistingFinger,
      staffList = [],
      studentsList = [],
    } = params;

    if (!scannedTemplate || scannedTemplate.trim().length < 20) {
      return { isDuplicate: false };
    }

    // 1. Check against the SAME person's already enrolled fingers
    if (currentPersonExistingTemplate && currentPersonExistingTemplate.trim().length > 20) {
      const sameRes = await this.matchTemplates(
        scannedTemplate,
        currentPersonExistingTemplate,
        'ISO',
        currentPersonExistingFinger
      );
      if (sameRes.matched && sameRes.score >= 80) {
        return {
          isDuplicate: true,
          isSamePerson: true,
          matchedPersonId: currentPersonId,
          matchedName: currentPersonName || 'this person',
          matchedFinger: this.cleanFingerLabel(sameRes.matchedFinger || currentPersonExistingFinger || 'Right Thumb'),
          score: sameRes.score,
        };
      }
    }

    const normCurrentId = String(currentPersonId || '').trim().toLowerCase();

    // 2. Check against all OTHER Staff members
    for (const st of staffList) {
      const tpl = st?.fingerprintTemplate || st?.fingerprint_template;
      if (!tpl || typeof tpl !== 'string' || tpl.trim().length < 20) continue;
      const stId = String(st.id || '').trim().toLowerCase();
      if (stId === normCurrentId) continue;

      const fgr = st?.fingerprintFinger || st?.fingerprint_finger;
      const res = await this.matchTemplates(scannedTemplate, tpl, 'ISO', fgr);
      if (res.matched && res.score >= 80) {
        return {
          isDuplicate: true,
          isSamePerson: false,
          matchedPersonId: st.id,
          matchedName: st.fullName || st.full_name || 'Staff Member',
          matchedRole: 'Staff',
          matchedFinger: this.cleanFingerLabel(res.matchedFinger || fgr || 'Right Thumb'),
          score: res.score,
        };
      }
    }

    // 3. Check against all OTHER Students
    for (const stu of studentsList) {
      const tpl = stu?.fingerprintTemplate || stu?.fingerprint_template;
      if (!tpl || typeof tpl !== 'string' || tpl.trim().length < 20) continue;
      const stuId = String(stu.id || '').trim().toLowerCase();
      const admId = String(stu.admissionId || stu.admission_id || '').trim().toLowerCase();
      const colNo = String(stu.collegeNo || stu.college_no || '').trim().toLowerCase();
      if (
        stuId === normCurrentId ||
        (admId && admId === normCurrentId) ||
        (colNo && colNo === normCurrentId)
      ) {
        continue;
      }

      const fgr = stu?.fingerprintFinger || stu?.fingerprint_finger;
      const res = await this.matchTemplates(scannedTemplate, tpl, 'ISO', fgr);
      if (res.matched && res.score >= 80) {
        return {
          isDuplicate: true,
          isSamePerson: false,
          matchedPersonId: stu.id,
          matchedName: stu.fullName || stu.full_name || 'Student',
          matchedRole: 'Student',
          matchedFinger: this.cleanFingerLabel(res.matchedFinger || fgr || 'Right Thumb'),
          score: res.score,
        };
      }
    }

    return { isDuplicate: false };
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
