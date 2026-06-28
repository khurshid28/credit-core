-- AlterTable
ALTER TABLE `document` MODIFY `type` ENUM('NOTARY', 'SCAN', 'COLLATERAL_PHOTO', 'TECH_PASSPORT', 'DIRECTOR_FINAL', 'GENERATED_PDF', 'CHAT', 'OTHER') NOT NULL;

-- CreateTable
CREATE TABLE `Message` (
    `id` VARCHAR(191) NOT NULL,
    `caseId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `text` TEXT NULL,
    `toRole` ENUM('OPERATOR', 'MODERATOR', 'DIRECTOR', 'ADMIN') NULL,
    `documentId` VARCHAR(191) NULL,
    `readBy` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Message_documentId_key`(`documentId`),
    INDEX `Message_caseId_idx`(`caseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `CreditCase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
