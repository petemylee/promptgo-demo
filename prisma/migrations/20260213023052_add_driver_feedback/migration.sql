-- CreateTable
CREATE TABLE "public"."DriverFeedback" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "driverId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,

    CONSTRAINT "DriverFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverFeedback_bookingId_key" ON "public"."DriverFeedback"("bookingId");

-- AddForeignKey
ALTER TABLE "public"."DriverFeedback" ADD CONSTRAINT "DriverFeedback_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DriverFeedback" ADD CONSTRAINT "DriverFeedback_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DriverFeedback" ADD CONSTRAINT "DriverFeedback_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
