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
  "https://localhost:8443", // Official SecuGen WebAPI default (HTTPS - SSL cert issued to 'localhost')
  "https://127.0.0.1:8443",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:8080",
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
    case 5:
      return "SecuGen DLL load failed";
    case 8:
    case 56:
      return "SecuGen USB driver load failed. Please install the SecuGen device driver.";
    case 10:
    case 51:
    case 53:
    case 55:
      return "SecuGen HU20-A Scanner not found. Please plug in the USB cable.";
    case 52:
      return "SecuGen sensor chip initialization failed. Unplug and replug the USB scanner.";
    case 54:
      return "Fingerprint capture timed out. Finger was not placed on the scanner in time.";
    case 57:
      return "Wrong fingerprint image format.";
    case 58:
      return "Lack of USB bandwidth.";
    case 59:
      return "SecuGen device is busy or in use by another application.";
    case 60:
      return "Cannot get serial number of SecuGen device.";
    case 61:
      return "Unsupported fingerprint reader device.";
    case 63:
      return "SgiBioSrv service not ready. Try again.";
    case 101:
      return "Fake finger detected.";
    case 10004:
      return "Browser Origin check failed or license expired.";
    default:
      return `SecuGen hardware status code #${errorCode}`;
  }
}

function callSecuGenApi(
  url: string,
  endpoint: string,
  params: Record<string, string>,
  timeoutMs = 10000
): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      const body = Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");

      xhr.timeout = timeoutMs;
      xhr.open("POST", `${url}${endpoint}`, true);

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error(`HTTP ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error("Network or SSL handshake failed"));
      xhr.ontimeout = () => reject(new Error("SecuGen request timed out"));
      xhr.send(body);
    } catch (err) {
      reject(err);
    }
  });
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

    // Prioritize previously working activeUrl if known
    const probeUrls = this.activeUrl
      ? [this.activeUrl, ...SECUGEN_CANDIDATE_URLS.filter((u) => u !== this.activeUrl)]
      : SECUGEN_CANDIDATE_URLS;

    for (const url of probeUrls) {
      try {
        const data = await callSecuGenApi(
          url,
          "/SGIFPCapture",
          {
            Timeout: "150",
            Quality: "50",
            licstr: "",
            templateFormat: "ISO",
            imageWSQRate: "0.75",
          },
          2500
        );

        if (data) {
          serviceRunning = true;
          foundUrl = url;

          const errCode = typeof data.ErrorCode === "number" ? data.ErrorCode : -1;
          // ErrorCode 0 (finger captured) or 54 (capture timed out with no finger on sensor) means hardware is ready!
          if (errCode === 0 || errCode === 54) {
            deviceFound = true;
            deviceInfo = {
              deviceMake: "SecuGen",
              deviceModel: "HU20-A (Hamster Pro 20)",
              deviceSerial: data.SerialNumber || data.DeviceSerial || "Ready",
              imageWidth: data.ImageWidth || 300,
              imageHeight: data.ImageHeight || 400,
              brightness: data.Brightness,
              contrast: data.Contrast,
              gain: data.Gain,
              errorCode: errCode,
              raw: data,
            };
          } else {
            deviceFound = false;
          }
          break; // Found working service!
        }
      } catch (err: any) {
        if (url.startsWith("https://")) {
          // In Chrome/Edge, XMLHttpRequest fails due to untrusted self-signed certificate on localhost:8443
          isSslCertificateRequired = true;
        }
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
          ? "SecuGen WebAPI service detected, but browser SSL permission is required for https://localhost:8443."
          : "SecuGen WebAPI Windows service is not running. Please launch SgiBioSrv."
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
      const data = await callSecuGenApi(
        status.activeUrl,
        "/SGIFPCapture",
        {
          Timeout: String(timeout),
          Quality: String(quality),
          licstr: "",
          templateFormat,
          imageWSQRate: "0.75",
        },
        timeout + 3000
      );

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
      const data = await callSecuGenApi(
        status.activeUrl,
        "/SGIMatchScore",
        {
          template1,
          template2,
          licstr: "",
          templateFormat,
        },
        5000
      );

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
