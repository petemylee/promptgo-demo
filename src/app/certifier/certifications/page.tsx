'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/LoadingScreen';
import { formatDateTimeTH } from '@/lib/formatters';

type CertificationItem = {
  id: string;
  expresswayOption: 'EXPRESSWAY' | 'NO_EXPRESSWAY' | null;
  expresswayCertificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  expresswayCertifiedAt: string | null;
  startTime: string | null;
  endTime: string | null;
  endLocation: string | null;
  purpose: string | null;
  createdAt: string;
  requester: { name: string | null; position: string | null; email: string };
};

function statusBadge(status: CertificationItem['expresswayCertificationStatus']) {
  if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-800 ring-emerald-200';
  if (status === 'REJECTED') return 'bg-rose-100 text-rose-800 ring-rose-200';
  return 'bg-amber-100 text-amber-900 ring-amber-200';
}

function statusLabel(status: CertificationItem['expresswayCertificationStatus']) {
  if (status === 'APPROVED') return 'รับรองแล้ว';
  if (status === 'REJECTED') return 'ปฏิเสธรับรอง';
  return 'รอรับรอง';
}

export default function CertifierCertificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<CertificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch('/api/certifier/expressway-certifications')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('ไม่สามารถดึงข้อมูลได้'))))
      .then((data) => {
        if (cancelled) return;
        setItems(Array.isArray(data) ? data : []);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => {
    const arr = [...items];
    const rank = (s: CertificationItem['expresswayCertificationStatus']) =>
      s === 'PENDING' || s == null ? 0 : s === 'APPROVED' ? 1 : 2;
    arr.sort((a, b) => {
      const r = rank(a.expresswayCertificationStatus) - rank(b.expresswayCertificationStatus);
      if (r !== 0) return r;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return arr;
  }, [items]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <LoadingScreen fullScreen={false} message="กำลังโหลดรายการรับรอง..." />
      </div>
    );
  }
  if (error) return <div className="p-4 md:p-8 text-red-600">ข้อผิดพลาด: {error}</div>;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-start gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-0.5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <span aria-hidden>←</span>
          <span>ย้อนกลับ</span>
        </button>
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-[#004c80]">รายการรับรองทางด่วน</h1>
          <p className="mt-1 text-slate-700">กดเปิดรายการเพื่อรับรองหรือปฏิเสธรับรอง</p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl bg-white/90 p-8 shadow ring-1 ring-black/5 text-center text-slate-600">
          ยังไม่มีรายการที่ต้องรับรอง
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((it) => (
            <Link
              key={it.id}
              href={`/certifier/certifications/${it.id}`}
              className="block rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm ring-1 ring-black/5 hover:bg-white transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-slate-600">ผู้ขอใช้</div>
                  <div className="font-semibold text-slate-900 truncate">{it.requester.name || it.requester.email}</div>
                  <div className="text-xs text-slate-500 truncate">{it.requester.position || '-'}</div>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusBadge(it.expresswayCertificationStatus)}`}>
                  {statusLabel(it.expresswayCertificationStatus)}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-800">
                <div>
                  <span className="font-medium text-slate-700">ปลายทาง:</span> {it.endLocation || '-'}
                </div>
                <div>
                  <span className="font-medium text-slate-700">วันเวลา:</span> {formatDateTimeTH(it.startTime)} – {formatDateTimeTH(it.endTime)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

