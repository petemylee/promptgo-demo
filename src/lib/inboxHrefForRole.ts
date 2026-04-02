/** หน้ารายการคำขอของผู้ใช้ตามบทบาท — หลีกเลี่ยง /requester ที่ redirect ถ้าไม่ใช่ Requester */
export function inboxHrefForUserRole(role: string | null | undefined): string {
  switch (role) {
    case 'Admin':
      return '/admin/my-bookings';
    case 'Executive':
      return '/executive/my-bookings';
    case 'Driver':
      return '/driver';
    default:
      return '/requester';
  }
}
