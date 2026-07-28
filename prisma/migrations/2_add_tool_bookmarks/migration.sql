-- CreateTable
CREATE TABLE "UserToolBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserToolBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserToolBookmark_userId_idx" ON "UserToolBookmark"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserToolBookmark_userId_toolId_key" ON "UserToolBookmark"("userId", "toolId");

-- AddForeignKey
ALTER TABLE "UserToolBookmark" ADD CONSTRAINT "UserToolBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserToolBookmark" ADD CONSTRAINT "UserToolBookmark_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "AiToolPick"("id") ON DELETE CASCADE ON UPDATE CASCADE;

