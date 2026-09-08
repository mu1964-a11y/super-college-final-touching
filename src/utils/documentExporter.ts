import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

export interface ExportPdfOptions {
  filename: string;
  format?: 'a4' | 'a5' | 'letter' | [number, number];
  orientation?: 'portrait' | 'landscape' | 'p' | 'l';
  marginMm?: number;
  pixelRatio?: number;
  backgroundColor?: string;
  customScale?: number;
}

/**
 * Ensures all image elements and web fonts inside the node are fully loaded before capturing
 */
export async function prepareElementForCapture(element: HTMLElement): Promise<void> {
  // Wait for fonts to be ready
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Font loading failure shouldn't block document export
    }
  }

  // Wait for all img elements to complete loading
  const images = Array.from(element.querySelectorAll('img'));
  const pendingImages = images.filter((img) => !img.complete);

  if (pendingImages.length > 0) {
    await Promise.all(
      pendingImages.map(
        (img) =>
          new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Don't hang if an image 404s
            setTimeout(() => resolve(), 1500); // 1.5s max timeout per image
          })
      )
    );
  }
}

/**
 * Captures an HTML element to a high-resolution PNG Data URL using html-to-image.
 * Unlike html2canvas, html-to-image preserves 100% of Tailwind CSS v4 styles,
 * @layer utilities, flexbox, CSS variables, gradients, and rounded corners.
 */
export async function captureElementToPng(
  element: HTMLElement,
  options: {
    pixelRatio?: number;
    backgroundColor?: string;
  } = {}
): Promise<string> {
  await prepareElementForCapture(element);

  const pixelRatio = options.pixelRatio || 2.5;
  const backgroundColor = options.backgroundColor || '#ffffff';

  // Strategy 1: High-fidelity capture with font preservation
  try {
    const dataUrl = await htmlToImage.toPng(element, {
      quality: 1.0,
      pixelRatio,
      backgroundColor,
      cacheBust: true,
      skipFonts: false,
    });
    return dataUrl;
  } catch (err1) {
    console.warn('html-to-image: Font embedding failed, attempting with skipFonts: true...', err1);
  }

  // Strategy 2: Fallback skipping remote font embedding (uses already rendered vector glyphs)
  try {
    const dataUrl = await htmlToImage.toPng(element, {
      quality: 1.0,
      pixelRatio,
      backgroundColor,
      cacheBust: false,
      skipFonts: true,
    });
    return dataUrl;
  } catch (err2) {
    console.warn('html-to-image: Standard capture failed, attempting canvas conversion...', err2);
  }

  // Strategy 3: Direct toCanvas fallback
  const canvas = await htmlToImage.toCanvas(element, {
    pixelRatio,
    backgroundColor,
    skipFonts: true,
  });
  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Exports any DOM element to a perfectly scaled, professional PDF document.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  options: ExportPdfOptions
): Promise<void> {
  const dataUrl = await captureElementToPng(element, {
    pixelRatio: options.pixelRatio || 2.5,
    backgroundColor: options.backgroundColor || '#ffffff',
  });

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load captured image into memory'));
  });

  const orientation =
    options.orientation === 'landscape' || options.orientation === 'l' ? 'l' : 'p';
  const format = options.format || 'a4';

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = options.marginMm !== undefined ? options.marginMm : 6;

  const maxW = pageWidth - margin * 2;
  const maxH = pageHeight - margin * 2;

  // Proportional aspect ratio fit to ensure 0% cutoff and 100% visibility
  const ratioW = maxW / img.naturalWidth;
  const ratioH = maxH / img.naturalHeight;
  const scale = options.customScale ? Math.min(ratioW, ratioH) * options.customScale : Math.min(ratioW, ratioH);

  const finalW = img.naturalWidth * scale;
  const finalH = img.naturalHeight * scale;

  // Center horizontally
  const x = (pageWidth - finalW) / 2;
  // If the document takes up less than 65% of page height, position near top (margin + 4mm) for clean document look; otherwise center vertically
  const y = finalH < maxH * 0.65 ? margin + 4 : (pageHeight - finalH) / 2;

  pdf.addImage(dataUrl, 'PNG', x, y, finalW, finalH, undefined, 'FAST');

  const filename = options.filename.endsWith('.pdf') ? options.filename : `${options.filename}.pdf`;
  pdf.save(filename);
}

/**
 * Downloads element directly as a high-resolution PNG image
 */
export async function exportElementToImage(
  element: HTMLElement,
  filename: string,
  options?: { pixelRatio?: number; backgroundColor?: string }
): Promise<void> {
  const dataUrl = await captureElementToPng(element, options);
  const link = document.createElement('a');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
