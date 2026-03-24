import { BookingStatus } from '@prisma/client';

type Nullable<T> = T | null | undefined;

export type BookingLineData = {
  id: string;
  status: BookingStatus;
  purpose?: Nullable<string>;
  endLocation?: Nullable<string>;
  startTime?: Nullable<Date | string>;
  endTime?: Nullable<Date | string>;
  passengerCount?: Nullable<number>;
  requestForSelf?: boolean;
  travelerName?: Nullable<string>;
  travelerPosition?: Nullable<string>;
  travelerPhone?: Nullable<string>;
  requester?: {
    name?: Nullable<string>;
    position?: Nullable<string>;
    phoneNumber?: Nullable<string>;
  };
  vehicle?: {
    brand?: Nullable<string>;
    model?: Nullable<string>;
    color?: Nullable<string>;
    licensePlate?: Nullable<string>;
  } | null;
  driver?: {
    name?: Nullable<string>;
    phoneNumber?: Nullable<string>;
  } | null;
  distanceTraveledKm?: Nullable<number>;
};

export type BookingNotificationEvent = 'BOOKING_CREATED_ADMIN' | 'BOOKING_CREATED_REQUESTER' | 'BOOKING_APPROVED' | 'BOOKING_CONFIRMED' | 'BOOKING_APPROVED_DRIVER' | 'BOOKING_CONFIRMED_DRIVER' | 'BOOKING_STARTED_REQUESTER' | 'BOOKING_COMPLETED_REQUESTER';

function formatDateYYYYMMDD(dateInput?: Nullable<Date | string>) {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '-';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeHM(dateInput?: Nullable<Date | string>) {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function valueOrDash(value?: Nullable<string | number>) {
  if (value === null || value === undefined) return '-';
  const str = String(value).trim();
  return str.length > 0 ? str : '-';
}

function deriveTraveler(data: BookingLineData) {
  const requestForSelf = data.requestForSelf !== false;
  return {
    name: requestForSelf ? valueOrDash(data.requester?.name) : valueOrDash(data.travelerName),
    position: requestForSelf ? valueOrDash(data.requester?.position) : valueOrDash(data.travelerPosition),
    phone: requestForSelf ? valueOrDash(data.requester?.phoneNumber) : valueOrDash(data.travelerPhone),
  };
}

function contactSection(data: BookingLineData) {
  return (
    `📞 ข้อมูลติดต่อ:\n` +
    `┌ ผู้จอง: ${valueOrDash(data.requester?.phoneNumber)}\n` +
    `└ คนขับ: ${valueOrDash(data.driver?.phoneNumber)}\n\n`
  );
}

function vehicleText(data: BookingLineData) {
  if (!data.vehicle) return '-';
  const brand = valueOrDash(data.vehicle.brand || 'ไม่ระบุยี่ห้อ');
  const model = data.vehicle.model ? ` ${valueOrDash(data.vehicle.model)}` : '';
  const color = data.vehicle.color ? ` สี${valueOrDash(data.vehicle.color)}` : '';
  return `${brand}${model}${color} - (${valueOrDash(data.vehicle.licensePlate)})`;
}

function statusText(status: BookingStatus) {
  if (status === 'APPROVED') return '✅ อนุมัติแล้ว';
  if (status === 'CONFIRMED') return '✅ ยืนยันแล้ว';
  return status;
}

function buildAdminBookingSections(data: BookingLineData) {
  const traveler = deriveTraveler(data);
  return (
    `🔰 สรุปข้อมูลการจอง:\n` +
    `┌ เลขที่การจอง: ${valueOrDash(data.id)}\n` +
    `└ สถานะ: ${statusText(data.status)}\n\n` +
    `👥 ผู้ขอใช้รถ:\n` +
    `┌ ชื่อ: ${traveler.name}\n` +
    `├ ตำแหน่ง: ${traveler.position}\n` +
    `├ เบอร์โทรศัพท์: ${traveler.phone}\n` +
    `└ จำนวนผู้โดยสาร: ${valueOrDash(data.passengerCount)} คน\n\n` +
    `🎯 วัตถุประสงค์:\n${valueOrDash(data.purpose)}\n\n` +
    `🚗 ข้อมูลการเดินทาง:\n` +
    `┌ ขาไป:\n` +
    `├ รถที่ใช้: ${vehicleText(data)}\n` +
    `├ คนขับ: ${valueOrDash(data.driver?.name)}\n` +
    `└ ปลายทาง: ${valueOrDash(data.endLocation)}\n\n` +
    `┌ ขากลับ:\n` +
    `├ รถที่ใช้: ${vehicleText(data)}\n` +
    `├ คนขับ: ${valueOrDash(data.driver?.name)}\n` +
    `└ ปลายทาง: ${valueOrDash(data.endLocation)}\n\n` +
    `⏰ เวลา:\n` +
    `┌ วันที่เดินทาง: ${formatDateYYYYMMDD(data.startTime)}\n` +
    `├ เวลาออกเดินทาง: ${formatTimeHM(data.startTime)} น.\n` +
    `├ วันที่กลับ: ${formatDateYYYYMMDD(data.endTime)}\n` +
    `└ เวลารับกลับ: ${formatTimeHM(data.endTime)} น.\n\n`
  );
}

function buildBookingCreatedAdminMessage(data: BookingLineData) {
  return `📢 แจ้งเตือนผู้ดูแล: มีรายการจองรถใหม่\n\n${buildAdminBookingSections(data)}\n${contactSection(data)}💡 หมายเหตุ: ข้อมูลนี้ถูกส่งโดยระบบอัตโนมัติ`;
}

function buildBookingCreatedRequesterMessage(data: BookingLineData) {
  return (
    `📢 แจ้งเตือนผู้จอง: สร้างคำขอจองรถสำเร็จ\n\n` +
    `🔰 สรุปคำขอของคุณ:\n` +
    `┌ เลขที่การจอง: ${valueOrDash(data.id)}\n` +
    `├ สถานะ: ${statusText(data.status)}\n` +
    `├ ปลายทาง: ${valueOrDash(data.endLocation)}\n` +
    `├ วันที่เดินทาง: ${formatDateYYYYMMDD(data.startTime)}\n` +
    `└ เวลาออกเดินทาง: ${formatTimeHM(data.startTime)} น.\n\n` +
    `🎯 วัตถุประสงค์:\n${valueOrDash(data.purpose)}\n\n` +
    `${contactSection(data)}` +
    `🕒 ขณะนี้คำขออยู่ระหว่างรอการพิจารณาอนุมัติ\n\n` +
    `💡 หมายเหตุ: ข้อมูลนี้ถูกส่งโดยระบบอัตโนมัติ`
  );
}

function buildBookingApprovedMessage(data: BookingLineData) {
  return (
    `📢 แจ้งเตือนผู้จอง: คำขอของคุณได้รับการอนุมัติเบื้องต้น\n\n` +
    `🔰 สรุปคำขอของคุณ:\n` +
    `┌ เลขที่การจอง: ${valueOrDash(data.id)}\n` +
    `├ สถานะ: ${statusText(data.status)}\n` +
    `├ ปลายทาง: ${valueOrDash(data.endLocation)}\n` +
    `├ วันที่เดินทาง: ${formatDateYYYYMMDD(data.startTime)}\n` +
    `└ เวลาออกเดินทาง: ${formatTimeHM(data.startTime)} น.\n\n` +
    `🚗 รถที่จัดสรร: ${vehicleText(data)}\n` +
    `👤 คนขับ: ${valueOrDash(data.driver?.name)}\n\n` +
    `${contactSection(data)}` +
    `💡 หมายเหตุ: รอการยืนยันขั้นสุดท้ายจากผู้บริหาร\n\n` +
    `💡 หมายเหตุ: ข้อมูลนี้ถูกส่งโดยระบบอัตโนมัติ`
  );
}

function buildBookingConfirmedMessage(data: BookingLineData) {
  return (
    `📢 แจ้งเตือนผู้จอง: การจองรถได้รับการยืนยันขั้นสุดท้าย\n\n` +
    `🔰 สรุปคำขอของคุณ:\n` +
    `┌ เลขที่การจอง: ${valueOrDash(data.id)}\n` +
    `├ สถานะ: ${statusText(data.status)}\n` +
    `├ ปลายทาง: ${valueOrDash(data.endLocation)}\n` +
    `├ วันที่เดินทาง: ${formatDateYYYYMMDD(data.startTime)}\n` +
    `└ เวลาออกเดินทาง: ${formatTimeHM(data.startTime)} น.\n\n` +
    `🚗 รถที่ใช้: ${vehicleText(data)}\n` +
    `👤 คนขับ: ${valueOrDash(data.driver?.name)}\n\n` +
    `${contactSection(data)}` +
    `✅ สามารถเตรียมเดินทางตามกำหนดได้\n\n` +
    `💡 หมายเหตุ: ข้อมูลนี้ถูกส่งโดยระบบอัตโนมัติ`
  );
}

function buildBookingConfirmedDriverMessage(data: BookingLineData) {
  return (
    `📢 แจ้งเตือนคนขับ: ได้รับมอบหมายงานขั้นสุดท้าย\n\n` +
    `🔰 รายละเอียดงาน:\n` +
    `┌ เลขที่การจอง: ${valueOrDash(data.id)}\n` +
    `├ สถานะ: ${statusText(data.status)}\n` +
    `├ วันที่เดินทาง: ${formatDateYYYYMMDD(data.startTime)}\n` +
    `├ เวลาออกเดินทาง: ${formatTimeHM(data.startTime)} น.\n` +
    `├ ปลายทาง: ${valueOrDash(data.endLocation)}\n` +
    `└ จำนวนผู้โดยสาร: ${valueOrDash(data.passengerCount)} คน\n\n` +
    `🚗 รถที่ได้รับมอบหมาย: ${vehicleText(data)}\n` +
    `🎯 วัตถุประสงค์: ${valueOrDash(data.purpose)}\n\n` +
    `${contactSection(data)}` +
    `💡 หมายเหตุ: ข้อมูลนี้ถูกส่งโดยระบบอัตโนมัติ`
  );
}

function buildBookingApprovedDriverMessage(data: BookingLineData) {
  return (
    `📢 แจ้งเตือนคนขับ: ได้รับมอบหมายงานเบื้องต้น\n\n` +
    `🔰 รายละเอียดงาน:\n` +
    `┌ เลขที่การจอง: ${valueOrDash(data.id)}\n` +
    `├ สถานะ: ${statusText(data.status)}\n` +
    `├ วันที่เดินทาง: ${formatDateYYYYMMDD(data.startTime)}\n` +
    `├ เวลาออกเดินทาง: ${formatTimeHM(data.startTime)} น.\n` +
    `├ ปลายทาง: ${valueOrDash(data.endLocation)}\n` +
    `└ จำนวนผู้โดยสาร: ${valueOrDash(data.passengerCount)} คน\n\n` +
    `🚗 รถที่ได้รับมอบหมาย: ${vehicleText(data)}\n` +
    `🎯 วัตถุประสงค์: ${valueOrDash(data.purpose)}\n\n` +
    `${contactSection(data)}` +
    `💡 หมายเหตุ: งานนี้เป็นการมอบหมายเบื้องต้น และอาจมีการยืนยัน/ปรับเปลี่ยนขั้นสุดท้าย\n\n` +
    `💡 หมายเหตุ: ข้อมูลนี้ถูกส่งโดยระบบอัตโนมัติ`
  );
}

function buildBookingStartedRequesterMessage(data: BookingLineData) {
  return (
    `📢 แจ้งเตือนผู้รับบริการ: คนขับรับงานและเริ่มเดินทางแล้ว\n\n` +
    `🔰 สถานะการเดินทาง:\n` +
    `┌ เลขที่การจอง: ${valueOrDash(data.id)}\n` +
    `├ สถานะ: 🚗 กำลังเดินทาง\n` +
    `├ วันที่เดินทาง: ${formatDateYYYYMMDD(data.startTime)}\n` +
    `└ เวลาเริ่มงาน: ${formatTimeHM(new Date())} น.\n\n` +
    `🚗 ข้อมูลรถยนต์:\n` +
    `┌ รถที่ใช้: ${vehicleText(data)}\n` +
    `└ คนขับ: ${valueOrDash(data.driver?.name)}\n\n` +
    `${contactSection(data)}` +
    `🎯 ปลายทาง: ${valueOrDash(data.endLocation)}\n` +
    `💡 หมายเหตุ: ข้อมูลนี้ถูกส่งโดยระบบอัตโนมัติ`
  );
}

function buildBookingCompletedRequesterMessage(data: BookingLineData) {
  const distanceText = data.distanceTraveledKm !== null && data.distanceTraveledKm !== undefined
    ? `${valueOrDash(data.distanceTraveledKm)} กม.`
    : '-';

  return (
    `📢 แจ้งเตือนผู้รับบริการ: การเดินทางเสร็จสิ้นแล้ว\n\n` +
    `✅ สรุปผลการเดินทาง:\n` +
    `┌ เลขที่การจอง: ${valueOrDash(data.id)}\n` +
    `├ สถานะ: เสร็จสิ้น\n` +
    `├ วันที่เสร็จสิ้น: ${formatDateYYYYMMDD(new Date())}\n` +
    `└ เวลาเสร็จสิ้น: ${formatTimeHM(new Date())} น.\n\n` +
    `🚗 ข้อมูลรถยนต์และคนขับ:\n` +
    `┌ รถที่ใช้: ${vehicleText(data)}\n` +
    `├ คนขับ: ${valueOrDash(data.driver?.name)}\n` +
    `└ ระยะทางที่ใช้: ${distanceText}\n\n` +
    `${contactSection(data)}` +
    `📍 ปลายทาง: ${valueOrDash(data.endLocation)}\n` +
    `📝 วัตถุประสงค์: ${valueOrDash(data.purpose)}\n\n` +
    `⭐ กรุณาประเมินการเดินทางในระบบ เพื่อช่วยพัฒนาการให้บริการ\n\n` +
    `💡 หมายเหตุ: ข้อมูลนี้ถูกส่งโดยระบบอัตโนมัติ`
  );
}

// Single entry point for current and future LINE booking notifications.
export function buildBookingNotification(event: BookingNotificationEvent, data: BookingLineData) {
  switch (event) {
    case 'BOOKING_CREATED_ADMIN':
      return buildBookingCreatedAdminMessage(data);
    case 'BOOKING_CREATED_REQUESTER':
      return buildBookingCreatedRequesterMessage(data);
    case 'BOOKING_APPROVED':
      return buildBookingApprovedMessage(data);
    case 'BOOKING_CONFIRMED':
      return buildBookingConfirmedMessage(data);
    case 'BOOKING_APPROVED_DRIVER':
      return buildBookingApprovedDriverMessage(data);
    case 'BOOKING_CONFIRMED_DRIVER':
      return buildBookingConfirmedDriverMessage(data);
    case 'BOOKING_STARTED_REQUESTER':
      return buildBookingStartedRequesterMessage(data);
    case 'BOOKING_COMPLETED_REQUESTER':
      return buildBookingCompletedRequesterMessage(data);
    default:
      return buildBookingCreatedAdminMessage(data);
  }
}
