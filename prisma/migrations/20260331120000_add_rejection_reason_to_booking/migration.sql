-- Add rejection reason fields to Booking
ALTER TABLE "Booking"
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3);

