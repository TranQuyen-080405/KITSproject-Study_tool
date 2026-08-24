import type { Request, Response } from "express";
import { AppError } from "../errors.js";
import { contentService } from "../services/index.js";

function pathParam(request: Request, name: string): string {
  const value = request.params[name];
  if (typeof value !== "string" || !value) throw new AppError(`${name} is required`, 400);
  return value;
}

export async function createLesson(request: Request, response: Response): Promise<void> {
  const lesson = await contentService.createLesson(request.body);
  response.status(201).json({ lesson });
}

export async function listLessons(_request: Request, response: Response): Promise<void> {
  response.json({ lessons: await contentService.listLessons() });
}

export async function getLesson(request: Request, response: Response): Promise<void> {
  response.json({ lesson: await contentService.getLesson(pathParam(request, "lessonId")) });
}

export async function addVocabulary(request: Request, response: Response): Promise<void> {
  const vocabulary = await contentService.addVocabulary(
    pathParam(request, "lessonId"),
    request.body,
  );
  response.status(201).json({ vocabulary, count: vocabulary.length });
}

export async function listVocabulary(request: Request, response: Response): Promise<void> {
  const vocabulary = await contentService.listVocabulary(pathParam(request, "lessonId"));
  response.json({ vocabulary, count: vocabulary.length });
}

export async function createQuestion(request: Request, response: Response): Promise<void> {
  const question = await contentService.createQuestion(
    pathParam(request, "lessonId"),
    request.body,
  );
  response.status(201).json({ question });
}

export async function listQuestions(request: Request, response: Response): Promise<void> {
  const questions = await contentService.listQuestions(pathParam(request, "lessonId"));
  response.json({ questions, count: questions.length });
}

export async function checkQuestion(request: Request, response: Response): Promise<void> {
  response.json(
    await contentService.checkQuestion(pathParam(request, "questionId"), request.body),
  );
}
