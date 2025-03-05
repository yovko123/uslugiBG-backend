-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('DIRECT', 'INQUIRY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BookingStatus" ADD VALUE 'in_progress';
ALTER TYPE "BookingStatus" ADD VALUE 'no_show_customer';
ALTER TYPE "BookingStatus" ADD VALUE 'no_show_provider';
ALTER TYPE "BookingStatus" ADD VALUE 'disputed';

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "bookingType" "BookingType" NOT NULL DEFAULT 'DIRECT';
