-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "autoCompletedAt" TIMESTAMP(3),
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancellationTime" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" INTEGER,
ADD COLUMN     "completedByCustomer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "completedByProvider" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disputeReason" TEXT,
ADD COLUMN     "disputeResolvedAt" TIMESTAMP(3),
ADD COLUMN     "disputeStatus" "DisputeStatus",
ADD COLUMN     "hasDispute" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewEligibleUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BookingStatusHistory" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "previousStatus" "BookingStatus" NOT NULL,
    "newStatus" "BookingStatus" NOT NULL,
    "changedBy" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "BookingStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingStatusHistory_bookingId_idx" ON "BookingStatusHistory"("bookingId");

-- CreateIndex
CREATE INDEX "Booking_serviceId_idx" ON "Booking"("serviceId");

-- CreateIndex
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");

-- AddForeignKey
ALTER TABLE "BookingStatusHistory" ADD CONSTRAINT "BookingStatusHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
