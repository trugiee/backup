/*
  Warnings:

  - You are about to drop the column `customerId` on the `SoldPainting` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `SoldSculpture` table. All the data in the column will be lost.
  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `collectorId` to the `SoldPainting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `collectorId` to the `SoldSculpture` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SoldPainting" DROP CONSTRAINT "SoldPainting_customerId_fkey";

-- DropForeignKey
ALTER TABLE "SoldSculpture" DROP CONSTRAINT "SoldSculpture_customerId_fkey";

-- AlterTable
ALTER TABLE "SoldPainting" DROP COLUMN "customerId",
ADD COLUMN     "collectorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SoldSculpture" DROP COLUMN "customerId",
ADD COLUMN     "collectorId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Customer";

-- CreateTable
CREATE TABLE "Collector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collector_email_key" ON "Collector"("email");

-- AddForeignKey
ALTER TABLE "SoldPainting" ADD CONSTRAINT "SoldPainting_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoldSculpture" ADD CONSTRAINT "SoldSculpture_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
