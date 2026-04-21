-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "adminApprovedAt" TIMESTAMP(3);

-- Best-effort backfill for bookings that already have an admin approver
UPDATE "Booking"
SET "adminApprovedAt" = "updatedAt"
WHERE "adminApproverId" IS NOT NULL
  AND "adminApprovedAt" IS NULL
  AND status IN ('APPROVED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'MERGED');
