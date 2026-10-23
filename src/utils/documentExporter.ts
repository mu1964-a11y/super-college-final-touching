import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface ExportPdfOptions {
  filename?: string;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  pixelRatio?: number;
  backgroundColor?: string;
  marginMm?: number;
}

export interface ExportImageOptions {
  pixelRatio?: number;
  backgroundColor?: string;
}

export async function exportElementToPdf(
  element: HTMLElement | null,
  options: ExportPdfOptions = {}
): Promise<void> {
  if (!element) throw new Error('Target element not found for PDF export');

  const {
    filename = 'Document',
    format = 'a4',
    orientation = 'portrait',
    pixelRatio = 2,
    backgroundColor = '#ffffff',
    marginMm = 6,
  } = options;

  const canvas = await html2canvas(element, {
    scale: pixelRatio,
    useCORS: true,
    allowTaint: true,
    backgroundColor,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usableWidth = pageWidth - marginMm * 2;
  const usableHeight = pageHeight - marginMm * 2;

  const imgWidth = usableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const finalHeight = imgHeight > usableHeight ? usableHeight : imgHeight;
  const finalWidth = imgHeight > usableHeight ? (canvas.width * finalHeight) / canvas.height : imgWidth;
  const xOffset = marginMm + (usableWidth - finalWidth) / 2;

  pdf.addImage(imgData, 'PNG', xOffset, marginMm, finalWidth, finalHeight);
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(safeName);
}

export async function exportElementToImage(
  element: HTMLElement | null,
  filename: string = 'Document.png',
  options: ExportImageOptions = {}
): Promise<void> {
  if (!element) throw new Error('Target element not found for Image export');

  const { pixelRatio = 2, backgroundColor = '#ffffff' } = options;
  const canvas = await html2canvas(element, {
    scale: pixelRatio,
    useCORS: true,
    allowTaint: true,
    backgroundColor,
    logging: false,
  });

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
