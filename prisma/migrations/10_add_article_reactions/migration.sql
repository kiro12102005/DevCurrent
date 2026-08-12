-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "likeCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserArticleState" ADD COLUMN     "isLiked" BOOLEAN NOT NULL DEFAULT false;
