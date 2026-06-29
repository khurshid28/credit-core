-- AlterTable: per-system lending-rate bounds (client annual rate).
ALTER TABLE `AppConfig`
  ADD COLUMN `minRate` DOUBLE NOT NULL DEFAULT 0.55,
  ADD COLUMN `maxRate` DOUBLE NOT NULL DEFAULT 0.60;
