'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import LoadingScreen from '@/components/LoadingScreen';
import SignaturePad from '@/components/SignaturePad';
import { formatDateTimeTH } from '@/lib/formatters';

type BookingDetail = {
  id: string;
  expresswayOption: 'EXPRESSWAY' | 'NO_EXPRESSWAY' | null;
  expresswayCertificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  expresswayCertifiedAt: string | null;
  expresswayCertificationNote: string | null;
  startTime: string | null;
  endTime: string | null;
  endLocation: string | null;
  purpose: string | null;
  requester: { name: string | null; email: string; position: string | null };
};

type Me = { id: string; name: string | null; position: string | null; signatureImageUrl: string | null };

type SignatureMode = 'PROFILE' | 'NEW';

export default function CertifierCertificationDetailPage() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;
  const router = useRouter();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('PROFILE');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      fetch('/api/users/me').then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/bookings/${bookingId}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error('ไม่สามารถโหลดคำขอได้')))),
    ])
      .then(([meData, bookingData]) => {
        if (cancelled) return;
        if (meData) {
          setMe({
            id: meData.id,
            name: meData.name || null,
            position: meData.position || null,
            signatureImageUrl: meData.signatureImageUrl || null,
          });
        }
        setBooking(bookingData as BookingDetail);
        setSignatureMode((meData?.signatureImageUrl ? 'PROFILE' : 'NEW') as SignatureMode);
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
  }, [bookingId]);

  const status = booking?.expresswayCertificationStatus ?? 'PENDING';
  const statusLabel = status === 'APPROVED' ? 'รับรองแล้ว' : status === 'REJECTED' ? 'ปฏิเสธรับรอง' : 'รอรับรอง';

  const canAct = useMemo(() => {
    if (!booking) return false;
    if (booking.expresswayOption !== 'EXPRESSWAY') return false;
    return booking.expresswayCertificationStatus === 'PENDING' || booking.expresswayCertificationStatus == null;
  }, [booking]);

  const handleApprove = async () => {
    if (!booking) return;
    if (signatureMode === 'PROFILE' && !me?.signatureImageUrl) {
      setError('โปรไฟล์ยังไม่มีลายเซ็น กรุณาเลือก “เซ็นใหม่สำหรับรายการนี้”');
      return;
    }
    if (signatureMode === 'NEW' && !signatureDataUrl) {
      setError('กรุณาเซ็นและบันทึกลายเซ็นก่อน');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/expressway-certify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          signatureMode,
          ...(signatureMode === 'NEW' ? { signatureDataUrl } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'ไม่สามารถรับรองได้');
      }
      router.refresh();
      router.push('/certifier/certifications');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!booking) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/expressway-certify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', note: note.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'ไม่สามารถบันทึกการปฏิเสธได้');
      }
      router.refresh();
      router.push('/certifier/certifications');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <LoadingScreen fullScreen={false} message="กำลังโหลดคำขอ..." />
      </div>
    );
  }
  if (error && !booking) return <div className="p-4 md:p-8 text-red-600">ข้อผิดพลาด: {error}</div>;
  if (!booking) return <div className="p-4 md:p-8 text-slate-600">ไม่พบคำขอ</div>;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push('/certifier/certifications')}
            className="mt-0.5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <span aria-hidden>←</span>
            <span>กลับ</span>
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-[#004c80]">รับรองการใช้ทางด่วน</h1>
            <p className="mt-1 text-slate-700">ตรวจสอบข้อมูลสั้นๆ แล้วกดรับรอง</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200">
          {statusLabel}
        </span>
      </div>

      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>}

      <div className="rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-slate-600">ผู้ขอใช้</div>
            <div className="font-semibold text-slate-900">{booking.requester.name || booking.requester.email}</div>
            <div className="text-slate-600">{booking.requester.position || '-'}</div>
          </div>
          <div>
            <div className="text-slate-600">ปลายทาง</div>
            <div className="font-semibold text-slate-900">{booking.endLocation || '-'}</div>
          </div>
          <div>
            <div className="text-slate-600">วันเวลาเริ่ม</div>
            <div className="font-semibold text-slate-900">{formatDateTimeTH(booking.startTime)}</div>
          </div>
          <div>
            <div className="text-slate-600">วันเวลาสิ้นสุด</div>
            <div className="font-semibold text-slate-900">{formatDateTimeTH(booking.endTime)}</div>
          </div>
        </div>

        {!canAct ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            รายการนี้ไม่อยู่ในสถานะรอรับรองแล้ว
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              โปรดตรวจสอบข้อมูลข้างต้น หากถูกต้องให้กด <span className="font-semibold">รับรอง</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="text-sm font-semibold text-slate-900">ลายเซ็นผู้รับรอง</div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="radio"
                    name="signatureMode"
                    value="PROFILE"
                    checked={signatureMode === 'PROFILE'}
                    onChange={() => setSignatureMode('PROFILE')}
                    disabled={!me?.signatureImageUrl}
                  />
                  ใช้ลายเซ็นจากโปรไฟล์ {me?.signatureImageUrl ? '' : '(ยังไม่มี)'}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="radio"
                    name="signatureMode"
                    value="NEW"
                    checked={signatureMode === 'NEW'}
                    onChange={() => setSignatureMode('NEW')}
                  />
                  เซ็นใหม่สำหรับรายการนี้
                </label>
              </div>

              {signatureMode === 'PROFILE' && me?.signatureImageUrl && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-xs text-emerald-800 font-semibold mb-2">ตัวอย่างลายเซ็นจากโปรไฟล์</div>
                  <Image src={me.signatureImageUrl} alt="Signature" width={320} height={160} className="max-h-32 object-contain rounded-lg bg-white" />
                </div>
              )}

              {signatureMode === 'NEW' && (
                <div className="space-y-3">
                  {signatureDataUrl && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="text-xs text-emerald-800 font-semibold mb-2">ลายเซ็นที่บันทึกแล้ว</div>
                      <Image src={signatureDataUrl} alt="New signature" width={320} height={160} className="max-h-32 object-contain rounded-lg bg-white" />
                    </div>
                  )}
                  <SignaturePad onSignatureSave={setSignatureDataUrl} onClear={() => setSignatureDataUrl(null)} disabled={isSubmitting} />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="text-sm font-semibold text-slate-900">ไม่รับรอง (ถ้าจำเป็น)</div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400/30"
                placeholder="เหตุผล (ไม่บังคับ)"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleApprove}
                disabled={isSubmitting}
                className="inline-flex justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
              >
                รับรอง
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isSubmitting}
                className="inline-flex justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-60"
              >
                ไม่รับรอง
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

