'use client';

import DriverOverview from '@/components/dashboard/DriverOverview';

export default function DriverDashboardPage() {
  return (
    <div className="relative min-h-screen overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff]" />
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#004c80]">แดชบอร์ด</h1>
          <p className="text-gray-700">สรุปงาน ระยะทาง เวลา และคะแนน</p>
        </div>
        <DriverOverview />
      </div>
    </div>
  );
}

