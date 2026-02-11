/*
  Warnings:

  - A unique constraint covering the columns `[lineUserId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "lineUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_lineUserId_key" ON "public"."User"("lineUserId");
