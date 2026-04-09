// src/app/driver/history/page.tsx
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
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(job =>
      (job.purpose || '').toLowerCase().includes(q) ||
      (job.startLocation || '').toLowerCase().includes(q) ||
      (job.endLocation || '').toLowerCase().includes(q) ||
      (job.requester.name || '').toLowerCase().includes(q) ||
      (job.requestForSelf === false && (job.travelerName || '').toLowerCase().includes(q)) ||
      (job.status || '').toLowerCase().includes(q)
    );
  }, [jobs, query]);

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

        {/* Search */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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

        <div className="rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
          {isLoading ? (
            <div className="py-10 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
          ) : filtered.length > 0 ? (
            <div className="space-y-4">
              {filtered.map((job) => (
                <div key={job.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Job Info */}
                    <div className="flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* ผู้เดินทาง */}
                        <div>
                          <h3 className="font-semibold text-[#004c80] mb-2">ผู้เดินทาง</h3>
                          <p className="font-medium">{job.requestForSelf !== false ? (job.requester.name || '-') : (job.travelerName || '-')}</p>
                          <p className="text-sm text-gray-600">{job.requestForSelf !== false ? (job.requester.position || '-') : (job.travelerPosition || '-')}</p>
                          {job.requestForSelf === false && (
                            <p className="text-sm text-gray-500">ผู้สร้างคำขอ: {job.requester.name} ({job.requester.email})</p>
                          )}
                        </div>

                        {/* Trip Details */}
                        <div className={routeTextWrapClass}>
                          <h3 className="font-semibold text-[#004c80] mb-2">รายละเอียดการเดินทาง</h3>
                          <p className="text-sm">
                            <span className="font-medium">จุดเริ่มต้น:</span> {job.startLocation || '-'}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">ปลายทาง:</span> {job.endLocation || '-'}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">วัตถุประสงค์:</span> {job.purpose || '-'}
                          </p>
                        </div>

                        {/* Schedule */}
                        <div>
                          <h3 className="font-semibold text-[#004c80] mb-2">กำหนดการ</h3>
                          <p className="text-sm">
                            <span className="font-medium">วันที่เริ่ม:</span> {job.startTime ? formatDate(job.startTime) : '-'}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">วันที่สิ้นสุด:</span> {job.endTime ? formatDate(job.endTime) : '-'}
                          </p>
                        </div>

                        {/* Vehicle */}
                        <div>
                          <h3 className="font-semibold text-[#004c80] mb-2">ยานพาหนะ</h3>
                          {job.vehicle ? (
                            <>
                              <p className="text-sm font-medium">{job.vehicle.licensePlate}</p>
                              <p className="text-sm text-gray-600">
                                {job.vehicle.brand} {job.vehicle.model}
                              </p>
                              <p className="text-sm text-gray-600">สี: {job.vehicle.color || '-'}</p>
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">ยังไม่ได้กำหนดรถ</p>
                          )}
                        </div>
                      </div>

                      {/* ข้อเสนอแนะจากผู้ขอใช้รถ */}
                      {job.feedback && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-700">
                            <span className="font-medium">คะแนนจากผู้ขอ:</span> {'⭐'.repeat(job.feedback.rating)} ({job.feedback.rating}/5)
                          </p>
                          {job.feedback.comment && (
                            <p className="text-sm text-blue-700 mt-1">
                              <span className="font-medium">ความคิดเห็น:</span> {job.feedback.comment}
                            </p>
                          )}
                        </div>
                      )}
                      {/* ข้อเสนอแนะจากผู้ขอใช้รถ (Admin, Executive, Driver เห็นได้) */}
                      {job.driverFeedback && (
                        <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                          <p className="text-sm text-amber-800">
                            <span className="font-medium">ข้อเสนอแนะจากผู้ขอใช้:</span> {'⭐'.repeat(job.driverFeedback.rating)} ({job.driverFeedback.rating}/5)
                            {job.driverFeedback.requester?.name && ` โดย ${job.driverFeedback.requester.name}`}
                          </p>
                          {job.driverFeedback.comment && (
                            <p className="text-sm text-amber-800 mt-1">
                              <span className="font-medium">ข้อเสนอแนะ:</span> {job.driverFeedback.comment}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Approvals */}
                      {(job.adminApprover || job.executiveConfirmer) && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg">
                          {job.adminApprover && (
                            <p className="text-sm text-green-700">
                              <span className="font-medium">อนุมัติโดย:</span> {job.adminApprover.name}
                            </p>
                          )}
                          {job.executiveConfirmer && (
                            <p className="text-sm text-green-700">
                              <span className="font-medium">ยืนยันโดย:</span> {job.executiveConfirmer.name}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={job.status} />
                      <p className="text-xs text-gray-500">
                        อัปเดตล่าสุด: {formatDate(job.updatedAt)}
                      </p>
                      <Link
                        href={`/driver/jobs/${job.id}`}
                        className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#004c80] ring-1 ring-slate-200 hover:bg-slate-50 transition"
                      >
                        ดูรายละเอียด
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
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

