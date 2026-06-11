'use client';

import { useEffect, useMemo, useState } from 'react';
import { routeTextWrapClass } from '@/components/booking/routeTextWrap';

interface DriverFeedbackItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  driver: {
    id: string;
    name: string | null;
    email: string;
  };
  requester: {
    name: string | null;
  };
  booking: {
    id: string;
    purpose: string | null;
    endLocation: string | null;
    startTime: string | null;
    endTime: string | null;
  } | null;
}

interface DriverOption {
  id: string;
  label: string;
}

export default function DriverFeedbackManagementPage() {
  const [feedbacks, setFeedbacks] = useState<DriverFeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('all');

  useEffect(() => {
    let mounted = true;

    const fetchFeedbacks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/driver-feedback');
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || 'ไม่สามารถดึงข้อมูลข้อเสนอแนะได้');
        }
        const data: DriverFeedbackItem[] = await response.json();
        if (mounted) setFeedbacks(data);
      } catch (err: unknown) {
        if (!mounted) return;
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchFeedbacks();
    return () => {
      mounted = false;
    };
  }, []);

  const driverOptions = useMemo<DriverOption[]>(() => {
    const map = new Map<string, DriverOption>();
    for (const item of feedbacks) {
      const label = item.driver.name?.trim() || item.driver.email;
      map.set(item.driver.id, { id: item.driver.id, label });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    let result = feedbacks;

    if (selectedDriverId !== 'all') {
      result = result.filter((item) => item.driver.id === selectedDriverId);
    }

    const q = query.trim().toLowerCase();
    if (!q) return result;

    return result.filter((item) => {
      const driverName = item.driver.name || '';
      const requesterName = item.requester.name || '';
      const comment = item.comment || '';
      const purpose = item.booking?.purpose || '';
      const destination = item.booking?.endLocation || '';
      return (
        driverName.toLowerCase().includes(q) ||
        requesterName.toLowerCase().includes(q) ||
        comment.toLowerCase().includes(q) ||
        purpose.toLowerCase().includes(q) ||
        destination.toLowerCase().includes(q)
      );
    });
  }, [feedbacks, selectedDriverId, query]);

  const formatDate = (value: string) =>
    new Date(value).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Bangkok',
      hour12: false,
    });

  return (
    <div className="relative min-h-screen overflow-hidden p-4 md:p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff]" />
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#004c80]">ข้อเสนอแนะคนขับทั้งหมด</h1>
          <p className="text-gray-700">ภาพรวมข้อเสนอแนะและคะแนนจากผู้ขอใช้รถ</p>
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
            >
              <option value="all">คนขับทั้งหมด</option>
              {driverOptions.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.label}
                </option>
              ))}
            </select>
          </div>
          <div className="relative w-full md:w-96">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหา: คนขับ ผู้ให้ข้อเสนอแนะ ความเห็น หรือปลายทาง"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pr-10 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          พบ {filteredFeedbacks.length} รายการจากทั้งหมด {feedbacks.length} รายการ
        </div>

        <div className="rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
          {isLoading ? (
            <div className="py-10 text-center text-gray-500">กำลังโหลดข้อมูลข้อเสนอแนะ...</div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              เกิดข้อผิดพลาด: {error}
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#0076c3]/10 text-[#0076c3] grid place-items-center">
                ⭐
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {feedbacks.length === 0 ? 'ยังไม่มีข้อเสนอแนะคนขับ' : 'ไม่พบรายการที่ตรงกับตัวกรอง'}
              </h3>
              <p className="text-gray-500">
                {feedbacks.length === 0 ? 'ข้อเสนอแนะจะปรากฏที่หน้านี้เมื่อมีการให้คะแนนแล้ว' : 'ลองเปลี่ยนคนขับหรือคำค้นหา'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFeedbacks.map((item) => (
                <div key={item.id} className="rounded-xl border border-gray-200 p-4 transition-shadow hover:shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className={`space-y-2 min-w-0 ${routeTextWrapClass}`}>
                      <p className="text-sm text-gray-500">
                        คนขับ:{' '}
                        <span className="font-medium text-slate-800">
                          {item.driver.name || item.driver.email}
                        </span>
                      </p>
                      <p className="text-sm text-gray-500">
                        โดย: <span className="font-medium text-slate-800">{item.requester.name || '-'}</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        ปลายทาง: <span className="font-medium text-slate-800">{item.booking?.endLocation || '-'}</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        วัตถุประสงค์: <span className="font-medium text-slate-800">{item.booking?.purpose || '-'}</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        วันที่ให้ข้อเสนอแนะ: <span className="font-medium text-slate-800">{formatDate(item.createdAt)}</span>
                      </p>
                    </div>
                    <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                      {'⭐'.repeat(item.rating)} ({item.rating}/5)
                    </div>
                  </div>

                  {item.comment && (
                    <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {item.comment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
