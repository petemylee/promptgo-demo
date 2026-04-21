/**
 * Generates placeholder car-request PDFs with AcroForm fields expected by
 * GET /api/bookings/[id]/pdf. Replace with official designs in production.
 *
 * Usage: node scripts/generate-car-request-pdf-templates.mjs
 */
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'public', 'templates');

const FIELD_NAMES = [
  'req_day',
  'req_month',
  'req_year',
  'req_date_long',
  'requester_name',
  'requester_position',
  'destination',
  'purpose',
  'passenger_count',
  'start_day',
  'start_month',
  'start_year',
  'start_time',
  'start_date_long',
  'end_day',
  'end_month',
  'end_year',
  'end_time',
  'end_date_long',
  'admin_approver_name',
  'admin_approver_position',
  'admin_approve_date_long',
  'vehicle_brand',
  'vehicle_plate',
  'driver_name',
  'mileage_start',
  'mileage_end',
  'distance_total',
  'requester_sign_name',
  'approve_date_full',
];

async function buildTemplate(title, filename) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const form = pdfDoc.getForm();

  page.drawText(title, { x: 50, y: 810, size: 12, font });

  const col1x = 45;
  const col2x = 305;
  const fieldW = 240;
  const fieldH = 14;
  const rowH = 20;
  const startY = 785;

  for (let i = 0; i < FIELD_NAMES.length; i++) {
    const name = FIELD_NAMES[i];
    const col = i % 2;
    const r = Math.floor(i / 2);
    const x = col === 0 ? col1x : col2x;
    const y = startY - r * rowH;

    page.drawText(name, { x, y: y + fieldH + 2, size: 6, font });
    const tf = form.createTextField(name);
    tf.addToPage(page, { x, y, width: fieldW, height: fieldH });
  }

  const bytes = await pdfDoc.save();
  writeFileSync(join(outDir, filename), bytes);
  console.log('Wrote', filename);
}

mkdirSync(outDir, { recursive: true });

await buildTemplate('Car request (NO expressway) — placeholder', 'car-request-template-no-expressway.pdf');
await buildTemplate('Car request (EXPRESSWAY) — placeholder', 'car-request-template-expressway.pdf');

// Legacy single template: same as no-expressway for bookings with null expresswayOption
await buildTemplate('Car request (legacy) — placeholder', 'car-request-template.pdf');

console.log('Done. Place official PDFs in public/templates when ready.');
