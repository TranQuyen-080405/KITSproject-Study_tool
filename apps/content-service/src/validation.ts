import { AppError } from "./errors.js";

export function assertTargetVocabulary(
  lessonId: string,
  vocabularyId: string | null,
  vocabulary: { lessonId: string } | null,
): void {
  if (vocabularyId === null) return;
  if (!vocabulary) throw new AppError("Target vocabulary not found", 404);
  if (vocabulary.lessonId !== lessonId) {
    throw new AppError("vocabularyId must belong to this lesson", 400);
  }
}
