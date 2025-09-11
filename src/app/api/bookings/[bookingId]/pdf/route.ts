import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const prisma = new PrismaClient();

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

    // ชื่อ (Name) - Main content area
    page.drawText(booking.requester.name || '-', {
      x: 100,
      y: height - 200,
      size: 14,
      font: boldFont,
      color: textColor,
    });

    // ตำแหน่ง (Position)
    page.drawText(booking.requester.position || '-', {
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

    // ในวันที่... (วันที่เดินทาง)
    const travelDate = booking.startTime ? formatDate(booking.startTime.toISOString()) : '-';
    page.drawText(`ในวันที่${travelDate}`, {
      x: 100,
      y: height - 290,
      size: 12,
      font: font,
      color: textColor,
    });

    // Additional information
    // ข้อมูลรถ
    if (booking.vehicle) {
      page.drawText(`รถยนต์: ${booking.vehicle.brand} ${booking.vehicle.model} (${booking.vehicle.licensePlate})`, {
        x: 100,
        y: height - 320,
        size: 12,
        font: font,
        color: textColor,
      });
    }

    // ข้อมูลคนขับ
    if (booking.driver) {
      page.drawText(`คนขับ: ${booking.driver.name}`, {
        x: 100,
        y: height - 340,
        size: 12,
        font: font,
        color: textColor,
      });
    }

    // ข้อมูลการอนุมัติ
    if (booking.adminApprover) {
      page.drawText(`อนุมัติโดย: ${booking.adminApprover.name}`, {
        x: 100,
        y: height - 380,
        size: 12,
        font: font,
        color: textColor,
      });
    }

    if (booking.executiveConfirmer) {
      page.drawText(`ยืนยันโดย: ${booking.executiveConfirmer.name}`, {
        x: 100,
        y: height - 400,
        size: 12,
        font: font,
        color: textColor,
      });
    }

    // Add signature image if available
    if (booking.executiveConfirmer?.signatureImageUrl) {
      try {
        const signaturePath = join(process.cwd(), 'public', booking.executiveConfirmer.signatureImageUrl);
        if (existsSync(signaturePath)) {
          const signatureBytes = await readFile(signaturePath);
          const signatureImage = await pdfDoc.embedPng(signatureBytes);
          
          // Add signature image (adjust coordinates based on your template)
          page.drawImage(signatureImage, {
            x: 400,
            y: height - 450,
            width: 120,
            height: 60,
          });
        }
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
  } finally {
    await prisma.$disconnect();
  }
}