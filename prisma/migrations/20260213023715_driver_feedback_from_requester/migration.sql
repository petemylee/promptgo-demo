/*
  Warnings:

  - You are about to drop the column `adminId` on the `DriverFeedback` table. All the data in the column will be lost.
  - Added the required column `requesterId` to the `DriverFeedback` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."DriverFeedback" DROP CONSTRAINT "DriverFeedback_adminId_fkey";

-- AlterTable
ALTER TABLE "public"."DriverFeedback" DROP COLUMN "adminId",
ADD COLUMN     "requesterId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."DriverFeedback" ADD CONSTRAINT "DriverFeedback_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
