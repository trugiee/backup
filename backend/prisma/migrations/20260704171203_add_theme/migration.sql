-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'light';

-- AlterTable
ALTER TABLE "Collector" ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'light';

-- AlterTable
ALTER TABLE "Exhibitor" ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'light';
