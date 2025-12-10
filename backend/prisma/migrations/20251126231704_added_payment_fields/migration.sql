/*
  Warnings:

  - Made the column `userId` on table `Payment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `orderId` VARCHAR(191) NULL,
    ADD COLUMN `squareCustomerId` VARCHAR(191) NULL,
    MODIFY `userId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
