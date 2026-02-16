-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "requestForSelf" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "travelerName" TEXT,
ADD COLUMN     "travelerPhone" TEXT,
ADD COLUMN     "travelerPosition" TEXT;
