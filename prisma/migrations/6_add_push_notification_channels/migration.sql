-- AlterTable
ALTER TABLE "User" ADD COLUMN     "wantsBreakingChangePush" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "wantsFeaturedPush" BOOLEAN NOT NULL DEFAULT true;

