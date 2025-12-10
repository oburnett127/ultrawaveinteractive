/*
  Warnings:

  - You are about to drop the column `image` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `otpVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `VerificationToken` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `hashedPassword` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `Account` DROP FOREIGN KEY `Account_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Session` DROP FOREIGN KEY `Session_userId_fkey`;

-- DropIndex
DROP INDEX `Account_userId_fkey` ON `Account`;

-- DropIndex
DROP INDEX `Session_userId_fkey` ON `Session`;

-- AlterTable
ALTER TABLE `Account` MODIFY `refresh_token` VARCHAR(191) NULL,
    MODIFY `access_token` VARCHAR(191) NULL,
    MODIFY `id_token` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `image`,
    DROP COLUMN `otpVerified`,
    DROP COLUMN `refreshToken`,
    ADD COLUMN `hashedPassword` VARCHAR(191) NOT NULL,
    MODIFY `email` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `VerificationToken`;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
