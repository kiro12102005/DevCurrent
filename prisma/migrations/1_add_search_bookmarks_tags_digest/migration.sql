-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "interestTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "wantsWeeklyDigest" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserArticleState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserArticleState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserArticleState_userId_idx" ON "UserArticleState"("userId");

-- CreateIndex
CREATE INDEX "UserArticleState_articleId_idx" ON "UserArticleState"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserArticleState_userId_articleId_key" ON "UserArticleState"("userId", "articleId");

-- CreateIndex
CREATE INDEX "Article_tags_idx" ON "Article" USING GIN ("tags");

-- AddForeignKey
ALTER TABLE "UserArticleState" ADD CONSTRAINT "UserArticleState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserArticleState" ADD CONSTRAINT "UserArticleState_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

