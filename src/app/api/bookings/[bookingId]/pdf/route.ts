import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { PDFDocument, PDFTextField, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import {
  CAR_REQUEST_PDF_LAYOUT,
  resolveCarRequestTemplate,
} from '@/lib/pdf/car-request-pdf-layout';
import { drawSignatureInFieldAndRemoveWidget } from '@/lib/pdf/signature-field-draw';

const thaiMonths = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

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
    // Fetch booking details
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

    // Load PDF template
    const templatePath = join(process.cwd(), 'public', 'templates', 'booking-approval-template.pdf');
    let pdfDoc: PDFDocument;
    
    if (existsSync(templatePath)) {
      // Use existing template
      const templateBytes = await readFile(templatePath);
      pdfDoc = await PDFDocument.load(templateBytes);
    } else {
      // Create new PDF if template doesn't exist (fallback)
      pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
      
      // Set up colors
      const primaryColor = rgb(0, 0.47, 0.76); // #004c80
      const secondaryColor = rgb(0, 0.47, 0.76); // #004c80
      const textColor = rgb(0.2, 0.2, 0.2);
      
      // Load fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const { width, height } = page.getSize();
      
      // Header
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

      // Booking ID and Date
      page.drawText(`เลขที่เอกสาร: ${booking.id}`, {
        x: 50,
        y: height - 110,
        size: 12,
        font: font,
        color: textColor,
      });

      page.drawText(`วันที่สร้าง: ${new Date(booking.createdAt).toLocaleDateString('th-TH')}`, {
        x: 50,
        y: height - 130,
        size: 12,
        font: font,
        color: textColor,
      });

      // Line separator
      page.drawLine({
        start: { x: 50, y: height - 150 },
        end: { x: width - 50, y: height - 150 },
        thickness: 1,
        color: primaryColor,
      });

      // Template fallback content would go here
    }

    // Get the first page for form filling
    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { height } = page.getSize();

    // Load fonts for form filling
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const textColor = rgb(0.2, 0.2, 0.2);

    // Format dates
    const formatDate = (dateString: string | null) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // Fill form fields based on template structure
    // Adjust these coordinates based on your actual template
    
    // วันที่ (Date) - Top right area
    page.drawText(new Date(booking.createdAt).toLocaleDateString('th-TH'), {
      x: 450,
      y: height - 100,
      size: 12,
      font: font,
      color: textColor,
    });

    // ชื่อผู้เดินทาง (Name) - ใช้ traveler เมื่อขอใช้สำหรับบุคคลอื่น
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

    // ตำแหน่ง (Position)
    page.drawText(displayPosition, {
      x: 100,
      y: height - 220,
      size: 12,
      font: font,
      color: textColor,
    });

    // ใช้รถยนต์ไป... (สถานที่ที่จะไป)
    const destination = booking.endLocation || '-';
    page.drawText(`ใช้รถยนต์ไป${destination}`, {
      x: 100,
      y: height - 250,
      size: 12,
      font: font,
      color: textColor,
    });

    // เพื่อ... (วัตถุประสงค์)
    const purpose = booking.purpose || '-';
    page.drawText(`เพื่อ${purpose}`, {
      x: 100,
      y: height - 270,
      size: 12,
      font: font,
      color: textColor,
    });

    // หมายเหตุเพิ่มเติม (ถ้ามี) และเลื่อนบรรทัดถัดไป
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

    // ในวันที่... (วันที่เดินทาง)
    const travelDate = booking.startTime ? formatDate(booking.startTime.toISOString()) : '-';
    page.drawText(`ในวันที่${travelDate}`, {
      x: 100,
      y: height - 290 - notesOffset,
      size: 12,
      font: font,
      color: textColor,
    });

    // Additional information
    // ข้อมูลรถ
    if (booking.vehicle) {
      page.drawText(`รถยนต์: ${booking.vehicle.brand} ${booking.vehicle.model} (${booking.vehicle.licensePlate})`, {
        x: 100,
        y: height - 320 - notesOffset,
        size: 12,
        font: font,
        color: textColor,
      });
    }

    // ข้อมูลคนขับ
    if (booking.driver) {
      page.drawText(`คนขับ: ${booking.driver.name}`, {
        x: 100,
        y: height - 340 - notesOffset,
        size: 12,
        font: font,
        color: textColor,
      });
    }

    // ข้อมูลเลขไมล์
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
      
      // คำนวณระยะทางที่ใช้ไป
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

    // ข้อมูลการอนุมัติ
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

    // Add signature image if available
    if (booking.executiveConfirmer?.signatureImageUrl) {
      try {
        // Check if URL is from Supabase (starts with http/https) or local path
        let signatureBytes: Buffer;
        if (booking.executiveConfirmer.signatureImageUrl.startsWith('http://') || booking.executiveConfirmer.signatureImageUrl.startsWith('https://')) {
          // Fetch from Supabase URL
          const response = await fetch(booking.executiveConfirmer.signatureImageUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch signature: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          signatureBytes = Buffer.from(arrayBuffer);
        } else {
          // Legacy local file path
          const signaturePath = join(process.cwd(), 'public', booking.executiveConfirmer.signatureImageUrl);
          if (existsSync(signaturePath)) {
            signatureBytes = await readFile(signaturePath);
          } else {
            throw new Error('Signature file not found');
          }
        }
        
        // ลอง embed เป็น PNG ก่อน ถ้าไม่ได้ลอง JPG
        let signatureImage;
        try {
          signatureImage = await pdfDoc.embedPng(signatureBytes);
        } catch {
          signatureImage = await pdfDoc.embedJpg(signatureBytes);
        }
        
        // คำนวณตำแหน่งและขนาดลายเซ็น
        // พื้นที่ที่ต้องการ: x: 256 ถึง x: 420 (ความกว้าง = 164)
        // y: 420 (ตำแหน่งด้านล่างของรูป), ไม่เกิน y: 382 (ด้านบน)
        const signatureAreaX1 = 256;
        const signatureAreaX2 = 420;
        const signatureAreaWidth = signatureAreaX2 - signatureAreaX1; // 164
        const signatureY = 420; // ตำแหน่งด้านล่าง
        const maxY = 382; // ตำแหน่งสูงสุดที่อนุญาต
        const maxHeight = signatureY - maxY; // ความสูงสูงสุด = 38
        
        // ดึงขนาดภาพจริง
        const imageWidth = signatureImage.width;
        const imageHeight = signatureImage.height;
        const aspectRatio = imageWidth / imageHeight;
        
        // คำนวณขนาดใหม่ให้พอดีในพื้นที่ โดยคงสัดส่วน
        let displayWidth = signatureAreaWidth;
        let displayHeight = signatureAreaWidth / aspectRatio;
        
        // จำกัดความสูงไม่ให้เกิน maxHeight (ไม่เกิน y: 382)
        if (displayHeight > maxHeight) {
          displayHeight = maxHeight;
          displayWidth = maxHeight * aspectRatio;
        }
        
        // ถ้าความกว้างเกินพื้นที่ ให้ปรับใหม่
        if (displayWidth > signatureAreaWidth) {
          displayWidth = signatureAreaWidth;
          displayHeight = signatureAreaWidth / aspectRatio;
          // ตรวจสอบอีกครั้งว่าความสูงไม่เกิน maxHeight
          if (displayHeight > maxHeight) {
            displayHeight = maxHeight;
            displayWidth = maxHeight * aspectRatio;
          }
        }
        
        // คำนวณตำแหน่ง x ให้อยู่กึ่งกลาง
        const centerX = (signatureAreaX1 + signatureAreaX2) / 2;
        const signatureX = centerX - (displayWidth / 2);
        
        // Add signature image กึ่งกลางในพื้นที่ที่กำหนด (จุดแรก)
        page.drawImage(signatureImage, {
          x: signatureX,
          y: signatureY,
          width: displayWidth,
          height: displayHeight,
        });
        
        // Add signature image ที่จุดที่สอง (x เดิม, y: 570 นับจากขอบล่าง)
        // y: 570 นับจากขอบล่าง = height - 570 ในระบบพิกัด PDF
        const signatureY2 = height - 570; // ตำแหน่งด้านล่างของรูปที่สอง (นับจากขอบล่าง 570)
        page.drawImage(signatureImage, {
          x: signatureX,
          y: signatureY2,
          width: displayWidth,
          height: displayHeight,
        });
      } catch (error) {
        console.error('Error adding signature image:', error);
        // Continue without signature if there's an error
      }
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    // Create PDFs directory if it doesn't exist
    const pdfsDir = join(process.cwd(), 'public', 'pdfs');
    if (!existsSync(pdfsDir)) {
      await mkdir(pdfsDir, { recursive: true });
    }

    // Generate filename and save
    const timestamp = Date.now();
    const filename = `booking_${bookingId}_${timestamp}.pdf`;
    const filepath = join(pdfsDir, filename);
    
    await writeFile(filepath, pdfBytes);

    // Update booking with PDF URL
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

// GET: สร้าง PDF จาก template ที่มี form fields (ตามที่ Gemini แนะนำ)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. ดึงข้อมูล Booking (รวม executiveConfirmedAt)
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        requester: true,
        vehicle: true,
        driver: true,
        adminApprover: { select: { name: true, position: true, signatureImageUrl: true } },
        executiveConfirmer: true, // ผู้บริหารที่จะเซ็นอนุมัติ
      },
      // Prisma include จะดึงทุก field ของ Booking model รวมถึง executiveConfirmedAt
    });
    
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    // Debug: ตรวจสอบว่า executiveConfirmedAt ถูกดึงมาหรือไม่
    console.log('[PDF] Booking ID:', bookingId);
    console.log('[PDF] Booking status:', booking.status);
    type BookingWithConfirmedAtType = typeof booking & { executiveConfirmedAt: Date | null };
    const bookingWithConfirmedAt = booking as BookingWithConfirmedAtType;
    console.log('[PDF] executiveConfirmedAt from booking:', bookingWithConfirmedAt?.executiveConfirmedAt);

    // 2. เตรียมไฟล์ — เลือกเทมเพลตจาก expresswayOption
    const resolved = resolveCarRequestTemplate(booking.expresswayOption ?? null);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 500 });
    }
    const { templatePath, layoutKey } = resolved;
    const sigLayout = CAR_REQUEST_PDF_LAYOUT[layoutKey];

    const fontPath = join(process.cwd(), 'public/fonts/THSarabunNew.ttf');

    if (!existsSync(fontPath)) {
      return NextResponse.json({ error: 'Font file missing' }, { status: 500 });
    }

    // 3. โหลด PDF
    const pdfDoc = await PDFDocument.load(readFileSync(templatePath));
    pdfDoc.registerFontkit(fontkit);
    const thaiFont = await pdfDoc.embedFont(readFileSync(fontPath));
    const form = pdfDoc.getForm();

    // Helper กรอกข้อมูล
    // หมายเหตุ: pdf-lib v1.17.1 สำหรับ TextField ที่โหลดมาจาก template PDF
    // ไม่รองรับการเปลี่ยน fontSize โดยตรง ต้องแก้ไขที่ template PDF เอง
    // หรือใช้วิธีสร้าง form field ใหม่ แต่จะต้องระบุตำแหน่ง
    const fill = (field: string, text: string) => {
      try {
        const matches = form.getFields().filter((f) => f.getName() === field);
        let filled = 0;
        for (const m of matches) {
          if (m instanceof PDFTextField) {
            m.setText(text);
            // อัปเดต appearance ด้วยฟอนต์ภาษาไทย (ขนาดฟอนต์อิงจาก template)
            m.updateAppearances(thaiFont);
            filled += 1;
          }
        }
        if (filled === 0) {
          // Keep warning for debugging field-name mismatches.
          console.warn(`Field ${field} missing`);
        }
      } catch (e) {
        console.warn(`Field ${field} missing:`, e);
      }
    };

    // 4. แปลงข้อมูลวันที่
    // วันที่ในหัวฟอร์ม (req_*): วันที่ยื่นคำขอ — แยกจากวันเริ่มเดินทาง
    const requestDate = new Date(booking.createdAt);
    const startDate = booking.startTime ? new Date(booking.startTime) : new Date();
    const endDate = booking.endTime ? new Date(booking.endTime) : startDate;

    // 5. เริ่มกรอกข้อมูล (Mapping)
    // หมายเหตุ: ขนาดฟอนต์ถูกกำหนดไว้ใน template PDF แล้ว
    // ถ้าต้องการเปลี่ยนขนาด ให้แก้ไขที่ template PDF เอง
    // --- ส่วนหัว --- วันที่คำขอ (createdAt)
    fill('req_day', requestDate.getDate().toString());
    fill('req_month', thaiMonths[requestDate.getMonth()]);
    fill('req_year', (requestDate.getFullYear() + 543).toString());
    fill(
      'req_date_long',
      `${requestDate.getDate()} ${thaiMonths[requestDate.getMonth()]} ${requestDate.getFullYear() + 543}`
    );

    // --- ผู้ขอ (เจ้าของบัญชีผู้สร้างคำขอ) ---
    const requesterAccountName = booking.requester?.name || '-';
    const requesterAccountPosition = booking.requester?.position || '-';
    fill('requester_name', requesterAccountName);
    fill('requester_position', requesterAccountPosition);

    // --- ผู้เดินทาง (ถ้าต้องการแยก field เพิ่มในอนาคต) ---
    // หมายเหตุ: ระบบรองรับขอใช้แทนบุคคลอื่นด้วย (travelerName/travelerPosition)
    // แต่ตาม requirement ล่าสุด ช่อง requester_* ต้องเป็นชื่อเจ้าของ account เสมอ
    
    // --- รายละเอียด ---
    fill('destination', booking.endLocation || '-');
    fill('purpose', booking.purpose || '-');
    fill('passenger_count', booking.passengerCount?.toString() || '-');

    // --- วันไป ---
    fill('start_day', startDate.getDate().toString());
    fill('start_month', thaiMonths[startDate.getMonth()]);
    fill('start_year', (startDate.getFullYear() + 543).toString());
    fill('start_time', startDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
    fill(
      'start_date_long',
      `${startDate.getDate()} ${thaiMonths[startDate.getMonth()]} ${startDate.getFullYear() + 543}`
    );

    // --- วันกลับ ---
    fill('end_day', endDate.getDate().toString());
    fill('end_month', thaiMonths[endDate.getMonth()]);
    fill('end_year', (endDate.getFullYear() + 543).toString());
    fill('end_time', endDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
    fill(
      'end_date_long',
      `${endDate.getDate()} ${thaiMonths[endDate.getMonth()]} ${endDate.getFullYear() + 543}`
    );

    // --- ผู้อนุมัติและจัดสรรเบื้องต้น (Admin / Executive) ---
    fill('admin_approver_name', booking.adminApprover?.name?.trim() || '-');
    fill('admin_approver_position', booking.adminApprover?.position?.trim() || '-');
    if (booking.adminApprovedAt) {
      const adminApprDate = new Date(booking.adminApprovedAt);
      fill(
        'admin_approve_date_long',
        `${adminApprDate.getDate()} ${thaiMonths[adminApprDate.getMonth()]} ${adminApprDate.getFullYear() + 543}`
      );
    } else {
      fill('admin_approve_date_long', '-');
    }

    // --- รถ/คนขับ ---
    if (booking.vehicle) {
        fill('vehicle_brand', booking.vehicle.brand?.trim() || '-');
        fill('vehicle_plate', booking.vehicle.licensePlate || '-');
    }
    if (booking.driver) fill('driver_name', booking.driver.name || '-');

    // --- เลขไมล์ ---
    if (booking.startMileage !== null) {
        fill('mileage_start', booking.startMileage.toLocaleString('th-TH'));
    }
    if (booking.endMileage !== null) {
        fill('mileage_end', booking.endMileage.toLocaleString('th-TH'));
        // คำนวณระยะทางที่ใช้ไป
        if (booking.startMileage !== null) {
            const distanceTraveled = booking.endMileage - booking.startMileage;
            fill('distance_total', distanceTraveled.toLocaleString('th-TH'));
        }
    }

    // 6. จัดการลายเซ็น (รูปภาพ)
    // ใช้ signature fields ใน template เป็นตัวกำหนดตำแหน่งทั้งหมด (ไม่ใช้พิกัด x/y ในโค้ด)
    const requesterSigUrl = booking.requesterSignatureUrl ?? booking.requester.signatureImageUrl;
    fill('requester_sign_name', requesterAccountName);
    await drawSignatureInFieldAndRemoveWidget(pdfDoc, form, 'requester_signature', requesterSigUrl);

    // ลายเซ็นแอดมิน / ผู้บริหาร — ถ้าเทมเพลตมี signature fields ชื่อ admin_signature / executive_signature จะใช้กรอบจาก PDF
    await drawSignatureInFieldAndRemoveWidget(
      pdfDoc,
      form,
      'admin_signature',
      booking.adminApprover?.signatureImageUrl
    );

    const executiveInPdfField = await drawSignatureInFieldAndRemoveWidget(
      pdfDoc,
      form,
      'executive_signature',
      booking.executiveConfirmer?.signatureImageUrl
    );
    
    // วันที่อนุมัติ (ใต้ลายเซ็นขวา) - ใช้วันที่ Executive ยืนยัน (executiveConfirmedAt)
    // เนื่องจาก booking ต้องเป็น CONFIRMED ก่อนถึงจะสร้าง PDF ได้ ดังนั้นควรจะมี executiveConfirmedAt อยู่แล้ว
    // ใช้ type assertion เพราะ Prisma type อาจจะยังไม่ sync
    const confirmedAt = bookingWithConfirmedAt.executiveConfirmedAt;
    console.log('[PDF] executiveConfirmedAt:', confirmedAt, 'Type:', typeof confirmedAt);
    console.log('[PDF] booking status:', booking.status);
    
    if (!confirmedAt) {
      console.warn('[PDF] WARNING: executiveConfirmedAt is null/undefined, using current date as fallback');
    }
    
    const approvalDate = confirmedAt
      ? new Date(confirmedAt)
      : new Date(); // Fallback เป็นวันที่ปัจจุบันถ้าไม่มี (ไม่ควรเกิดขึ้น)
    console.log('[PDF] approvalDate:', approvalDate.toISOString());
    fill(
      'approve_date_full',
      `${approvalDate.getDate()} ${thaiMonths[approvalDate.getMonth()]} ${approvalDate.getFullYear() + 543}`
    );

    // 7. จบงาน
    form.flatten(); // ลบช่องกรอกข้อมูลทิ้ง ให้เหลือแต่เนื้อหา
    const pdfBytes = await pdfDoc.save();

    // แปลง Uint8Array เป็น Buffer เพื่อให้ NextResponse รับได้
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