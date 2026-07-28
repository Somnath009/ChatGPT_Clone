-- AlterTable
ALTER TABLE "Conversation" ALTER COLUMN "model" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Message" ALTER COLUMN "metadata" DROP NOT NULL;
