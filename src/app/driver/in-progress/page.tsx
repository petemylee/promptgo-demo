'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import BookingSummaryHeader from '@/components/booking/BookingSummaryHeader';
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
};

export default function InProgressJobsPage() {
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
        const res = await fetch('/api/driver/jobs/in-progress');
        if (res.ok) {
          const data = await res.json();
          setJobs(data);
        } else {
          console.error('ไม่สามารถดึงข้อมูลงานที่กำลังทำอยู่ได้');
        }
      } catch (error) {
        console.error('Error fetching in-progress jobs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (status === 'authenticated') load();
  }, [status]);

  if (status === 'loading') return <div className="p-6">กำลังโหลด...</div>;

  return (
    <div className="relative min-h-screen overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff]" />
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#004c80]">งานที่กำลังทำอยู่</h1>
          <p className="text-gray-700">รายการงานที่เริ่มทำแล้วแต่ยังไม่เสร็จสิ้น</p>
        </div>

        <div className="rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
          {isLoading ? (
            <div className="py-10 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
          ) : jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job) => {
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
                        <BookingSummaryHeader
                          status={job.status}
                          startLocation={job.startLocation}
                          endLocation={job.endLocation}
                          startTime={job.startTime}
                          endTime={job.endTime}
                          vehicle={job.vehicle ? { licensePlate: job.vehicle.licensePlate } : null}
                        />

                        <details className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                          <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                            ดูรายละเอียดเพิ่มเติม
                          </summary>
                          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-900 md:grid-cols-2">
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
                              <div className="text-xs text-slate-600">รถ</div>
                              {job.vehicle ? (
                                <div className="mt-1">
                                  <div className="font-semibold text-slate-900">{job.vehicle.licensePlate}</div>
                                  <div className="text-xs text-slate-600">
                                    {[job.vehicle.brand, job.vehicle.model, job.vehicle.type]
                                      .filter(Boolean)
                                      .join(' ')}
                                  </div>
                                  <div className="text-xs text-slate-600">สี: {job.vehicle.color || '-'}</div>
                                </div>
                              ) : (
                                <div className="mt-1 text-sm text-slate-600">ยังไม่ได้กำหนดรถ</div>
                              )}
                            </div>

                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
                              <div className="text-xs text-slate-600">สถานะและการยืนยัน</div>
                              <div className="mt-2 text-xs text-slate-500">
                                อัปเดตล่าสุด: {formatDateTimeTH(job.updatedAt || job.createdAt)}
                              </div>
                              <div className="mt-2 space-y-1 text-sm">
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
                          </div>
                        </details>
                      </div>

                      <div className="grid grid-cols-2 gap-2 md:w-[320px] md:grid-cols-1 md:self-center">
                        <Link
                          href={`/driver/jobs/${job.id}/navigate`}
                          className="col-span-2 md:col-span-1 inline-flex items-center justify-center rounded-xl bg-[#0076c3] px-4 py-3 text-sm font-semibold text-white shadow hover:bg-[#0087de] transition"
                        >
                          ทำงานต่อ
                        </Link>
                        <Link
                          href={`/driver/jobs/${job.id}`}
                          className="col-span-2 md:col-span-1 inline-flex items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#004c80] ring-1 ring-slate-200 hover:bg-slate-50 transition"
                        >
                          ดูรายละเอียด
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10">
              <div className="mx-auto max-w-md text-center">
                <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 grid place-items-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">ไม่มีงานที่กำลังทำอยู่</h3>
                <p className="text-sm text-gray-500 mt-1">งานที่เริ่มทำแล้วจะแสดงที่นี่</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

