// This file handles dashboard-statistic HTTP requests.
import type { Request, Response } from "express";
import { applyAnswerCheckedEvent } from "../events/index.js";
import { listWordCorrectness } from "../repositories/index.js";
export async function getWordCorrectness(request: Request, response: Response): Promise<void> {
  response.json({ words: await listWordCorrectness(String(request.query.userId ?? "demo-user")) });
}

export async function postAnswerCheckedEvent(request: Request, response: Response): Promise<void> {
  const { eventId, userId, wordId, wordText, isCorrect } = request.body ?? {};
  if (typeof eventId !== "string" || typeof userId !== "string" || typeof wordId !== "string" || typeof wordText !== "string" || typeof isCorrect !== "boolean") {
    response.status(400).json({ error: "Invalid answer-checked event." });
    return;
  }
  await applyAnswerCheckedEvent({ eventId, userId, wordId, wordText, isCorrect });
  response.status(204).end();
}
