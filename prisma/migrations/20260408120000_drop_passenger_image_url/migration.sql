-- Drop passenger photo URL from bookings (feature removed)
ALTER TABLE "Booking" DROP COLUMN IF EXISTS "passengerImageUrl";
