// src/app/driver/page.tsx
'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import LoadingScreen from '@/components/LoadingScreen';
import StatusBadge from '@/components/booking/StatusBadge';
import { formatDateTimeTH } from '@/lib/formatters';

type Job = {
  id: string;
  purpose: string | null;
  startLocation: string | null;
  endLocation: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string;
  createdAt: string;
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
};

const getPrimaryAction = (status: string) => {
  if (status === 'CONFIRMED') return { label: 'เริ่มงาน', tone: 'primary' as const };
  if (status === 'IN_PROGRESS') return { label: 'ทำงานต่อ', tone: 'primary' as const };
  return { label: 'ดูรายละเอียด', tone: 'secondary' as const };
};

export default function DriverDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    if (status === 'authenticated' && session?.user?.role !== 'Driver') router.replace('/');
  }, [status, session, router]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/driver/jobs');
        if (res.ok) {
          const data = await res.json();
          setJobs(data);
        } else {
          console.error('ไม่สามารถดึงข้อมูลงานได้');
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (status === 'authenticated') load();
  }, [status]);

  if (status === 'loading') return <LoadingScreen fullScreen message="กำลังโหลด..." />;

  const sortedJobs = [...jobs].sort((a, b) => {
    const rank = (s: string) => {
      if (s === 'IN_PROGRESS') return 0;
      if (s === 'CONFIRMED') return 1;
      if (s === 'APPROVED') return 2;
      if (s === 'PENDING') return 3;
      if (s === 'MERGED') return 4;
      if (s === 'COMPLETED') return 5;
      if (s === 'CANCELLED') return 6;
      if (s === 'REJECTED') return 7;
      return 99;
    };
    const byStatus = rank(a.status) - rank(b.status);
    if (byStatus !== 0) return byStatus;
    const at = new Date(a.startTime || a.createdAt).getTime();
    const bt = new Date(b.startTime || b.createdAt).getTime();
    return at - bt;
  });

  return (
    <div className="relative min-h-screen overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff]" />
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#004c80]">งานของฉัน</h1>
          <p className="text-gray-700">รายการงานที่ได้รับมอบหมาย</p>
        </div>

        <div className="rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-12">
                <LoadingScreen fullScreen={false} message="กำลังโหลดข้อมูล..." />
              </div>
            ) : jobs.length > 0 ? (
              <>
                {/* Cards (mobile + desktop) */}
                <div className="space-y-4">
                  {sortedJobs.map((job) => {
                    const who = job.requestForSelf !== false ? (job.requester.name || job.requester.email) : (job.travelerName || '-');
                    const whoSub = job.requestForSelf !== false ? job.requester.position : job.travelerPosition;
                    const primary = getPrimaryAction(job.status);

                    const primaryHref =
                      job.status === 'IN_PROGRESS'
                        ? `/driver/jobs/${job.id}/navigate`
                        : `/driver/jobs/${job.id}`;

                    return (
                      <div key={job.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm text-gray-600">ผู้เดินทาง</div>
                                <div className="font-semibold text-gray-900 truncate">{who}</div>
                                {whoSub && <div className="text-xs text-gray-500 truncate">{whoSub}</div>}
                              </div>
                              <div className="shrink-0">
                                <StatusBadge status={job.status} />
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                              <div className="rounded-xl bg-[#004c80]/5 p-3 md:col-span-2">
                                <div className="text-xs text-gray-600">เส้นทาง</div>
                                <div className="font-medium text-gray-900">
                                  {job.startLocation || '-'} → {job.endLocation || '-'}
                                </div>
                              </div>

                              <div className="rounded-xl bg-gray-50 p-3">
                                <div className="text-xs text-gray-600">เวลาเริ่ม</div>
                                <div className="font-medium text-gray-900">{formatDateTimeTH(job.startTime)}</div>
                              </div>
                              <div className="rounded-xl bg-gray-50 p-3">
                                <div className="text-xs text-gray-600">เวลาสิ้นสุด</div>
                                <div className="font-medium text-gray-900">{formatDateTimeTH(job.endTime)}</div>
                              </div>

                              <div className="rounded-xl bg-gray-50 p-3">
                                <div className="text-xs text-gray-600">รถ</div>
                                <div className="font-medium text-gray-900">
                                  {job.vehicle ? job.vehicle.licensePlate : '-'}
                                </div>
                                {job.vehicle && (
                                  <div className="text-xs text-gray-500">
                                    {[job.vehicle.brand, job.vehicle.model, job.vehicle.color ? `สี ${job.vehicle.color}` : null].filter(Boolean).join(' • ')}
                                  </div>
                                )}
                              </div>

                              <div className="rounded-xl bg-gray-50 p-3">
                                <div className="text-xs text-gray-600">วัตถุประสงค์</div>
                                <div className="font-medium text-gray-900">{job.purpose || '-'}</div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 md:w-[320px] md:grid-cols-1">
                            <Link
                              href={primaryHref}
                              className={[
                                'inline-flex justify-center rounded-xl px-4 py-3 text-base font-semibold transition',
                                primary.tone === 'primary'
                                  ? 'bg-[#0076c3] text-white hover:bg-[#0087de]'
                                  : 'bg-white text-[#004c80] ring-1 ring-[#004c80]/20 hover:bg-[#004c80]/5',
                              ].join(' ')}
                            >
                              {primary.label}
                            </Link>
                            <Link
                              href={`/driver/jobs/${job.id}`}
                              className="inline-flex justify-center rounded-xl px-4 py-3 text-base font-semibold bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 transition"
                            >
                              ดูรายละเอียด
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="py-10">
                <div className="mx-auto max-w-md text-center">
                  <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-[#0076c3]/10 text-[#0076c3] grid place-items-center">🚗</div>
                  <h3 className="text-lg font-semibold text-gray-800">ยังไม่มีงานที่ได้รับมอบหมาย</h3>
                  <p className="text-sm text-gray-500 mt-1">รอการมอบหมายงานจากระบบ</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

