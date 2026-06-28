-- CreateTable
CREATE TABLE `Guarantor` (
    `id` VARCHAR(191) NOT NULL,
    `caseId` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `passportSeries` VARCHAR(191) NULL,
    `passportNumber` VARCHAR(191) NULL,
    `pinfl` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `relation` VARCHAR(191) NULL,

    INDEX `Guarantor_caseId_idx`(`caseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Guarantor` ADD CONSTRAINT `Guarantor_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `CreditCase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
