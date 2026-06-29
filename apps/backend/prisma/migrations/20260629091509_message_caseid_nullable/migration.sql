-- AlterTable
ALTER TABLE `message` MODIFY `caseId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Message_toUserId_idx` ON `Message`(`toUserId`);
