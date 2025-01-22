/*
  Warnings:

  - You are about to drop the column `pricePerHour` on the `Service` table. All the data in the column will be lost.
  - Added the required column `price` to the `Service` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('BGN', 'EUR');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('FIXED', 'HOURLY');

-- AlterTable
ALTER TABLE "Service" DROP COLUMN "pricePerHour",
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'BGN',
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "priceType" "PriceType" NOT NULL DEFAULT 'HOURLY';
