// src/app/driver/page.tsx
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
    IN_PROGRESS: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'In Progress' },
    COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Completed' },
    CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelled' },
    MERGED: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Merged' },
  };
  const p = map[status] || { bg: 'bg-gray-50', text: 'text-gray-700', label: status };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${p.bg} ${p.text} ring-1 ring-black/5`}>{p.label}</span>;
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
          console.error('Failed to fetch jobs');
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
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
          <h1 className="text-2xl font-bold text-[#004c80]">งานของฉัน</h1>
          <p className="text-gray-700">รายการงานที่ได้รับมอบหมาย</p>
        </div>

        <div className="rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-10 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
            ) : jobs.length > 0 ? (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b bg-[#004c80]/5">
                    <th className="text-left py-2 px-4 text-[#004c80]">หมายเลข</th>
                    <th className="text-left py-2 px-4 text-[#004c80]">ผู้จอง</th>
                    <th className="text-left py-2 px-4 text-[#004c80]">วัตถุประสงค์</th>
                    <th className="text-left py-2 px-4 text-[#004c80]">จุดเริ่มต้น</th>
                    <th className="text-left py-2 px-4 text-[#004c80]">ปลายทาง</th>
                    <th className="text-left py-2 px-4 text-[#004c80]">รถยนต์</th>
                    <th className="text-left py-2 px-4 text-[#004c80]">วันเวลา</th>
                    <th className="text-left py-2 px-4 text-[#004c80]">สถานะ</th>
                    <th className="text-left py-2 px-4 text-[#004c80]">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b hover:bg-[#0076c3]/5">
                      <td className="py-2 px-4 whitespace-nowrap font-mono text-xs">{job.id.substring(0, 8)}...</td>
                      <td className="py-2 px-4">
                        <div>
                          <div className="font-medium">{job.requester.name || job.requester.email}</div>
                          {job.requester.position && (
                            <div className="text-xs text-gray-500">{job.requester.position}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-4">{job.purpose || '-'}</td>
                      <td className="py-2 px-4">{job.startLocation || '-'}</td>
                      <td className="py-2 px-4">{job.endLocation || '-'}</td>
                      <td className="py-2 px-4">
                        {job.vehicle ? (
                          <div>
                            <div className="font-medium">{job.vehicle.licensePlate}</div>
                            <div className="text-xs text-gray-500">
                              {job.vehicle.brand} {job.vehicle.model}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2 px-4">
                        {job.startTime ? new Date(job.startTime).toLocaleString('th-TH') : '-'}
                      </td>
                      <td className="py-2 px-4">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="py-2 px-4">
                        <Link
                          href={`/driver/jobs/${job.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#0076c3] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0087de] transition"
                        >
                          ดูรายละเอียด
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

