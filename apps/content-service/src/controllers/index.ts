import type { Request, Response } from "express";
import { AppError } from "../errors.js";
import { contentService } from "../services/index.js";

function pathParam(request: Request, name: string): string {
  const value = request.params[name];
  if (typeof value !== "string" || !value) throw new AppError(`${name} is required`, 400);
  return value;
}

// ===================== FOLDER =====================

export async function createFolder(request: Request, response: Response): Promise<void> {
  const folder = await contentService.createFolder(request.body);
  response.status(201).json({ folder });
}

export async function listFolders(request: Request, response: Response): Promise<void> {
  const userId = response.locals.contentUserId;
  const folders = await contentService.listFolders(userId);
  response.json({ folders, count: folders.length });
}

export async function getFolder(request: Request, response: Response): Promise<void> {
  const folder = await contentService.getFolder(pathParam(request, "folderId"));
  response.json({ folder });
}

export async function updateFolder(request: Request, response: Response): Promise<void> {
  const folder = await contentService.updateFolder(pathParam(request, "folderId"), request.body);
  response.json({ folder });
}

export async function deleteFolder(request: Request, response: Response): Promise<void> {
  await contentService.deleteFolder(pathParam(request, "folderId"));
  response.status(204).send();
}

// ===================== FLASHCARD (DECK) =====================

export async function createFlashcard(request: Request, response: Response): Promise<void> {
  const flashcard = await contentService.createFlashcard(request.body);
  response.status(201).json({ flashcard });
}

export async function listFlashcards(request: Request, response: Response): Promise<void> {
  const folderId = typeof request.query.folderId === "string" ? request.query.folderId : undefined;
  const flashcards = await contentService.listFlashcards(folderId, response.locals.contentUserId);
  response.json({ flashcards, count: flashcards.length });
}

export async function getFlashcard(request: Request, response: Response): Promise<void> {
  const flashcard = await contentService.getFlashcard(pathParam(request, "flashcardId"));
  response.json({ flashcard });
}

export async function updateFlashcard(request: Request, response: Response): Promise<void> {
  const flashcard = await contentService.updateFlashcard(
    pathParam(request, "flashcardId"),
    request.body,
  );
  response.json({ flashcard });
}

export async function deleteFlashcard(request: Request, response: Response): Promise<void> {
  await contentService.deleteFlashcard(pathParam(request, "flashcardId"));
  response.status(204).send();
}

// ===================== CARD =====================

export async function addCards(request: Request, response: Response): Promise<void> {
  const cards = await contentService.addCards(
    pathParam(request, "flashcardId"),
    request.body,
  );
  response.status(201).json({ cards, count: cards.length });
}

export async function listCards(request: Request, response: Response): Promise<void> {
  const cards = await contentService.listCards(pathParam(request, "flashcardId"));
  response.json({ cards, count: cards.length });
}

export async function getCard(request: Request, response: Response): Promise<void> {
  const card = await contentService.getCard(pathParam(request, "cardId"));
  response.json({ card });
}

export async function updateCard(request: Request, response: Response): Promise<void> {
  const card = await contentService.updateCard(pathParam(request, "cardId"), request.body);
  response.json({ card });
}

export async function deleteCard(request: Request, response: Response): Promise<void> {
  await contentService.deleteCard(pathParam(request, "cardId"));
  response.status(204).send();
}

// ===================== QUESTION =====================

function parentIdParam(request: Request): string {
  const value = request.params.flashcardId ?? request.params.lessonId;
  const id = Array.isArray(value) ? value[0] : value;
  if (typeof id !== "string" || !id) {
    throw new AppError("flashcardId or lessonId is required", 400);
  }
  return id;
}

export async function createQuestion(request: Request, response: Response): Promise<void> {
  const parentId = parentIdParam(request);
  const question = await contentService.createQuestion(parentId, request.body);
  response.status(201).json({ question });
}

export async function listQuestions(request: Request, response: Response): Promise<void> {
  const parentId = parentIdParam(request);
  const questions = await contentService.listQuestions(parentId);
  response.json({ questions, count: questions.length });
}

export async function listManagedQuestions(request: Request, response: Response): Promise<void> {
  const parentId = parentIdParam(request);
  const questions = await contentService.listManagedQuestions(parentId);
  response.json({ questions, count: questions.length });
}

export async function getManagedQuestion(request: Request, response: Response): Promise<void> {
  const question = await contentService.getManagedQuestion(pathParam(request, "questionId"));
  response.json({ question });
}

export async function updateQuestion(request: Request, response: Response): Promise<void> {
  const question = await contentService.updateQuestion(
    pathParam(request, "questionId"),
    request.body,
  );
  response.json({ question });
}

export async function deleteQuestion(request: Request, response: Response): Promise<void> {
  await contentService.deleteQuestion(pathParam(request, "questionId"));
  response.status(204).send();
}

export async function checkQuestion(request: Request, response: Response): Promise<void> {
  response.json(
    await contentService.checkQuestion(pathParam(request, "questionId"), request.body),
  );
}

// ===================== LEGACY LESSON / VOCABULARY COMPATIBILITY =====================

export async function createLesson(request: Request, response: Response): Promise<void> {
  const flashcard = await contentService.createLesson(request.body);
  response.status(201).json({
    lesson: {
      id: flashcard.id,
      name: flashcard.title,
      description: flashcard.description ?? "",
      createdAt: flashcard.createdAt,
      updatedAt: flashcard.updatedAt,
    },
  });
}

export async function listLessons(_request: Request, response: Response): Promise<void> {
  response.json({ lessons: await contentService.listLessons(response.locals.contentUserId) });
}

export async function getLesson(request: Request, response: Response): Promise<void> {
  response.json({ lesson: await contentService.getLesson(pathParam(request, "lessonId")) });
}

export async function updateLesson(request: Request, response: Response): Promise<void> {
  response.json({
    lesson: await contentService.updateLesson(pathParam(request, "lessonId"), request.body),
  });
}

export async function deleteLesson(request: Request, response: Response): Promise<void> {
  await contentService.deleteLesson(pathParam(request, "lessonId"));
  response.status(204).send();
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
