-- CreateEnum
CREATE TYPE "public"."UsageLogAction" AS ENUM ('PAGE_VIEW', 'API_CALL', 'AUTH', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'OTHER');

-- CreateTable
CREATE TABLE "public"."UsageLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "public"."UsageLogAction" NOT NULL DEFAULT 'OTHER',
    "method" TEXT,
    "path" TEXT NOT NULL,
    "status" INTEGER,
    "userId" TEXT,
    "role" "public"."Role",
    "ip" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "message" TEXT,
    "meta" JSONB,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsageLog_createdAt_idx" ON "public"."UsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "UsageLog_userId_createdAt_idx" ON "public"."UsageLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageLog_path_createdAt_idx" ON "public"."UsageLog"("path", "createdAt");

-- CreateIndex
CREATE INDEX "UsageLog_action_createdAt_idx" ON "public"."UsageLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."UsageLog" ADD CONSTRAINT "UsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
