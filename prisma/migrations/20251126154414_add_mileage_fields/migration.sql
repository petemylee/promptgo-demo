-- AlterTable
ALTER TABLE "public"."Vehicle" ADD COLUMN     "currentMileage" INTEGER;

-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "startMileage" INTEGER;
ALTER TABLE "public"."Booking" ADD COLUMN     "endMileage" INTEGER;

