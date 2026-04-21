-- CreateEnum
CREATE TYPE "ExpresswayCertificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "expresswayCertificationNote" TEXT,
ADD COLUMN     "expresswayCertificationStatus" "ExpresswayCertificationStatus",
ADD COLUMN     "expresswayCertifiedAt" TIMESTAMP(3),
ADD COLUMN     "expresswayCertifierId" TEXT,
ADD COLUMN     "expresswayCertifierName" TEXT,
ADD COLUMN     "expresswayCertifierPosition" TEXT,
ADD COLUMN     "expresswayCertifierSignatureUrl" TEXT;

-- CreateIndex
CREATE INDEX "Booking_expresswayCertifierId_expresswayCertificationStatus_idx" ON "Booking"("expresswayCertifierId", "expresswayCertificationStatus");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_expresswayCertifierId_fkey" FOREIGN KEY ("expresswayCertifierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
