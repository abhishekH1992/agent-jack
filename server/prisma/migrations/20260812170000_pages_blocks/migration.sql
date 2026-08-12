-- CreateEnum
CREATE TYPE "PageBlockType" AS ENUM ('IMAGE', 'RICH_TEXT', 'BELT');

-- CreateEnum
CREATE TYPE "ImageLayout" AS ENUM ('SINGLE', 'COLUMN', 'SLIDER');

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isEnable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageBlock" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" "PageBlockType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnable" BOOLEAN NOT NULL DEFAULT true,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageLayout" "ImageLayout",
    "isBanner" BOOLEAN NOT NULL DEFAULT false,
    "content" TEXT,
    "beltId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- CreateIndex
CREATE INDEX "PageBlock_pageId_sortOrder_idx" ON "PageBlock"("pageId", "sortOrder");

-- AddForeignKey
ALTER TABLE "PageBlock" ADD CONSTRAINT "PageBlock_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageBlock" ADD CONSTRAINT "PageBlock_beltId_fkey" FOREIGN KEY ("beltId") REFERENCES "Belt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

