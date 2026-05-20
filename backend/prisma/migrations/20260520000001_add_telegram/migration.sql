-- AlterTable: add Telegram linking fields to User
ALTER TABLE "User" ADD COLUMN "telegramChatId"   TEXT;
ALTER TABLE "User" ADD COLUMN "telegramLinkCode"  TEXT;

-- AlterTable: add due-date reminder flags to Task
ALTER TABLE "Task" ADD COLUMN "reminder2DaysSent"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN "reminder1DaySent"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN "reminderTodaySent"  BOOLEAN NOT NULL DEFAULT false;
