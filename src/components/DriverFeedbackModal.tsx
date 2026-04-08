'use client';

import { useState } from 'react';

interface DriverFeedbackModalProps {
  bookingId: string;
  driverId: string;
  driverName: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DriverFeedbackModal({
  bookingId,
  driverId,
  driverName,
  onClose,
  onSuccess,
}: DriverFeedbackModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('กรุณาเลือกคะแนน 1-5 ดาว');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/driver-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          driverId,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-[#004c80]">ให้ข้อเสนอแนะคนขับ</h2>
          <p className="mt-1 text-sm text-gray-600">{driverName || 'คนขับ'}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">คะแนน (1-5 ดาว)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-2xl transition hover:scale-110 ${
                    star <= rating ? 'text-amber-400' : 'text-gray-300'
                  }`}
                  aria-label={`${star} ดาว`}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">{rating}/5 ดาว</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ข้อเสนอแนะเพิ่มเติม <span className="text-gray-400">(ไม่บังคับ)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
              placeholder="ใส่ความคิดเห็นเพิ่มเติม..."
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || rating < 1}
              className="px-4 py-2 rounded-lg bg-[#0076c3] text-white hover:bg-[#005b99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'กำลังส่ง...' : 'ส่งข้อเสนอแนะ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
