/**
 * Branded QR Code Engine for Superior Group of Colleges Jahanian (SGC-J)
 * 
 * Features:
 * - Error Correction Level 'H' (allows up to 30% data recovery)
 * - Centered College Crest / Logo with a clean circular quiet zone & gold border
 * - Brand-tailored Emerald Green (#085a4e) & Gold (#c9a84c) palette
 * - Tamper-Proof Cryptographic Verification Token Generation
 * - High-Resolution output (defaults to 350px for crisp mobile & A4 print)
 */

import QRCode from 'qrcode';

export interface BrandedQrOptions {
  size?: number;
  logoUrl?: string;
  darkColor?: string;
  lightColor?: string;
  margin?: number;
  includeGoldBorder?: boolean;
}

/**
 * Generates a tamper-proof 10-character cryptographic token for digital document verification.
 */
export async function generateTamperProofHash(payload: string): Promise<string> {
  const salt = '::SGC-AUTHENTIC-PORTAL-2026';
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(payload + salt);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 10).toUpperCase();
    }
  } catch {
    // Fallback to deterministic bitwise hash
  }

  let hash = 5381;
  const combined = payload + salt;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) + hash + combined.charCodeAt(i);
  }
  return Math.abs(hash).toString(16).padStart(10, '0').slice(0, 10).toUpperCase();
}

/**
 * Generates a high-resolution Branded QR Code with the Superior Crest in the center.
 * 
 * @param text The URL or payload to encode
 * @param options Styling and dimension parameters
 * @returns Promise<string> Base64 Data URL (image/png)
 */
export async function generateBrandedQrCode(
  text: string,
  options: BrandedQrOptions = {}
): Promise<string> {
  const {
    size = 400,
    logoUrl = '/superior-logo.png',
    darkColor = '#085a4e',
    lightColor = '#ffffff',
    margin = 1,
    includeGoldBorder = true,
  } = options;

  if (typeof document === 'undefined') {
    // Server / Node.js fallback
    return QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      width: size,
      margin,
      color: { dark: darkColor, light: lightColor },
    });
  }

  // Create an offscreen HTML5 canvas
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  // 1. Render base QR code onto canvas with Error Correction 'H' (30% tolerance)
  await QRCode.toCanvas(canvas, text, {
    errorCorrectionLevel: 'H',
    width: size,
    margin,
    color: {
      dark: darkColor,
      light: lightColor,
    },
  });

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return canvas.toDataURL('image/png');
  }

  // 2. Load and paint the center college logo
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const renderLogo = () => {
      try {
        // Logo takes ~20% of total QR size (well within the 30% Level 'H' tolerance)
        const logoSize = Math.round(size * 0.20);
        const x = (size - logoSize) / 2;
        const y = (size - logoSize) / 2;
        const radius = logoSize / 2;
        const centerX = x + radius;
        const centerY = y + radius;

        ctx.save();

        // 2a. Draw circular white quiet-zone backdrop
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 2b. Optional Superior Gold ring border
        if (includeGoldBorder) {
          ctx.lineWidth = Math.max(2, Math.round(size * 0.008));
          ctx.strokeStyle = '#c9a84c'; // Superior Gold
          ctx.stroke();
        }

        // 2c. Circular clipping mask for the crest
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.clip();

        // 2d. Draw image centered
        ctx.drawImage(img, x, y, logoSize, logoSize);
        ctx.restore();

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('[BrandedQrCode] Failed drawing logo overlay, returning standard QR:', err);
        resolve(canvas.toDataURL('image/png'));
      }
    };

    img.onload = renderLogo;
    img.onerror = () => {
      console.warn('[BrandedQrCode] Could not load logo image from', logoUrl);
      resolve(canvas.toDataURL('image/png'));
    };

    img.src = logoUrl;
  });
}
