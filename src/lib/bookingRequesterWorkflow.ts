/** สถานะที่ผู้ขอยกเลิกคำขอได้ (ก่อนจบงาน) */
export const REQUESTER_CANCELLABLE_STATUSES = ['PENDING', 'APPROVED', 'CONFIRMED', 'IN_PROGRESS'] as const;

/** สถานะที่ผู้ขอแก้ไขรายละเอียดคำขอได้ (คงสถานะเดิม แจ้งเตือนผู้เกี่ยวข้อง) */
export const REQUESTER_EDITABLE_DETAIL_STATUSES = REQUESTER_CANCELLABLE_STATUSES;

export function requesterMayCancelBooking(status: string): boolean {
  return (REQUESTER_CANCELLABLE_STATUSES as readonly string[]).includes(status);
}

export function requesterMayEditBookingDetails(status: string): boolean {
  return (REQUESTER_EDITABLE_DETAIL_STATUSES as readonly string[]).includes(status);
}
