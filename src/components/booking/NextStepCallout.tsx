import { normalizeBookingStatus } from './status';

type Role = 'Requester' | 'Admin' | 'Executive' | 'Driver' | string;

type Props = {
  role: Role;
  status: string;
  hasVehicle?: boolean;
  hasDriver?: boolean;
  rejectionReason?: string | null;
};

const messageFor = (args: {
  role: Role;
  status: string;
  hasVehicle?: boolean;
  hasDriver?: boolean;
  rejectionReason?: string | null;
}): { title: string; body: string; tone: 'info' | 'success' | 'warning' | 'danger' } => {
  const s = normalizeBookingStatus(args.status) ?? args.status;
  const role = args.role;

  if (s === 'REJECTED') {
    return {
      title: 'รายการถูกปฏิเสธ',
      body: args.rejectionReason ? `เหตุผล: ${args.rejectionReason}` : 'กรุณาตรวจสอบเหตุผลและแก้ไขข้อมูลก่อนส่งใหม่',
      tone: 'danger',
    };
  }

  if (s === 'PENDING') {
    return {
      title: 'กำลังรอการพิจารณา',
      body: role === 'Requester' ? 'ระบบกำลังรอผู้ดูแลอนุมัติเบื้องต้น' : 'รายการนี้รอการอนุมัติเบื้องต้น',
      tone: 'info',
    };
  }

  if (s === 'APPROVED') {
    const missing = [args.hasVehicle ? null : 'รถ', args.hasDriver ? null : 'คนขับ'].filter(Boolean);
    const suffix = missing.length ? ` (ยังไม่ได้เลือก${missing.join('และ')})` : '';
    return {
      title: 'รอยืนยันขั้นสุดท้าย',
      body:
        role === 'Executive'
          ? `เลือก “รถ” และ “คนขับ” ให้ครบ แล้วลงลายเซ็นเพื่อยืนยัน${suffix}`
          : `รอผู้บริหารยืนยันการเดินทาง${suffix}`,
      tone: 'warning',
    };
  }

  if (s === 'CONFIRMED') {
    return {
      title: 'ยืนยันแล้ว',
      body: role === 'Driver' ? 'สามารถเริ่มงานได้เมื่อถึงเวลา' : 'ระบบพร้อมสำหรับการเริ่มเดินทาง',
      tone: 'success',
    };
  }

  if (s === 'IN_PROGRESS') {
    return {
      title: 'กำลังเดินทาง',
      body: role === 'Driver' ? 'ทำงานต่อได้จากหน้า “งานที่กำลังทำอยู่”' : 'กำลังดำเนินการเดินทางอยู่',
      tone: 'info',
    };
  }

  if (s === 'COMPLETED') {
    return {
      title: 'เสร็จสิ้น',
      body: role === 'Requester' ? 'สามารถให้ข้อเสนอแนะคนขับได้ (ถ้ายังไม่ได้ให้)' : 'รายการนี้เสร็จสิ้นแล้ว',
      tone: 'success',
    };
  }

  if (s === 'CANCELLED') {
    return { title: 'ยกเลิกแล้ว', body: 'รายการนี้ถูกยกเลิกเรียบร้อย', tone: 'warning' };
  }

  return { title: 'ตรวจสอบสถานะรายการ', body: 'กรุณาตรวจสอบรายละเอียดและขั้นตอนถัดไป', tone: 'info' };
};

export default function NextStepCallout({ role, status, hasVehicle, hasDriver, rejectionReason }: Props) {
  const msg = messageFor({ role, status, hasVehicle, hasDriver, rejectionReason });
  const tone =
    msg.tone === 'danger'
      ? 'bg-red-50 border-red-200 text-red-900'
      : msg.tone === 'warning'
        ? 'bg-amber-50 border-amber-200 text-amber-900'
        : msg.tone === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-sky-50 border-sky-200 text-sky-900';

  const bodyTone =
    msg.tone === 'danger'
      ? 'text-red-800'
      : msg.tone === 'warning'
        ? 'text-amber-800'
        : msg.tone === 'success'
          ? 'text-emerald-800'
          : 'text-sky-800';

  return (
    <div className={['rounded-2xl border p-4', tone].join(' ')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{msg.title}</div>
          <div className={['mt-1 text-sm', bodyTone].join(' ')}>{msg.body}</div>
        </div>
      </div>
    </div>
  );
}

