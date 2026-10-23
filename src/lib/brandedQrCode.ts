import QRCode from 'qrcode';

export interface BrandedQrOptions {
  size?: number;
  logoUrl?: string;
  darkColor?: string;
  lightColor?: string;
}

export async function generateTamperProofHash(seed: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(`SCJ-VERIFY-2026::${seed}`);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 16)
        .toUpperCase();
    }
  } catch {
    // Fallback hash
  }
  let h = 2166136261;
  const str = `SCJ-VERIFY-2026::${seed}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h).toString(16).padStart(8, '0').toUpperCase();
}

export async function generateBrandedQrCode(
  payload: string,
  options: BrandedQrOptions = {}
): Promise<string> {
  const { size = 300, darkColor = '#085a4e', lightColor = '#ffffff' } = options;
  try {
    return await QRCode.toDataURL(payload, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: darkColor,
        light: lightColor,
      },
    });
  } catch {
    return '';
  }
}
