-- DropIndex
DROP INDEX "Country_name_key";

-- AlterTable
ALTER TABLE "City" ADD COLUMN     "nameBg" TEXT,
ALTER COLUMN "postalCode" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Country" ADD COLUMN     "nameBg" TEXT;

-- AlterTable
ALTER TABLE "State" ADD COLUMN     "nameBg" TEXT;
