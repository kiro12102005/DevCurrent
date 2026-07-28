-- AlterTable
ALTER TABLE "User" ADD COLUMN     "publicNickname" TEXT,
ADD COLUMN     "shareSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_shareSlug_key" ON "User"("shareSlug");

