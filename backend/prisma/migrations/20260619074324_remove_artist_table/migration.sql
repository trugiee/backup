/*
  Warnings:

  - You are about to drop the column `artistId` on the `Painting` table. All the data in the column will be lost.
  - You are about to drop the column `artistId` on the `Sculpture` table. All the data in the column will be lost.
  - You are about to drop the `Artist` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Painting" DROP CONSTRAINT "Painting_artistId_fkey";

-- DropForeignKey
ALTER TABLE "Sculpture" DROP CONSTRAINT "Sculpture_artistId_fkey";

-- AlterTable
ALTER TABLE "Painting" DROP COLUMN "artistId";

-- AlterTable
ALTER TABLE "Sculpture" DROP COLUMN "artistId";

-- DropTable
DROP TABLE "Artist";
