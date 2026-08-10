// This file applies temporary AnswerChecked events sent by Learning Service.
import { recordAnswer } from "../repositories/index.js";

// Event IDs are stored with the records so idempotency also survives a restart.

export async function applyAnswerCheckedEvent(event: {
  eventId: string; userId: string; wordId: string; wordText: string; isCorrect: boolean;
}): Promise<void> {
  await recordAnswer(event.eventId, event.userId, event.wordId, event.wordText, event.isCorrect);
}
