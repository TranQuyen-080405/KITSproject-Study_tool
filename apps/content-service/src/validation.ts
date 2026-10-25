import { AppError } from "./errors.js";

export function assertTargetCard(
  flashcardId: string,
  cardId: string | null,
  card: { flashcardId: string } | null,
): void {
  if (cardId === null) return;
  if (!card) throw new AppError("Target card not found", 404);
  if (card.flashcardId !== flashcardId) {
    throw new AppError("cardId must belong to this flashcard deck", 400);
  }
}

// Backward compatibility alias
export function assertTargetVocabulary(
  lessonId: string,
  vocabularyId: string | null,
  vocabulary: { lessonId?: string; flashcardId?: string } | null,
): void {
  if (vocabularyId === null) return;
  if (!vocabulary) throw new AppError("Target vocabulary not found", 404);
  const parentId = vocabulary.lessonId ?? vocabulary.flashcardId;
  if (parentId !== lessonId) {
    throw new AppError("vocabularyId must belong to this lesson", 400);
  }
}
