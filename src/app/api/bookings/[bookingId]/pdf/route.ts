import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { PDFDocument, PDFTextField, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { resolveCarRequestTemplate } from '@/lib/pdf/car-request-pdf-layout';
import {
  drawSignatureInFieldAndRemoveWidget,
  ensureSignatureFieldsHaveNormalAppearance,
} from '@/lib/pdf/signature-field-draw';
import {
  formatBangkokDateTime,
  formatBangkokThaiBuddhistDateLong,
  getBangkokPdfDateFields,
} from '@/lib/dateTime';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await context.params;
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'Executive') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        requester: true,
        adminApprover: true,
        executiveConfirmer: true,
        vehicle: true,
        driver: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'CONFIRMED') {
      return NextResponse.json({ error: 'Booking must be confirmed to generate PDF' }, { status: 400 });
    }

    const templatePath = join(process.cwd(), 'public', 'templates', 'booking-approval-template.pdf');
    let pdfDoc: PDFDocument;
    
    if (existsSync(templatePath)) {
      const templateBytes = await readFile(templatePath);
      pdfDoc = await PDFDocument.load(templateBytes);
    } else {
      pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]);
      const primaryColor = rgb(0, 0.47, 0.76);
      const secondaryColor = rgb(0, 0.47, 0.76);
      const textColor = rgb(0.2, 0.2, 0.2);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const { width, height } = page.getSize();
      page.drawText('OFM PROMPTGO', {
        x: 50,
        y: height - 50,
        size: 24,
        font: boldFont,
        color: primaryColor,
      });
      
      page.drawText('เอกสารอนุมัติการเดินทาง', {
        x: 50,
        y: height - 80,
        size: 18,
        font: boldFont,
        color: secondaryColor,
      });

      page.drawText(`เลขที่เอกสาร: ${booking.id}`, {
        x: 50,
        y: height - 110,
        size: 12,
        font: font,
        color: textColor,
      });

      page.drawText(`วันที่สร้าง: ${formatBangkokDateTime(booking.createdAt)}`, {
        x: 50,
        y: height - 130,
        size: 12,
        font: font,
        color: textColor,
      });

      page.drawLine({
        start: { x: 50, y: height - 150 },
        end: { x: width - 50, y: height - 150 },
        thickness: 1,
        color: primaryColor,
      });

    }

    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const textColor = rgb(0.2, 0.2, 0.2);

    page.drawText(formatBangkokDateTime(booking.createdAt), {
      x: 450,
      y: height - 100,
      size: 12,
      font: font,
      color: textColor,
    });

    const b = booking as typeof booking & { requestForSelf?: boolean | null; travelerName?: string | null; travelerPosition?: string | null };
    const displayName = b.requestForSelf !== false ? (b.requester.name || '-') : (b.travelerName || '-');
    const displayPosition = b.requestForSelf !== false ? (b.requester.position || '-') : (b.travelerPosition || '-');
    page.drawText(displayName, {
      x: 100,
      y: height - 200,
      size: 14,
      font: boldFont,
      color: textColor,
    });

    page.drawText(displayPosition, {
      x: 100,
      y: height - 220,
      size: 12,
      font: font,
      color: textColor,
    });

    const destination = booking.endLocation || '-';
    page.drawText(`ใช้รถยนต์ไป${destination}`, {
      x: 100,
      y: height - 250,
      size: 12,
      font: font,
      color: textColor,
    });

    const purpose = booking.purpose || '-';
    page.drawText(`เพื่อ${purpose}`, {
      x: 100,
      y: height - 270,
      size: 12,
      font: font,
      color: textColor,
    });

    const notesOffset = booking.additionalNotes ? 20 : 0;
    if (booking.additionalNotes) {
      page.drawText(`หมายเหตุ: ${booking.additionalNotes}`, {
        x: 100,
        y: height - 290,
        size: 11,
        font: font,
        color: textColor,
      });
    }

    const travelDate = booking.startTime ? formatBangkokDateTime(booking.startTime) : '-';
    page.drawText(`ในวันที่${travelDate}`, {
      x: 100,
      y: height - 290 - notesOffset,
      size: 12,
      font: font,
      color: textColor,
    });

    if (booking.vehicle) {
      page.drawText(`รถยนต์: ${booking.vehicle.brand} ${booking.vehicle.model} (${booking.vehicle.licensePlate})`, {
        x: 100,
        y: height - 320 - notesOffset,
        size: 12,
        font: font,
        color: textColor,
      });
    }

    if (booking.driver) {
      page.drawText(`คนขับ: ${booking.driver.name}`, {
        x: 100,
        y: height - 340 - notesOffset,
        size: 12,
        font: font,
        color: textColor,
      });
    }

    let mileageY = height - 360;
    if (booking.startMileage !== null) {
      page.drawText(`เลขไมล์ก่อนออกเดินทาง: ${booking.startMileage.toLocaleString()} กม.`, {
        x: 100,
        y: mileageY,
        size: 12,
        font: font,
        color: textColor,
      });
      mileageY -= 20;
    }
    
    if (booking.endMileage !== null) {
      page.drawText(`เลขไมล์หลังเดินทาง: ${booking.endMileage.toLocaleString()} กม.`, {
        x: 100,
        y: mileageY,
        size: 12,
        font: font,
        color: textColor,
      });
      mileageY -= 20;
      
      if (booking.startMileage !== null) {
        const distanceTraveled = booking.endMileage - booking.startMileage;
        page.drawText(`ระยะทางที่ใช้ไป: ${distanceTraveled.toLocaleString()} กม.`, {
          x: 100,
          y: mileageY,
          size: 12,
          font: boldFont,
          color: textColor,
        });
        mileageY -= 20;
      }
    }

    const approvalY = mileageY - 20;
    if (booking.adminApprover) {
      page.drawText(`อนุมัติโดย: ${booking.adminApprover.name}`, {
        x: 100,
        y: approvalY,
        size: 12,
        font: font,
        color: textColor,
      });
    }

    if (booking.executiveConfirmer) {
      page.drawText(`ยืนยันโดย: ${booking.executiveConfirmer.name}`, {
        x: 100,
        y: approvalY - 20,
        size: 12,
        font: font,
        color: textColor,
      });
    }

    if (booking.executiveConfirmer?.signatureImageUrl) {
      try {
        let signatureBytes: Buffer;
        if (booking.executiveConfirmer.signatureImageUrl.startsWith('http://') || booking.executiveConfirmer.signatureImageUrl.startsWith('https://')) {
          const response = await fetch(booking.executiveConfirmer.signatureImageUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch signature: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          signatureBytes = Buffer.from(arrayBuffer);
        } else {
          const signaturePath = join(process.cwd(), 'public', booking.executiveConfirmer.signatureImageUrl);
          if (existsSync(signaturePath)) {
            signatureBytes = await readFile(signaturePath);
          } else {
            throw new Error('Signature file not found');
          }
        }
        
        let signatureImage;
        try {
          signatureImage = await pdfDoc.embedPng(signatureBytes);
        } catch {
          signatureImage = await pdfDoc.embedJpg(signatureBytes);
        }
        
        /* Fallback PDF: signature area x 256–420, bottom y 420, top cap y 382 */
        const signatureAreaX1 = 256;
        const signatureAreaX2 = 420;
        const signatureAreaWidth = signatureAreaX2 - signatureAreaX1;
        const signatureY = 420;
        const maxY = 382;
        const maxHeight = signatureY - maxY;
        const imageWidth = signatureImage.width;
        const imageHeight = signatureImage.height;
        const aspectRatio = imageWidth / imageHeight;
        let displayWidth = signatureAreaWidth;
        let displayHeight = signatureAreaWidth / aspectRatio;
        if (displayHeight > maxHeight) {
          displayHeight = maxHeight;
          displayWidth = maxHeight * aspectRatio;
        }
        if (displayWidth > signatureAreaWidth) {
          displayWidth = signatureAreaWidth;
          displayHeight = signatureAreaWidth / aspectRatio;
          if (displayHeight > maxHeight) {
            displayHeight = maxHeight;
            displayWidth = maxHeight * aspectRatio;
          }
        }
        const centerX = (signatureAreaX1 + signatureAreaX2) / 2;
        const signatureX = centerX - (displayWidth / 2);
        page.drawImage(signatureImage, {
          x: signatureX,
          y: signatureY,
          width: displayWidth,
          height: displayHeight,
        });
        const signatureY2 = height - 570;
        page.drawImage(signatureImage, {
          x: signatureX,
          y: signatureY2,
          width: displayWidth,
          height: displayHeight,
        });
      } catch (error) {
        console.error('Error adding signature image:', error);
      }
    }

    const pdfBytes = await pdfDoc.save();

    const pdfsDir = join(process.cwd(), 'public', 'pdfs');
    if (!existsSync(pdfsDir)) {
      await mkdir(pdfsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `booking_${bookingId}_${timestamp}.pdf`;
    const filepath = join(pdfsDir, filename);
    
    await writeFile(filepath, pdfBytes);

    const pdfUrl = `/pdfs/${filename}`;
    await prisma.booking.update({
      where: { id: bookingId },
      data: { generatedFormUrl: pdfUrl },
    });

    return NextResponse.json({ 
      success: true,
      url: pdfUrl,
      filename: filename 
    }, { status: 200 });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** GET: สร้าง PDF จาก template (AcroForm fields) */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        requester: true,
        vehicle: true,
        driver: true,
        adminApprover: { select: { name: true, position: true, signatureImageUrl: true } },
        executiveConfirmer: true,
        expresswayCertifier: { select: { id: true, name: true, position: true, signatureImageUrl: true } },
      },
    });
    
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    type BookingWithConfirmedAtType = typeof booking & { executiveConfirmedAt: Date | null };
    const bookingWithConfirmedAt = booking as BookingWithConfirmedAtType;

    const resolved = resolveCarRequestTemplate(booking.expresswayOption ?? null);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 500 });
    }
    const { templatePath } = resolved;

    const fontPath = join(process.cwd(), 'public/fonts/THSarabunNew.ttf');

    if (!existsSync(fontPath)) {
      return NextResponse.json({ error: 'Font file missing' }, { status: 500 });
    }

    const pdfDoc = await PDFDocument.load(readFileSync(templatePath));
    pdfDoc.registerFontkit(fontkit);
    const thaiFont = await pdfDoc.embedFont(readFileSync(fontPath));
    const form = pdfDoc.getForm();

    /* pdf-lib TextField from template: font size is fixed in the PDF; change the template to resize. */
    const fill = (field: string, text: string) => {
      try {
        const matches = form.getFields().filter((f) => f.getName() === field);
        let filled = 0;
        for (const m of matches) {
          if (m instanceof PDFTextField) {
            m.setText(text);
            m.updateAppearances(thaiFont);
            filled += 1;
          }
        }
        if (filled === 0) {
          console.warn(`Field ${field} missing`);
        }
      } catch (e) {
        console.warn(`Field ${field} missing:`, e);
      }
    };

    const requestDateFields = getBangkokPdfDateFields(booking.createdAt);
    const startDateFields = getBangkokPdfDateFields(booking.startTime ?? new Date());
    const endDateFields = getBangkokPdfDateFields(booking.endTime ?? booking.startTime ?? new Date());

    fill('req_day', requestDateFields?.day ?? '-');
    fill('req_month', requestDateFields?.month ?? '-');
    fill('req_year', requestDateFields?.buddhistYear ?? '-');
    fill('req_date_long', requestDateFields ? `วันที่ ${requestDateFields.dateLong}` : '-');

    const requesterAccountName = booking.requester?.name || '-';
    const requesterAccountPosition = booking.requester?.position || '-';
    fill('requester_name', requesterAccountName);
    fill('req_name_1', requesterAccountName);
    fill('req_name_2', requesterAccountName);
    fill('requester_position', requesterAccountPosition);

    fill('destination', booking.endLocation || '-');
    fill('purpose', booking.purpose || '-');
    fill('passenger_count', booking.passengerCount?.toString() || '-');

    fill('start_day', startDateFields?.day ?? '-');
    fill('start_month', startDateFields?.month ?? '-');
    fill('start_year', startDateFields?.buddhistYear ?? '-');
    fill('start_time', startDateFields?.time ?? '-');
    fill('start_date_long', startDateFields?.dateLong ?? '-');

    fill('end_day', endDateFields?.day ?? '-');
    fill('end_month', endDateFields?.month ?? '-');
    fill('end_year', endDateFields?.buddhistYear ?? '-');
    fill('end_time', endDateFields?.time ?? '-');
    fill('end_date_long', endDateFields?.dateLong ?? '-');

    fill('admin_approver_name', booking.adminApprover?.name?.trim() || '-');
    fill('admin_approver_position', booking.adminApprover?.position?.trim() || '-');
    if (booking.adminApprovedAt) {
      fill('admin_approve_date_long', formatBangkokThaiBuddhistDateLong(booking.adminApprovedAt));
    } else {
      fill('admin_approve_date_long', '-');
    }

    if (booking.expresswayOption === 'EXPRESSWAY') {
      fill('expressway_certifier_name', booking.expresswayCertifierName || booking.expresswayCertifier?.name || '-');
      fill(
        'expressway_certifier_position',
        booking.expresswayCertifierPosition || booking.expresswayCertifier?.position || '-'
      );
      if (booking.expresswayCertifiedAt) {
        fill('expressway_certified_date_long', formatBangkokThaiBuddhistDateLong(booking.expresswayCertifiedAt));
      } else {
        fill('expressway_certified_date_long', '');
      }
    } else {
      fill('expressway_certifier_name', '');
      fill('expressway_certifier_position', '');
      fill('expressway_certified_date_long', '');
    }

    if (booking.vehicle) {
        fill('vehicle_brand', booking.vehicle.brand?.trim() || '-');
        fill('vehicle_plate', booking.vehicle.licensePlate || '-');
    }
    if (booking.driver) fill('driver_name', booking.driver.name || '-');

    if (booking.startMileage !== null) {
        fill('mileage_start', booking.startMileage.toLocaleString('th-TH'));
    }
    if (booking.endMileage !== null) {
        fill('mileage_end', booking.endMileage.toLocaleString('th-TH'));
        if (booking.startMileage !== null) {
            const distanceTraveled = booking.endMileage - booking.startMileage;
            fill('distance_total', distanceTraveled.toLocaleString('th-TH'));
        }
    }

    const requesterSigUrl = booking.requesterSignatureUrl ?? booking.requester.signatureImageUrl;
    fill('requester_sign_name', requesterAccountName);
    await drawSignatureInFieldAndRemoveWidget(pdfDoc, form, 'requester_signature', requesterSigUrl);

    await drawSignatureInFieldAndRemoveWidget(
      pdfDoc,
      form,
      'admin_signature',
      booking.adminApprover?.signatureImageUrl
    );

    if (booking.expresswayOption === 'EXPRESSWAY') {
      const certSigUrl =
        booking.expresswayCertifierSignatureUrl ?? booking.expresswayCertifier?.signatureImageUrl ?? null;
      await drawSignatureInFieldAndRemoveWidget(
        pdfDoc,
        form,
        'expressway_certifier_signature',
        certSigUrl
      );
    }

    // Executive signature should show only after executive confirms.
    // If not confirmed yet, keep signature/date blank.
    const confirmedAt = bookingWithConfirmedAt.executiveConfirmedAt;
    const executiveSigUrl = confirmedAt ? booking.executiveConfirmer?.signatureImageUrl : null;
    await drawSignatureInFieldAndRemoveWidget(
      pdfDoc,
      form,
      'executive_signature',
      executiveSigUrl
    );

    if (confirmedAt) {
      fill('approve_date_full', formatBangkokThaiBuddhistDateLong(confirmedAt));
    } else {
      fill('approve_date_full', '');
    }

    const fixedSigWidgets = ensureSignatureFieldsHaveNormalAppearance(pdfDoc, form);
    if (fixedSigWidgets > 0) {
      console.warn(`[PDF] WARN: fixed ${fixedSigWidgets} signature widget appearance(s) before flatten`);
    }
    try {
      form.flatten();
    } catch (e) {
      console.warn('[PDF] WARN: flatten failed; returning non-flattened PDF as fallback.', e);
    }
    const pdfBytes = await pdfDoc.save();

    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="booking-${booking.id}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF from template:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}