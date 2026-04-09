'use client';

import DriverOverview from '@/components/dashboard/DriverOverview';
import { useState } from 'react';

export default function DriverDashboardPage() {
  const [reportMonthFrom, setReportMonthFrom] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reportMonthTo, setReportMonthTo] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const buildReportFilename = () => {
    if (reportMonthFrom === reportMonthTo) return `driver_travel_summary_${reportMonthFrom}.pdf`;
    return `driver_travel_summary_${reportMonthFrom}_to_${reportMonthTo}.pdf`;
  };

  const openDriverReportPreview = () => {
    if (!/^\d{4}-\d{2}$/.test(reportMonthFrom) || !/^\d{4}-\d{2}$/.test(reportMonthTo)) {
      alert('รูปแบบเดือนไม่ถูกต้อง (ต้องเป็น YYYY-MM)');
      return;
    }
    if (reportMonthFrom > reportMonthTo) {
      alert('ช่วงเดือนไม่ถูกต้อง (เดือนเริ่มต้องไม่มากกว่าเดือนสิ้นสุด)');
      return;
    }
    const previewUrl = `/api/driver/report/pdf?from=${encodeURIComponent(reportMonthFrom)}&to=${encodeURIComponent(
      reportMonthTo
    )}&preview=1`;
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  const downloadDriverReportPdf = async () => {
    if (!/^\d{4}-\d{2}$/.test(reportMonthFrom) || !/^\d{4}-\d{2}$/.test(reportMonthTo)) {
      alert('รูปแบบเดือนไม่ถูกต้อง (ต้องเป็น YYYY-MM)');
      return;
    }
    if (reportMonthFrom > reportMonthTo) {
      alert('ช่วงเดือนไม่ถูกต้อง (เดือนเริ่มต้องไม่มากกว่าเดือนสิ้นสุด)');
      return;
    }

    setIsDownloadingReport(true);
    try {
      const res = await fetch(
        `/api/driver/report/pdf?from=${encodeURIComponent(reportMonthFrom)}&to=${encodeURIComponent(reportMonthTo)}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'ไม่สามารถสร้างรายงาน PDF ได้');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildReportFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsDownloadingReport(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff]" />
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#004c80]">แดชบอร์ด</h1>
          <p className="text-gray-700">สรุปงาน ระยะทาง เวลา และคะแนน</p>
        </div>

        <div className="mb-6 rounded-2xl bg-white/90 p-5 shadow ring-1 ring-black/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#004c80]">รายงานสรุปการใช้งาน</h2>
              <p className="text-sm text-slate-600">เลือกช่วงเดือนที่ต้องการ แล้วพรีวิวก่อนดาวน์โหลด PDF</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-700">ตั้งแต่เดือน</span>
                <input
                  type="month"
                  value={reportMonthFrom}
                  onChange={(e) => setReportMonthFrom(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60 sm:w-44"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-700">ถึงเดือน</span>
                <input
                  type="month"
                  value={reportMonthTo}
                  onChange={(e) => setReportMonthTo(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60 sm:w-44"
                />
              </label>
              <button
                type="button"
                onClick={openDriverReportPreview}
                disabled={isDownloadingReport}
                className={[
                  'rounded-xl px-4 py-2.5 font-semibold shadow transition',
                  isDownloadingReport
                    ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                    : 'bg-[#004c80] text-white hover:bg-[#0060a0]',
                ].join(' ')}
              >
                {isDownloadingReport ? 'กำลังทำงาน...' : 'พรีวิว'}
              </button>
              <button
                type="button"
                onClick={downloadDriverReportPdf}
                disabled={isDownloadingReport}
                className={[
                  'rounded-xl px-4 py-2.5 font-semibold shadow transition',
                  isDownloadingReport
                    ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                    : 'bg-white text-[#004c80] ring-1 ring-[#004c80]/30 hover:bg-slate-50',
                ].join(' ')}
              >
                {isDownloadingReport ? 'กำลังสร้างรายงาน...' : 'ดาวน์โหลด PDF'}
              </button>
            </div>
          </div>
        </div>

        <DriverOverview />
      </div>
    </div>
  );
}

