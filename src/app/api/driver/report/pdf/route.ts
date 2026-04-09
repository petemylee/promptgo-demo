import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { PDFDocument, type PDFPage, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function parseMonthValue(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  const [yearRaw, monthRaw] = value.split('-');
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) return null;
  const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  return { value, startDate, year, monthIndex };
}

function monthRangeFromTo(fromParam: string | null, toParam: string | null) {
  const now = new Date();
  const fallbackMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const fromValue = fromParam ?? fallbackMonth;
  const toValue = toParam ?? fromValue;

  const from = parseMonthValue(fromValue);
  const to = parseMonthValue(toValue);
  if (!from || !to) return null;
  if (from.value > to.value) return null;

  const endDate = new Date(Date.UTC(to.year, to.monthIndex + 1, 1, 0, 0, 0));
  return { from, to, startDate: from.startDate, endDate };
}

function formatDateTimeReport(value: Date | null) {
  if (!value) return '-';
  return value.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatKm(value: number | null) {
  if (value === null || Number.isNaN(value)) return '-';
  return value.toLocaleString('th-TH');
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'Driver') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');
  const isPreview = url.searchParams.get('preview') === '1';

  const monthRange = monthRangeFromTo(fromParam, toParam);
  if (!monthRange) {
    return NextResponse.json({ error: 'Invalid month format. Use from=YYYY-MM&to=YYYY-MM' }, { status: 400 });
  }

  try {
    const driverId = session.user.id;

    const [user, bookings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: driverId },
        select: { name: true, position: true },
      }),
      prisma.booking.findMany({
        where: {
          driverId,
          status: 'COMPLETED',
          endTime: {
            gte: monthRange.startDate,
            lt: monthRange.endDate,
          },
        },
        orderBy: [{ endTime: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          startTime: true,
          endTime: true,
          startLocation: true,
          endLocation: true,
          startMileage: true,
          endMileage: true,
        },
      }),
    ]);

    const pdfDoc = await PDFDocument.create();

    const fontPath = join(process.cwd(), 'public', 'fonts', 'THSarabunNew.ttf');
    let font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    if (existsSync(fontPath)) {
      pdfDoc.registerFontkit(fontkit);
      const thaiFont = await pdfDoc.embedFont(readFileSync(fontPath));
      font = thaiFont;
      boldFont = thaiFont;
    }

    const pageSize: [number, number] = [595.28, 841.89]; // A4 portrait
    const marginX = 40;
    const marginTop = 48;
    const marginBottom = 40;

    const titleSize = 16;
    const subtitleSize = 12;
    const textSize = 10;
    const headerTextSize = 10;

    const tableRowHeight = 20;
    const tableHeaderHeight = 24;
    const tableGap = 10;

    const colWidths = [120, 120, 105, 105, 90];
    const colLabels = ['เริ่ม (วันเวลา)', 'สิ้นสุด (วันเวลา)', 'ต้นทาง', 'ปลายทาง', 'ระยะทางที่ใช้(กม.)'];

    const textColor = rgb(0.15, 0.15, 0.15);
    const headerFill = rgb(0.95, 0.97, 1);
    const borderColor = rgb(0.82, 0.86, 0.92);

    const effectiveName = user?.name ?? '-';
    const effectivePosition = user?.position ?? '-';
    const monthLabel =
      monthRange.from.value === monthRange.to.value
        ? monthRange.from.value
        : `${monthRange.from.value} ถึง ${monthRange.to.value}`;

    const ensurePage = (state: { page: PDFPage; y: number } | null) => {
      if (state) return state;
      const page = pdfDoc.addPage(pageSize);
      const { height } = page.getSize();
      return { page, y: height - marginTop };
    };

    const drawHeader = (state: { page: PDFPage; y: number }) => {
      const { page } = state;
      const { height } = page.getSize();
      let y = height - marginTop;

      const titleText = 'สรุปการเดินทางโดยใช้รถยนต์ส่วนกลางของพนักงานขับรถ';
      page.drawText(titleText, {
        x: marginX,
        y,
        size: titleSize,
        font: boldFont,
        color: textColor,
        maxWidth: page.getSize().width - marginX * 2,
      });
      page.drawText(titleText, {
        x: marginX + 0.35,
        y: y - 0.15,
        size: titleSize,
        font: boldFont,
        color: textColor,
        maxWidth: page.getSize().width - marginX * 2,
      });
      y -= 24;

      page.drawText(`ชื่อ: ${effectiveName}    ตำแหน่ง: ${effectivePosition}`, {
        x: marginX,
        y,
        size: subtitleSize,
        font,
        color: textColor,
      });
      y -= 16;

      page.drawText(`เดือน: ${monthLabel}`, {
        x: marginX,
        y,
        size: subtitleSize,
        font,
        color: textColor,
      });
      y -= 18;

      state.y = y - tableGap;
    };

    const drawTableHeader = (state: { page: PDFPage; y: number }) => {
      const { page } = state;
      const { width } = page.getSize();
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);
      const x = marginX;
      const yTop = state.y;

      page.drawRectangle({
        x,
        y: yTop - tableHeaderHeight,
        width: Math.min(tableWidth, width - marginX * 2),
        height: tableHeaderHeight,
        color: headerFill,
        borderColor,
        borderWidth: 1,
      });

      let cursorX = x + 6;
      for (let i = 0; i < colLabels.length; i += 1) {
        page.drawText(colLabels[i], {
          x: cursorX,
          y: yTop - 16,
          size: headerTextSize,
          font: boldFont,
          color: textColor,
          maxWidth: colWidths[i] - 12,
        });
        cursorX += colWidths[i];
      }

      state.y = yTop - tableHeaderHeight;
    };

    const drawRow = (
      state: { page: PDFPage; y: number },
      row: { start: string; end: string; from: string; to: string; km: string }
    ) => {
      const { page } = state;
      const { width } = page.getSize();
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);
      const x = marginX;
      const yTop = state.y;

      page.drawRectangle({
        x,
        y: yTop - tableRowHeight,
        width: Math.min(tableWidth, width - marginX * 2),
        height: tableRowHeight,
        borderColor,
        borderWidth: 1,
        color: rgb(1, 1, 1),
      });

      const values = [row.start, row.end, row.from, row.to, row.km];
      let cursorX = x + 6;
      for (let i = 0; i < values.length; i += 1) {
        page.drawText(values[i], {
          x: cursorX,
          y: yTop - 14,
          size: textSize,
          font,
          color: textColor,
          maxWidth: colWidths[i] - 12,
        });
        cursorX += colWidths[i];
      }

      state.y = yTop - tableRowHeight;
    };

    let state: { page: PDFPage; y: number } | null = null;
    state = ensurePage(state);
    drawHeader(state);
    drawTableHeader(state);

    const minYBeforeNewPage = marginBottom + tableRowHeight + 10;

    if (bookings.length === 0) {
      state.page.drawText('ไม่พบข้อมูลในเดือนที่เลือก', {
        x: marginX,
        y: state.y - 30,
        size: 12,
        font,
        color: textColor,
      });
    } else {
      for (const b of bookings) {
        if (state.y < minYBeforeNewPage) {
          state = ensurePage(null);
          drawHeader(state);
          drawTableHeader(state);
        }

        const km =
          b.startMileage !== null && b.endMileage !== null ? Math.max(0, b.endMileage - b.startMileage) : null;

        drawRow(state, {
          start: formatDateTimeReport(b.startTime),
          end: formatDateTimeReport(b.endTime),
          from: b.startLocation ?? '-',
          to: b.endLocation ?? '-',
          km: formatKm(km),
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);
    const filename =
      monthRange.from.value === monthRange.to.value
        ? `driver_travel_summary_${monthRange.from.value}.pdf`
        : `driver_travel_summary_${monthRange.from.value}_to_${monthRange.to.value}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${isPreview ? 'inline' : 'attachment'}; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('GET /api/driver/report/pdf error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

