-- DropForeignKey
ALTER TABLE `BlogPost` DROP FOREIGN KEY `BlogPost_authorId_fkey`;

-- DropIndex
DROP INDEX `BlogPost_authorId_fkey` ON `BlogPost`;
