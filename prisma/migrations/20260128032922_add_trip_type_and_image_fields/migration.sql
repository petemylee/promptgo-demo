-- CreateEnum
CREATE TYPE "public"."TripType" AS ENUM ('ONE_WAY', 'PICK_UP', 'ROUND_TRIP');

-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "executiveConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "passengerImageUrl" TEXT,
ADD COLUMN     "tripType" "public"."TripType";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "profileImageUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."Vehicle" ADD COLUMN     "vehicleImageUrl" TEXT;
