/*
  Warnings:

  - You are about to drop the `Painting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Sculpture` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SoldPainting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SoldSculpture` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Painting" DROP CONSTRAINT "Painting_exhibitorId_fkey";

-- DropForeignKey
ALTER TABLE "Sculpture" DROP CONSTRAINT "Sculpture_exhibitorId_fkey";

-- DropForeignKey
ALTER TABLE "SoldPainting" DROP CONSTRAINT "SoldPainting_collectorId_fkey";

-- DropForeignKey
ALTER TABLE "SoldPainting" DROP CONSTRAINT "SoldPainting_paintingId_fkey";

-- DropForeignKey
ALTER TABLE "SoldSculpture" DROP CONSTRAINT "SoldSculpture_collectorId_fkey";

-- DropForeignKey
ALTER TABLE "SoldSculpture" DROP CONSTRAINT "SoldSculpture_sculptureId_fkey";

-- AlterTable
ALTER TABLE "Collector" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "isPendingExhibitor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profilePicture" TEXT;

-- AlterTable
ALTER TABLE "Exhibitor" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "profilePicture" TEXT;

-- DropTable
DROP TABLE "Painting";

-- DropTable
DROP TABLE "Sculpture";

-- DropTable
DROP TABLE "SoldPainting";

-- DropTable
DROP TABLE "SoldSculpture";

-- CreateTable
CREATE TABLE "Artwork" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "yearCreated" INTEGER,
    "style" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "imageUrl" TEXT,
    "attributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exhibitorId" TEXT,

    CONSTRAINT "Artwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoldArtwork" (
    "id" TEXT NOT NULL,
    "collectorId" TEXT,
    "artworkId" TEXT NOT NULL,
    "artworkTitle" TEXT NOT NULL,
    "salePrice" DOUBLE PRECISION NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoldArtwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "year" INTEGER,
    "proofImageUrl" TEXT,
    "proofLink" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "exhibitorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "exhibitorId" TEXT NOT NULL,
    "collectorId" TEXT NOT NULL,
    "artworkId" TEXT,
    "artworkType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Artwork" ADD CONSTRAINT "Artwork_exhibitorId_fkey" FOREIGN KEY ("exhibitorId") REFERENCES "Exhibitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoldArtwork" ADD CONSTRAINT "SoldArtwork_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoldArtwork" ADD CONSTRAINT "SoldArtwork_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_exhibitorId_fkey" FOREIGN KEY ("exhibitorId") REFERENCES "Exhibitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_exhibitorId_fkey" FOREIGN KEY ("exhibitorId") REFERENCES "Exhibitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
