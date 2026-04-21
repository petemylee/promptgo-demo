-- Legacy bookings: default PDF template branch uses NO_EXPRESSWAY layout; align stored data.
UPDATE "Booking" SET "expresswayOption" = 'NO_EXPRESSWAY' WHERE "expresswayOption" IS NULL;
