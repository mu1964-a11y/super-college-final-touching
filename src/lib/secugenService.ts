// SecuGen Hamster Pro 20 (HU20) WebAPI Hardware Integration Service
export interface SecuGenCaptureOptions {
  timeoutMs?: number;
  quality?: number;
  templateFormat?: 'ISO' | 'ANSI';
}

export interface SecuGenCaptureResult {
  success: boolean;
  templateBase64?: string;
  bmpBase64?: string;
  quality?: number;
  serialNumber?: string;
  error?: string;
}

export interface SecuGenMatchResult {
  success: boolean;
  matched: boolean;
  score: number;
  error?: string;
}

const SECUGEN_ENDPOINTS = [
  'https://localhost:8443',
  'https://127.0.0.1:8443',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
];

class SecuGenService {
  private activeEndpoint: string | null = null;

  async getStatus(): Promise<{ connected: boolean; deviceFound: boolean; endpoint?: string }> {
    for (const base of SECUGEN_ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(`${base}/SGIFPCapture`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: 'Timeout=500&Quality=50&templateFormat=ISO',
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && typeof data.ErrorCode === 'number') {
            this.activeEndpoint = base;
            // ErrorCode 0 = success, 54 = timeout (meaning device is plugged in & ready), 55 = device not found
            const deviceFound = data.ErrorCode !== 55 && data.ErrorCode !== 10001;
            return { connected: true, deviceFound, endpoint: base };
          }
        }
      } catch {
        // Endpoint not reachable
      }
    }
    return { connected: false, deviceFound: false };
  }

  async captureFingerprint(options: SecuGenCaptureOptions = {}): Promise<SecuGenCaptureResult> {
    const timeoutMs = options.timeoutMs ?? 10000;
    const quality = options.quality ?? 50;
    const templateFormat = options.templateFormat ?? 'ISO';

    const endpoints = this.activeEndpoint
      ? [this.activeEndpoint, ...SECUGEN_ENDPOINTS.filter((e) => e !== this.activeEndpoint)]
      : SECUGEN_ENDPOINTS;

    for (const base of endpoints) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs + 3000);
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
          if (data.ErrorCode === 0 && data.TemplateBase64) {
            return {
              success: true,
              templateBase64: data.TemplateBase64,
              bmpBase64: data.BMPBase64 ? `data:image/bmp;base64,${data.BMPBase64}` : undefined,
              quality: data.ImageQuality ?? quality,
              serialNumber: data.SerialNumber,
            };
          } else {
            return {
              success: false,
              error: this.getErrorMessage(data.ErrorCode),
            };
          }
        }
      } catch {
        // Try next endpoint
      }
    }

    return {
      success: false,
      error: 'SecuGen WebAPI service is not reachable. Ensure SGIBioSrv is running and USB scanner is connected.',
    };
  }

  async matchTemplates(template1: string, template2: string, templateFormat: 'ISO' | 'ANSI' = 'ISO'): Promise<SecuGenMatchResult> {
    if (!template1 || !template2) {
      return { success: false, matched: false, score: 0, error: 'Missing templates' };
    }
    if (template1 === template2) {
      return { success: true, matched: true, score: 199 };
    }

    const endpoints = this.activeEndpoint
      ? [this.activeEndpoint, ...SECUGEN_ENDPOINTS.filter((e) => e !== this.activeEndpoint)]
      : SECUGEN_ENDPOINTS;

    for (const base of endpoints) {
      try {
        const params = new URLSearchParams();
        params.append('template1', template1);
        params.append('template2', template2);
        params.append('templateFormat', templateFormat);

        const res = await fetch(`${base}/SGIFPMatchScore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.ErrorCode === 0) {
            const score = Number(data.MatchingScore || 0);
            return {
              success: true,
              matched: score >= 100,
              score,
            };
          }
        }
      } catch {
        // Try next
      }
    }

    return { success: false, matched: false, score: 0, error: 'SecuGen matching service unreachable' };
  }

  private getErrorMessage(code: number): string {
    switch (code) {
      case 51:
        return 'System file load failure.';
      case 52:
        return 'Sensor chip initialization failed.';
      case 53:
        return 'Sensor line dropped. Reconnect USB cable.';
      case 54:
        return 'Fingerprint scan timed out. Please place finger firmly on sensor.';
      case 55:
        return 'SecuGen HU20 device not found. Check USB connection.';
      case 56:
        return 'Driver load failed.';
      case 57:
        return 'Wrong image captured. Please try again.';
      case 58:
        return 'Lack of USB bandwidth.';
      case 59:
        return 'Device is busy.';
      default:
        return `SecuGen Scanner Error (Code: ${code})`;
    }
  }
}

export const secugenService = new SecuGenService();
export default secugenService;
