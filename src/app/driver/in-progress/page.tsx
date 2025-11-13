// src/app/driver/in-progress/page.tsx
'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  requester: {
    name: string | null;
    email: string;
    position: string | null;
  };
  vehicle: {
    licensePlate: string;
    brand: string | null;
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

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending' },
    APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Approved' },
    CONFIRMED: { bg: 'bg-sky-50', text: 'text-sky-700', label: 'Confirmed' },
    REJECTED: { bg: 'bg-red-50', text: 'text-red-700', label: 'Rejected' },
    IN_PROGRESS: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'กำลังทำอยู่' },
    COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Completed' },
    CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelled' },
    MERGED: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Merged' },
  };
  const p = map[status] || { bg: 'bg-gray-50', text: 'text-gray-700', label: status };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${p.bg} ${p.text} ring-1 ring-black/5`}>{p.label}</span>;
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
          console.error('Failed to fetch in-progress jobs');
        }
      } catch (error) {
        console.error('Error fetching in-progress jobs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (status === 'authenticated') load();
  }, [status]);

  if (status === 'loading') return <div className="p-6">Loading...</div>;

  return (
    <div className="relative min-h-screen overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff]" />
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#004c80]">งานที่กำลังทำอยู่</h1>
          <p className="text-gray-700">รายการงานที่เริ่มทำแล้วแต่ยังไม่เสร็จสิ้น</p>
        </div>

        <div className="rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-10 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
            ) : jobs.length > 0 ? (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Job Info */}
                      <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Requester Info */}
                          <div>
                            <h3 className="font-semibold text-[#004c80] mb-2">ผู้ขอใช้</h3>
                            <p className="font-medium">{job.requester.name || '-'}</p>
                            <p className="text-sm text-gray-600">{job.requester.position || '-'}</p>
                            <p className="text-sm text-gray-500">{job.requester.email}</p>
                          </div>

                          {/* Trip Details */}
                          <div>
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
                              <span className="font-medium">วันที่เริ่ม:</span>{' '}
                              {job.startTime ? new Date(job.startTime).toLocaleString('th-TH') : '-'}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">วันที่สิ้นสุด:</span>{' '}
                              {job.endTime ? new Date(job.endTime).toLocaleString('th-TH') : '-'}
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
                              </>
                            ) : (
                              <p className="text-sm text-gray-500">ยังไม่ได้กำหนดรถ</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="flex flex-col items-end gap-3">
                        <StatusBadge status={job.status} />
                        <div className="flex gap-2">
                          <Link
                            href={`/driver/jobs/${job.id}/navigate`}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#0076c3] px-4 py-2 text-sm font-medium text-white hover:bg-[#0087de] transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            ทำงานต่อ
                          </Link>
                          <Link
                            href={`/driver/jobs/${job.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                          >
                            ดูรายละเอียด
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10">
                <div className="mx-auto max-w-md text-center">
                  <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 grid place-items-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
    </div>
  );
}

