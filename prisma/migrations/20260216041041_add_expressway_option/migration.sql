-- CreateEnum
CREATE TYPE "public"."ExpresswayOption" AS ENUM ('EXPRESSWAY', 'NO_EXPRESSWAY');

-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "expresswayOption" "public"."ExpresswayOption";
