/**
 * ==============================================================================
 * SecuGen Hamster Pro 20 (HU20-A) Biometric WebAPI Service
 * Superior Group of Colleges Jahanian (SGC-J)
 * ==============================================================================
 * Connects directly to local SecuGen WebAPI Windows Service over HTTP/HTTPS.
 * Supports auto-port discovery (8443 HTTPS, 8000/8080 HTTP), ANSI/ISO templates,
 * fingerprint capture, 1:1 verification, and 1:N candidate identification.
 * ==============================================================================
 */

export interface SecuGenDeviceInfo {
  deviceMake?: string;
  deviceModel?: string;
  deviceSerial?: string;
  imageWidth?: number;
  imageHeight?: number;
  brightness?: number;
  contrast?: number;
  gain?: number;
  errorCode?: number;
  raw?: any;
}

export interface SecuGenStatus {
  connected: boolean;
  serviceRunning: boolean;
  deviceFound: boolean;
  activeUrl: string | null;
  deviceInfo?: SecuGenDeviceInfo;
  error?: string;
  isSslCertificateRequired?: boolean;
}

export interface FingerprintCaptureOptions {
  timeoutMs?: number; // Milliseconds before sensor times out (default: 10000ms)
  quality?: number; // Minimum image quality score 1-100 (default: 50)
  templateFormat?: "ISO" | "ANSI"; // Template standard (default: ISO)
  fakeDetection?: boolean;
}

export interface FingerprintCaptureResult {
  success: boolean;
  templateBase64?: string;
  bmpBase64?: string; // Preview image in Base64 (data:image/bmp;base64,...)
  quality?: number;
  imageWidth?: number;
  imageHeight?: number;
  errorCode?: number;
  error?: string;
}

export interface FingerprintMatchResult {
  success: boolean;
  matchingScore: number; // 0 to 199. Score >= 90 is considered a verified match
  isMatched: boolean;
  errorCode?: number;
  error?: string;
}

export interface EnrolledCandidate {
  id: string;
  fullName: string;
  fatherName?: string;
  collegeNo?: string;
  phone?: string;
  personType: "student" | "staff";
  roleOrGroup?: string;
  photo?: string;
  fingerprintTemplate?: string;
  fingerprintFinger?: string;
}

// Standard candidate ports used by SecuGen WebAPI service on Windows
const SECUGEN_CANDIDATE_URLS = [
  "https://127.0.0.1:8443", // Official SecuGen WebAPI default (HTTPS)
  "http://127.0.0.1:8000",  // Official SecuGen HTTP fallback
  "http://localhost:8000",
  "http://127.0.0.1:8080",
  "https://localhost:8443",
];

// Decodes SecuGen standard error codes to human-friendly Urdu/English instructions
export function getSecuGenErrorMessage(errorCode: number): string {
  switch (errorCode) {
    case 0:
      return "Success";
    case 1:
      return "Creation failed";
    case 2:
      return "Function failed";
    case 3:
      return "Invalid parameter";
    case 4:
      return "Not used";
    case 5:
      return "DLL load failed";
    case 6:
      return "DLL unload failed";
    case 7:
      return "String buffer too small";
    case 8:
      return "Driver load failed";
    case 9:
      return "Invalid driver handle";
    case 10:
      return "Not connected";
    case 51:
      return "SecuGen HU20-A Scanner not found. Please plug in the USB cable.";
    case 52:
      return "Capture timed out. Finger was not placed on the scanner in time.";
    case 53:
      return "Capture operation cancelled.";
    case 54:
      return "Fingerprint quality was too low. Please place your finger firmly and flat.";
    case 55:
      return "Device is busy or already in use by another process.";
    case 101:
      return "Fake finger detected.";
    default:
      return `SecuGen hardware error code #${errorCode}`;
  }
}

class SecuGenService {
  private activeUrl: string | null = null;
  private isChecking = false;
  private lastCheckTime = 0;
  private cachedStatus: SecuGenStatus | null = null;

  /**
   * Probes candidate local ports to find the active SecuGen WebAPI service
   */
  public async getStatus(forceRefresh = false): Promise<SecuGenStatus> {
    const now = Date.now();
    if (!forceRefresh && this.cachedStatus && now - this.lastCheckTime < 5000) {
      return this.cachedStatus;
    }

    if (this.isChecking) {
      return this.cachedStatus || {
        connected: false,
        serviceRunning: false,
        deviceFound: false,
        activeUrl: this.activeUrl,
        error: "Checking device status...",
      };
    }

    this.isChecking = true;
    let serviceRunning = false;
    let deviceFound = false;
    let foundUrl: string | null = null;
    let deviceInfo: SecuGenDeviceInfo | undefined;
    let isSslCertificateRequired = false;
    let lastError: string | undefined;

    // Prioritize previously working activeUrl if known
    const probeUrls = this.activeUrl
      ? [this.activeUrl, ...SECUGEN_CANDIDATE_URLS.filter((u) => u !== this.activeUrl)]
      : SECUGEN_CANDIDATE_URLS;

    for (const url of probeUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800);

        // SecuGen WebAPI SGIDeviceInfo endpoint
        const response = await fetch(`${url}/SGIDeviceInfo`, {
          method: "GET",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        }).catch(async () => {
          // Some WebAPI versions require POST for SGIDeviceInfo
          return await fetch(`${url}/SGIDeviceInfo`, {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
        });

        clearTimeout(timeoutId);

        if (response && response.ok) {
          const data = await response.json();
          serviceRunning = true;
          foundUrl = url;

          const errCode = typeof data.ErrorCode === "number" ? data.ErrorCode : 0;
          if (errCode === 0 || errCode === 51) {
            deviceFound = errCode === 0;
            deviceInfo = {
              deviceMake: data.DeviceMake || "SecuGen",
              deviceModel: data.DeviceModel || "HU20-A (Hamster Pro 20)",
              deviceSerial: data.DeviceSerial || data.Serial || "Unknown",
              imageWidth: data.ImageWidth || 300,
              imageHeight: data.ImageHeight || 400,
              brightness: data.Brightness,
              contrast: data.Contrast,
              gain: data.Gain,
              errorCode: errCode,
              raw: data,
            };
          }
          break; // Found working port!
        }
      } catch (err: any) {
        if (err?.name === "TypeError" && url.startsWith("https://")) {
          // In Chrome/Edge, fetch failed due to untrusted self-signed certificate on 127.0.0.1:8443
          isSslCertificateRequired = true;
        }
        lastError = err?.message || String(err);
      }
    }

    this.activeUrl = foundUrl;
    this.isChecking = false;
    this.lastCheckTime = now;

    this.cachedStatus = {
      connected: serviceRunning && deviceFound,
      serviceRunning,
      deviceFound,
      activeUrl: foundUrl,
      deviceInfo,
      isSslCertificateRequired: !serviceRunning && isSslCertificateRequired,
      error: !serviceRunning
        ? isSslCertificateRequired
          ? "SecuGen WebAPI service detected, but browser SSL permission is required for https://127.0.0.1:8443."
          : "SecuGen WebAPI Windows service is not running or not installed on this PC."
        : !deviceFound
        ? "SecuGen service is running, but HU20-A scanner is not detected. Please verify USB connection."
        : undefined,
    };

    return this.cachedStatus;
  }

  /**
   * Captures a live fingerprint impression from the SecuGen HU20-A scanner
   */
  public async captureFingerprint(
    options: FingerprintCaptureOptions = {}
  ): Promise<FingerprintCaptureResult> {
    const status = await this.getStatus();

    if (!status.serviceRunning || !status.activeUrl) {
      return {
        success: false,
        error: status.error || "SecuGen WebAPI service is not connected.",
      };
    }

    const timeout = options.timeoutMs || 10000;
    const quality = options.quality || 50;
    const templateFormat = options.templateFormat || "ISO";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout + 3000);

      const params = {
        Timeout: timeout,
        Quality: quality,
        templateFormat: templateFormat,
        imageWSQRate: 0,
      };

      const response = await fetch(`${status.activeUrl}/SGIFPCapture`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(params),
      }).catch(async (fetchErr) => {
        // Fallback to URL-encoded form data if JSON endpoint is rejected
        const formParams = new URLSearchParams();
        formParams.append("Timeout", String(timeout));
        formParams.append("Quality", String(quality));
        formParams.append("templateFormat", templateFormat);
        formParams.append("imageWSQRate", "0");

        return await fetch(`${status.activeUrl}/SGIFPCapture`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formParams.toString(),
        });
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `SecuGen capture request failed (HTTP ${response.status})`,
        };
      }

      const data = await response.json();
      const errorCode = typeof data.ErrorCode === "number" ? data.ErrorCode : -1;

      if (errorCode !== 0) {
        return {
          success: false,
          errorCode,
          error: getSecuGenErrorMessage(errorCode),
        };
      }

      const templateBase64 = data.TemplateBase64 || data.Template;
      const rawBmp = data.BMPBase64 || data.BMP;
      const bmpBase64 = rawBmp
        ? rawBmp.startsWith("data:image")
          ? rawBmp
          : `data:image/bmp;base64,${rawBmp}`
        : undefined;

      return {
        success: true,
        templateBase64,
        bmpBase64,
        quality: data.Quality || data.ImageQuality || quality,
        imageWidth: data.ImageWidth || 300,
        imageHeight: data.ImageHeight || 400,
        errorCode: 0,
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        return {
          success: false,
          errorCode: 52,
          error: "Fingerprint capture timed out. Please place your finger on the sensor and try again.",
        };
      }
      return {
        success: false,
        error: `Fingerprint capture error: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * Compares two fingerprint templates (1:1 matching)
   */
  public async matchFingerprints(
    template1: string,
    template2: string,
    templateFormat: "ISO" | "ANSI" = "ISO"
  ): Promise<FingerprintMatchResult> {
    if (!template1 || !template2) {
      return {
        success: false,
        matchingScore: 0,
        isMatched: false,
        error: "Missing fingerprint template for comparison.",
      };
    }

    // Direct string match check (identical template)
    if (template1.trim() === template2.trim()) {
      return {
        success: true,
        matchingScore: 199,
        isMatched: true,
      };
    }

    const status = await this.getStatus();

    if (!status.serviceRunning || !status.activeUrl) {
      return {
        success: false,
        matchingScore: 0,
        isMatched: false,
        error: "SecuGen WebAPI service is not connected for matching.",
      };
    }

    try {
      const response = await fetch(`${status.activeUrl}/SGIMatchScore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template1,
          template2,
          templateFormat,
        }),
      }).catch(async () => {
        const formParams = new URLSearchParams();
        formParams.append("template1", template1);
        formParams.append("template2", template2);
        formParams.append("templateFormat", templateFormat);

        return await fetch(`${status.activeUrl}/SGIMatchScore`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formParams.toString(),
        });
      });

      if (!response.ok) {
        return {
          success: false,
          matchingScore: 0,
          isMatched: false,
          error: `Match request failed (HTTP ${response.status})`,
        };
      }

      const data = await response.json();
      const errorCode = typeof data.ErrorCode === "number" ? data.ErrorCode : -1;

      if (errorCode !== 0) {
        return {
          success: false,
          matchingScore: 0,
          isMatched: false,
          errorCode,
          error: getSecuGenErrorMessage(errorCode),
        };
      }

      const score = Number(data.MatchingScore || data.Score || 0);
      // SecuGen matching score threshold: >= 90 is considered a verified match (100 is false accept rate < 0.001%)
      const isMatched = score >= 90;

      return {
        success: true,
        matchingScore: score,
        isMatched,
        errorCode: 0,
      };
    } catch (err: any) {
      return {
        success: false,
        matchingScore: 0,
        isMatched: false,
        error: `Matching error: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * 1:N Identification: Finds a matching student or staff member from a list of enrolled candidates
   */
  public async identifyCandidate(
    liveTemplate: string,
    candidates: EnrolledCandidate[],
    onProgress?: (current: number, total: number) => void
  ): Promise<{ candidate: EnrolledCandidate; score: number } | null> {
    if (!liveTemplate || candidates.length === 0) return null;

    let bestCandidate: EnrolledCandidate | null = null;
    let bestScore = 0;

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (!c.fingerprintTemplate) continue;

      if (onProgress) onProgress(i + 1, candidates.length);

      const matchRes = await this.matchFingerprints(liveTemplate, c.fingerprintTemplate);
      if (matchRes.success && matchRes.matchingScore > bestScore) {
        bestScore = matchRes.matchingScore;
        bestCandidate = c;

        // If score is high confidence (>= 115), return immediately without waiting for rest!
        if (bestScore >= 115) {
          return { candidate: bestCandidate, score: bestScore };
        }
      }
    }

    if (bestCandidate && bestScore >= 90) {
      return { candidate: bestCandidate, score: bestScore };
    }

    return null;
  }
}

export const secugenService = new SecuGenService();
