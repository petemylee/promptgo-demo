-- ลบค่า PICK_UP: แปลงข้อมูลเดิมเป็น ONE_WAY แล้วเปลี่ยน enum เหลือ ONE_WAY | ROUND_TRIP
UPDATE "public"."Booking" SET "tripType" = 'ONE_WAY' WHERE "tripType" = 'PICK_UP';

CREATE TYPE "public"."TripType_new" AS ENUM ('ONE_WAY', 'ROUND_TRIP');

ALTER TABLE "public"."Booking" ALTER COLUMN "tripType" DROP DEFAULT;
ALTER TABLE "public"."Booking" ALTER COLUMN "tripType" TYPE "public"."TripType_new" USING ("tripType"::text::"public"."TripType_new");

DROP TYPE "public"."TripType";
ALTER TYPE "public"."TripType_new" RENAME TO "TripType";
