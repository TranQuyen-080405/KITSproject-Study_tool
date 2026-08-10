// This file scores submitted answers using Content Service as the answer owner.
import { randomUUID } from "node:crypto";
import { learningServiceConfig } from "../config/index.js";
import { publishAnswerCheckedEvents } from "../events/index.js";
import { saveStudyAttempt } from "../repositories/index.js";

type SubmittedAnswer = { questionId: string; selectedAnswerId: string };
type AnswerCheck = { questionId: string; wordId: string; wordText: string; isCorrect: boolean };

export async function scoreStudyAttempt(
  userId: string,
  lessonId: string,
  answers: SubmittedAnswer[],
) {
  const response = await fetch(
    `${learningServiceConfig.contentServiceUrl}/internal/lessons/${encodeURIComponent(lessonId)}/answer-checks`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers }) },
  );
  if (!response.ok) throw new Error("Content Service could not check the answers.");

  const { results } = (await response.json()) as { results: AnswerCheck[] };
  const correctCount = results.filter((result) => result.isCorrect).length;
  const attemptId = randomUUID();
  saveStudyAttempt({ attemptId, userId, lessonId, correctCount, totalCount: results.length });
  await publishAnswerCheckedEvents(results.map((result) => ({ eventId: randomUUID(), userId, ...result })));
  return { attemptId, correctCount, totalCount: results.length };
}
