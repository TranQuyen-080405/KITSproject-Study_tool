// This file handles study-attempt HTTP requests.
import type { Request, Response } from "express";
import { scoreStudyAttempt } from "../services/index.js";

export async function submitStudyAttempt(request: Request, response: Response): Promise<void> {
  const { userId, lessonId, answers } = request.body ?? {};
  if (typeof userId !== "string" || typeof lessonId !== "string" || !Array.isArray(answers)) {
    response.status(400).json({ error: "userId, lessonId, and answers are required." });
    return;
  }
  try {
    response.status(201).json(await scoreStudyAttempt(userId, lessonId, answers));
  } catch {
    response.status(502).json({ error: "Could not score this study attempt." });
  }
}
