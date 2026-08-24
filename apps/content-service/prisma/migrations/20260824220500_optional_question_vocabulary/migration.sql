-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_vocabularyId_fkey";

-- AlterTable
ALTER TABLE "Question" ALTER COLUMN "vocabularyId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_vocabularyId_fkey"
FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
