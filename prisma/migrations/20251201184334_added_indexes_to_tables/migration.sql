-- DropIndex
DROP INDEX IF NOT EXISTS `BlogPost_slug_idx` ON `BlogPost`;

-- CreateIndex
CREATE INDEX `BlogPost_createdAt_idx` ON `BlogPost`(`createdAt`);

-- CreateIndex
CREATE INDEX `Lead_createdAt_idx` ON `Lead`(`createdAt`);

-- CreateIndex
CREATE INDEX `Lead_email_idx` ON `Lead`(`email`);

-- CreateIndex
CREATE INDEX `Payment_createdAt_idx` ON `Payment`(`createdAt`);

-- CreateIndex
CREATE INDEX `Payment_status_idx` ON `Payment`(`status`);

-- CreateIndex
CREATE INDEX `Payment_squareCustomerId_idx` ON `Payment`(`squareCustomerId`);

-- CreateIndex
CREATE INDEX `User_emailVerified_idx` ON `User`(`emailVerified`);

-- CreateIndex
CREATE INDEX `User_otpVerified_idx` ON `User`(`otpVerified`);

-- CreateIndex
CREATE INDEX `User_lockoutUntil_idx` ON `User`(`lockoutUntil`);

-- RenameIndex
CREATE INDEX `Payment_userId_idx` ON `Payment`(`userId`);
