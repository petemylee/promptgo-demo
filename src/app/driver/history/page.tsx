'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/booking/StatusBadge';
import { routeTextWrapClass } from '@/components/booking/routeTextWrap';
import { formatDateTimeTHLong } from '@/lib/formatters';

type Job = {
  id: string;
  purpose: string | null;
  startLocation: string | null;
  endLocation: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  startMileage?: number | null;
  endMileage?: number | null;
  requestForSelf?: boolean | null;
  travelerName?: string | null;
  travelerPosition?: string | null;
  requester: {
    name: string | null;
    email: string;
    position: string | null;
  };
  vehicle: {
    licensePlate: string;
    brand: string | null;
    color: string | null;
    model: string | null;
    type: string | null;
  } | null;
  adminApprover: {
    name: string | null;
  } | null;
  executiveConfirmer: {
    name: string | null;
  } | null;
  feedback: {
    rating: number;
    comment: string | null;
  } | null;
  driverFeedback: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    requester: { name: string | null };
  } | null;
};

export default function DriverHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [startDateFrom, setStartDateFrom] = useState(''); // YYYY-MM-DD
  const [startDateTo, setStartDateTo] = useState(''); // YYYY-MM-DD

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    if (status === 'authenticated' && session?.user?.role !== 'Driver') router.replace('/');
  }, [status, session, router]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/driver/jobs/history');
        if (res.ok) {
          const data = await res.json();
          setJobs(data);
        } else {
          console.error('ไม่สามารถดึงประวัติงานได้');
        }
      } catch (error) {
        console.error('Error fetching job history:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (status === 'authenticated') load();
  }, [status]);

  const filtered = useMemo(() => {
    let result = jobs;

    if (statusFilter !== 'ALL') {
      result = result.filter((job) => job.status === statusFilter);
    }

    if (startDateFrom || startDateTo) {
      const from = startDateFrom ? new Date(`${startDateFrom}T00:00:00`) : null;
      const to = startDateTo ? new Date(`${startDateTo}T23:59:59.999`) : null;
      result = result.filter((job) => {
        if (!job.startTime) return false;
        const t = new Date(job.startTime).getTime();
        if (Number.isNaN(t)) return false;
        if (from && t < from.getTime()) return false;
        if (to && t > to.getTime()) return false;
        return true;
      });
    }

    const q = query.trim().toLowerCase();
    if (!q) return result;
    return result.filter(
      (job) =>
        (job.purpose || '').toLowerCase().includes(q) ||
        (job.startLocation || '').toLowerCase().includes(q) ||
        (job.endLocation || '').toLowerCase().includes(q) ||
        (job.requester.name || '').toLowerCase().includes(q) ||
        (job.requestForSelf === false && (job.travelerName || '').toLowerCase().includes(q)) ||
        (job.status || '').toLowerCase().includes(q)
    );
  }, [jobs, statusFilter, startDateFrom, startDateTo, query]);

  const formatDate = (dateString: string) => formatDateTimeTHLong(dateString);

  if (status === 'loading') return <div className="p-6">กำลังโหลด...</div>;

  return (
    <div className="relative min-h-screen overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff]" />
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#004c80]">ประวัติงาน</h1>
          <p className="text-gray-700">รายการงานที่เสร็จสิ้น, ยกเลิก หรือถูกปฏิเสธ</p>
        </div>

        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-600">
              พบ {filtered.length} รายการจากทั้งหมด {jobs.length} รายการ
            </div>
            <div className="relative w-full md:w-80">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหา: วัตถุประสงค์ จุดเริ่มต้น ปลายทาง หรือสถานะ"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pr-10 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL' as const, label: 'ทั้งหมด' },
              { id: 'COMPLETED' as const, label: 'เสร็จสิ้น' },
              { id: 'CANCELLED' as const, label: 'ยกเลิก' },
            ].map((f) => {
              const active = statusFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={[
                    'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-[#0076c3] text-white' : 'bg-white text-gray-700 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5 md:col-span-2">
              <div className="text-xs font-semibold text-slate-700">ช่วงวันเวลาเริ่มเดินทาง</div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-xs text-slate-600">
                  จากวันที่
                  <input
                    type="date"
                    value={startDateFrom}
                    onChange={(e) => setStartDateFrom(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
                  />
                </label>
                <label className="text-xs text-slate-600">
                  ถึงวันที่
                  <input
                    type="date"
                    value={startDateTo}
                    onChange={(e) => setStartDateTo(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
                  />
                </label>
              </div>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5">
              <div className="text-xs font-semibold text-slate-700">ตัวกรอง</div>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setStartDateFrom('');
                  setStartDateTo('');
                }}
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#004c80] ring-1 ring-slate-200 hover:bg-slate-50 transition"
              >
                ล้างตัวกรอง
              </button>
              <div className="mt-2 text-xs text-slate-500">* ช่วงวันที่นับจากวันเวลาเริ่มเดินทาง (startTime)</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
          {isLoading ? (
            <div className="py-10 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
          ) : filtered.length > 0 ? (
            <div className="space-y-4">
              {filtered.map((job) => {
                const who =
                  job.requestForSelf !== false ? job.requester.name || '-' : job.travelerName || '-';
                const whoPos =
                  job.requestForSelf !== false
                    ? job.requester.position || '-'
                    : job.travelerPosition || '-';

                return (
                  <div
                    key={job.id}
                    className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm ring-1 ring-black/5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs text-slate-600">เส้นทาง</div>
                            <div className={`font-semibold text-slate-900 leading-snug ${routeTextWrapClass}`}>
                              {job.startLocation || '-'} → {job.endLocation || '-'}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              เริ่ม: {job.startTime ? formatDate(job.startTime) : '-'} • สิ้นสุด:{' '}
                              {job.endTime ? formatDate(job.endTime) : '-'}
                            </div>
                          </div>
                          <div className="shrink-0">
                            <StatusBadge status={job.status} />
                          </div>
                        </div>

                        <Link
                          href={`/driver/jobs/${job.id}`}
                          className="inline-flex w-full items-center justify-center rounded-xl bg-[#0076c3] px-4 py-3 text-base font-semibold text-white shadow hover:bg-[#0087de] transition"
                        >
                          ดูรายละเอียด
                        </Link>

                        <details className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                          <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                            รายละเอียดเพิ่มเติม
                          </summary>
                          <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-900 md:grid-cols-2">
                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
                              <div className="text-xs text-slate-600">ผู้เดินทาง</div>
                              <div className="font-semibold text-slate-900">{who}</div>
                              <div className="text-xs text-slate-500">{whoPos}</div>
                              {job.requestForSelf === false && (
                                <div className="mt-2 text-xs text-slate-600">
                                  ผู้สร้างคำขอ: {job.requester.name || '-'} ({job.requester.email})
                                </div>
                              )}
                            </div>

                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
                              <div className="text-xs text-slate-600">วัตถุประสงค์</div>
                              <div className="font-medium text-slate-900">{job.purpose || '-'}</div>
                            </div>

                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
                              <div className="text-xs text-slate-600">เลขไมล์/ระยะทาง</div>
                              <div className="mt-1 space-y-1">
                                <div>
                                  <span className="font-medium text-slate-700">ก่อน:</span>{' '}
                                  <span>
                                    {job.startMileage != null ? `${job.startMileage.toLocaleString('th-TH')} กม.` : '-'}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-slate-700">หลัง:</span>{' '}
                                  <span>
                                    {job.endMileage != null ? `${job.endMileage.toLocaleString('th-TH')} กม.` : '-'}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-slate-700">รวม:</span>{' '}
                                  <span>
                                    {job.startMileage != null && job.endMileage != null
                                      ? `${Math.max(0, job.endMileage - job.startMileage).toLocaleString('th-TH')} กม.`
                                      : '-'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
                              <div className="text-xs text-slate-600">รถ</div>
                              {job.vehicle ? (
                                <div className="mt-1">
                                  <div className="font-semibold text-slate-900">{job.vehicle.licensePlate}</div>
                                  <div className="text-xs text-slate-600">
                                    {[job.vehicle.brand, job.vehicle.model, job.vehicle.type].filter(Boolean).join(' ')}
                                  </div>
                                  <div className="text-xs text-slate-600">สี: {job.vehicle.color || '-'}</div>
                                </div>
                              ) : (
                                <div className="mt-1 text-sm text-slate-600">-</div>
                              )}
                            </div>

                            {(job.adminApprover || job.executiveConfirmer) && (
                              <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70 md:col-span-2">
                                <div className="text-xs text-slate-600">การอนุมัติ/ยืนยัน</div>
                                <div className="mt-1 grid grid-cols-1 gap-1 text-sm">
                                  <div>
                                    <span className="font-medium text-slate-700">อนุมัติโดย:</span>{' '}
                                    <span>{job.adminApprover?.name || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-slate-700">ยืนยันโดย:</span>{' '}
                                    <span>{job.executiveConfirmer?.name || '-'}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {(job.feedback || job.driverFeedback) && (
                              <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70 md:col-span-2">
                                <div className="text-xs text-slate-600">ข้อเสนอแนะ</div>
                                {job.feedback && (
                                  <div className="mt-1 text-sm text-slate-900">
                                    <span className="font-medium">
                                      จากผู้ขอ: {'⭐'.repeat(job.feedback.rating)} ({job.feedback.rating}/5)
                                    </span>
                                    {job.feedback.comment && <div className="mt-1 text-slate-800">{job.feedback.comment}</div>}
                                  </div>
                                )}
                                {job.driverFeedback && (
                                  <div className="mt-2 text-sm text-slate-900">
                                    <span className="font-medium">
                                      จากผู้ขอใช้: {'⭐'.repeat(job.driverFeedback.rating)} ({job.driverFeedback.rating}/5)
                                    </span>
                                    {job.driverFeedback.requester?.name && (
                                      <span className="text-slate-600"> โดย {job.driverFeedback.requester.name}</span>
                                    )}
                                    {job.driverFeedback.comment && (
                                      <div className="mt-1 text-slate-800">{job.driverFeedback.comment}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="text-xs text-slate-500 md:col-span-2">
                              อัปเดตล่าสุด: {formatDate(job.updatedAt)}
                            </div>
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#0076c3]/10 text-[#0076c3] grid place-items-center">
                📋
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {jobs.length === 0 ? 'ยังไม่มีประวัติงาน' : 'ไม่พบรายการที่ตรงกับคำค้นหา'}
              </h3>
              <p className="text-gray-500">
                {jobs.length === 0
                  ? 'ประวัติงานจะแสดงที่นี่เมื่อมีงานที่เสร็จสิ้น, ยกเลิก, หรือถูกปฏิเสธ'
                  : 'ลองปรับคำค้นหาหรือล้างตัวกรอง'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

