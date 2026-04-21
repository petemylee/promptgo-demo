import type { PDFDocument, PDFForm, PDFImage, PDFPage, PDFWidgetAnnotation } from 'pdf-lib';
import { PDFSignature } from 'pdf-lib';
import { readFileSync } from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';

export type PdfRect = { x: number; y: number; width: number; height: number };

function findPageForWidget(pdfDoc: PDFDocument, widget: PDFWidgetAnnotation): PDFPage {
  const pRef = widget.P();
  const pages = pdfDoc.getPages();
  if (!pRef) return pages[0];
  const target = pRef.toString();
  for (const page of pages) {
    if (page.ref.toString() === target) return page;
  }
  return pages[0];
}

/** First widget rectangle for a signature field, or null if missing / invalid. */
export function getSignatureFieldPlacement(
  pdfDoc: PDFDocument,
  form: PDFForm,
  fieldName: string
): { page: PDFPage; rect: PdfRect } | null {
  const field = form.getFieldMaybe(fieldName);
  if (!(field instanceof PDFSignature)) return null;
  const widgets = field.acroField.getWidgets();
  const w = widgets[0];
  if (!w) return null;
  const rect = w.getRectangle();
  if (!rect.width || !rect.height) return null;
  return { page: findPageForWidget(pdfDoc, w), rect };
}

export function drawFittedImageInRect(page: PDFPage, image: PDFImage, rect: PdfRect): void {
  const aspect = image.width / image.height;
  let dw = rect.width;
  let dh = dw / aspect;
  if (dh > rect.height) {
    dh = rect.height;
    dw = dh * aspect;
  }
  const x = rect.x + (rect.width - dw) / 2;
  const y = rect.y + (rect.height - dh) / 2;
  page.drawImage(image, { x, y, width: dw, height: dh });
}

export async function embedSignatureImageFromUrl(
  pdfDoc: PDFDocument,
  url: string | null | undefined
): Promise<PDFImage | null> {
  const u = url?.trim();
  if (!u) return null;
  let sigBytes: Buffer;
  if (u.startsWith('http://') || u.startsWith('https://')) {
    const response = await fetch(u);
    if (!response.ok) throw new Error(`Failed to fetch signature: ${response.statusText}`);
    sigBytes = Buffer.from(await response.arrayBuffer());
  } else {
    const sigPath = join(process.cwd(), 'public', u);
    if (!existsSync(sigPath)) throw new Error('Signature file not found');
    sigBytes = readFileSync(sigPath);
  }
  try {
    return await pdfDoc.embedPng(sigBytes);
  } catch {
    return await pdfDoc.embedJpg(sigBytes);
  }
}

/**
 * Draw signature image into a named AcroForm signature field (widget bounds), then remove the field
 * so the widget outline does not remain after flatten.
 */
export async function drawSignatureInFieldAndRemoveWidget(
  pdfDoc: PDFDocument,
  form: PDFForm,
  fieldName: string,
  imageUrl: string | null | undefined
): Promise<boolean> {
  const placement = getSignatureFieldPlacement(pdfDoc, form, fieldName);
  if (!placement) return false;
  const signatureField = form.getFieldMaybe(fieldName);
  if (!(signatureField instanceof PDFSignature)) return false;
  try {
    // If we have an image, draw it. If not, still remove the field to prevent
    // pdf-lib flatten from crashing on signature widgets without /AP /N.
    if (imageUrl) {
      const embedded = await embedSignatureImageFromUrl(pdfDoc, imageUrl);
      if (embedded) {
        drawFittedImageInRect(placement.page, embedded, placement.rect);
      }
    }
    // Some templates create signature widgets without a normal appearance stream (AP /N).
    // pdf-lib's flatten/removeField expects a normal appearance to exist, otherwise it throws.
    // We attach a minimal empty appearance stream to satisfy that invariant before removal.
    try {
      const widget = signatureField.acroField.getWidgets()[0];
      if (widget) {
        // Throws when /AP or /N is missing
        widget.getNormalAppearance();
      }
    } catch {
      const widget = signatureField.acroField.getWidgets()[0];
      if (widget) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const emptyRef = (signatureField as any).createAppearanceStream(widget, [], undefined);
        widget.setNormalAppearance(emptyRef);
      }
    }

    form.removeField(signatureField);
    return true;
  } catch (e) {
    console.error(`Signature draw/remove ${fieldName}:`, e);
    return false;
  }
}
