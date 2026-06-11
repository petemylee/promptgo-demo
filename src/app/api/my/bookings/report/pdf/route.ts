import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { PDFDocument, type PDFPage, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  bangkokMonthRangeFromTo,
  currentBangkokMonthYYYYMM,
  formatBangkokDateTimeReport,
  parseBangkokMonthValue,
} from '@/lib/dateTime';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const monthParam = url.searchParams.get('month');
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');
  const isPreview = url.searchParams.get('preview') === '1';

  const monthRange =
    fromParam || toParam
      ? bangkokMonthRangeFromTo(fromParam, toParam)
      : parseBangkokMonthValue(monthParam ?? currentBangkokMonthYYYYMM());

  if (!monthRange) {
    return NextResponse.json({ error: 'Invalid month format. Use month=YYYY-MM or from=YYYY-MM&to=YYYY-MM' }, { status: 400 });
  }

  try {
    const [user, bookings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, position: true },
      }),
      prisma.booking.findMany({
        where: {
          requesterId: session.user.id,
          startTime: {
            gte: monthRange.startDate,
            lt: monthRange.endDate,
          },
        },
        orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          startTime: true,
          endTime: true,
          startLocation: true,
          endLocation: true,
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

    const titleSize = 18;
    const subtitleSize = 12;
    const textSize = 10;
    const headerTextSize = 10;

    const tableRowHeight = 20;
    const tableHeaderHeight = 24;
    const tableGap = 10;

    const colWidths = [140, 140, 115, 120];
    const colLabels = ['เริ่ม (วันเวลา)', 'สิ้นสุด (วันเวลา)', 'ต้นทาง', 'ปลายทาง'];

    const textColor = rgb(0.15, 0.15, 0.15);
    const headerFill = rgb(0.95, 0.97, 1);
    const borderColor = rgb(0.82, 0.86, 0.92);

    const effectiveName = user?.name ?? '-';
    const effectivePosition = user?.position ?? '-';
    const monthLabel =
      'from' in monthRange && 'to' in monthRange
        ? monthRange.from.value === monthRange.to.value
          ? monthRange.from.value
          : `${monthRange.from.value} ถึง ${monthRange.to.value}`
        : monthRange.value;

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

      const titleText = 'สรุปการเดินทางโดยใช้รถยนต์ส่วนกลาง';
      // pdf-lib doesn't guarantee bold style for embedded Thai fonts; we "fake" bold by drawing twice.
      page.drawText(titleText, {
        x: marginX,
        y,
        size: titleSize,
        font: boldFont,
        color: textColor,
      });
      page.drawText(titleText, {
        x: marginX + 0.35,
        y: y - 0.15,
        size: titleSize,
        font: boldFont,
        color: textColor,
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
        });
        cursorX += colWidths[i];
      }

      state.y = yTop - tableHeaderHeight;
    };

    const drawRow = (
      state: { page: PDFPage; y: number },
      row: { start: string; end: string; from: string; to: string }
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

      const values = [row.start, row.end, row.from, row.to];
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
      const { page } = state;
      page.drawText('ไม่พบข้อมูลในเดือนที่เลือก', {
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

        drawRow(state, {
          start: formatBangkokDateTimeReport(b.startTime),
          end: formatBangkokDateTimeReport(b.endTime),
          from: b.startLocation ?? '-',
          to: b.endLocation ?? '-',
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);
    const filename =
      'from' in monthRange && 'to' in monthRange
        ? monthRange.from.value === monthRange.to.value
          ? `travel_summary_${monthRange.from.value}.pdf`
          : `travel_summary_${monthRange.from.value}_to_${monthRange.to.value}.pdf`
        : `travel_summary_${monthRange.value}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${isPreview ? 'inline' : 'attachment'}; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('GET /api/my/bookings/report/pdf error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

