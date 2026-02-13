'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type DriverFeedbackItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  requester: { name: string | null };
  booking: {
    id: string;
    purpose: string | null;
    endLocation: string | null;
    startTime: string | null;
    endTime: string | null;
  };
};

export default function DriverFeedbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState<DriverFeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    if (status === 'authenticated' && session?.user?.role !== 'Driver') router.replace('/');
  }, [status, session, router]);

  useEffect(() => {
    const load = async () => {
      if (status !== 'authenticated') return;
      setIsLoading(true);
      try {
        const res = await fetch('/api/driver-feedback');
        if (res.ok) {
          const data = await res.json();
          setFeedbacks(data);
        }
      } catch (error) {
        console.error('Error fetching feedback:', error);
        setFeedbacks([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [status]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (status === 'loading') return <div className="p-6">Loading...</div>;

  return (
    <div className="relative min-h-screen overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff]" />
      <div className="relative z-10 mx-auto w-full max-w-4xl">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#004c80]">Feedback ของฉัน</h1>
          <p className="text-gray-700">ข้อเสนอแนะจากผู้ขอใช้รถที่มอบให้คุณ</p>
        </div>

        <div className="rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
          {isLoading ? (
            <div className="py-10 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
          ) : feedbacks.length > 0 ? (
            <div className="space-y-4">
              {feedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-amber-50/50"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-2xl">{'⭐'.repeat(fb.rating)}</span>
                        <span className="text-sm font-medium text-amber-800">({fb.rating}/5 ดาว)</span>
                        {fb.requester?.name && (
                          <span className="text-sm text-gray-600">โดย {fb.requester.name}</span>
                        )}
                      </div>
                      {fb.comment && (
                        <p className="mt-3 text-gray-700">{fb.comment}</p>
                      )}
                      <p className="mt-2 text-xs text-gray-500">{formatDate(fb.createdAt)}</p>
                    </div>
                    <div className="text-sm text-gray-600 shrink-0">
                      <p><span className="font-medium">การจอง:</span> {fb.booking.purpose || fb.booking.endLocation || fb.booking.id.substring(0, 8)}</p>
                      {fb.booking.startTime && (
                        <p className="text-xs text-gray-500">{formatDate(fb.booking.startTime)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-100 text-amber-600 grid place-items-center text-3xl">
                ⭐
              </div>
              <h3 className="text-lg font-semibold text-gray-800">ยังไม่มี Feedback</h3>
              <p className="text-gray-500 mt-1">Feedback จากผู้ขอใช้รถจะแสดงที่นี่เมื่อมีการให้คะแนน</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
