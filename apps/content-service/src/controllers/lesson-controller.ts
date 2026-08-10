// This controller handles HTTP requests for lesson content.
import type { Request, Response } from "express";
import {
  checkSubmittedLessonAnswers,
  getPublicLessonById,
  listPublicLessons,
  type SubmittedLessonAnswer,
} from "../services/lesson-service.js";

export function getLessons(_request: Request, response: Response): void {
  response.json({ lessons: listPublicLessons() });
}

export function getLessonById(request: Request, response: Response): void {
  const lessonId = String(request.params.lessonId ?? "");
  const lesson = getPublicLessonById(lessonId);

  if (!lesson) {
    response.status(404).json({ error: "Lesson not found." });
    return;
  }

  response.json(lesson);
}

export function checkLessonAnswers(request: Request, response: Response): void {
  const lessonId = String(request.params.lessonId ?? "");
  const answers = Array.isArray(request.body?.answers)
    ? (request.body.answers as SubmittedLessonAnswer[])
    : [];
  const results = checkSubmittedLessonAnswers(lessonId, answers);

  if (!results) {
    response.status(404).json({ error: "Lesson not found." });
    return;
  }

  response.json({ results });
}
