-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "lastPasswordChange" TIMESTAMP(3),
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "promotionalEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smsNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
