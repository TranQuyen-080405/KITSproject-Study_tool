import { Router } from "express";
import {
  addCards,
  addVocabulary,
  checkQuestion,
  createFlashcard,
  createFolder,
  createLesson,
  createQuestion,
  deleteCard,
  deleteFlashcard,
  deleteFolder,
  deleteLesson,
  deleteQuestion,
  getCard,
  getFlashcard,
  getFolder,
  getLesson,
  getManagedQuestion,
  listCards,
  listFlashcards,
  listFolders,
  listLessons,
  listManagedQuestions,
  listQuestions,
  listVocabulary,
  updateCard,
  updateFlashcard,
  updateFolder,
  updateLesson,
  updateQuestion,
} from "../controllers/index.js";

export const router = Router();

// ===================== FOLDERS =====================
router.post("/folders", createFolder);
router.get("/folders", listFolders);
router.get("/folders/:folderId", getFolder);
router.patch("/folders/:folderId", updateFolder);
router.delete("/folders/:folderId", deleteFolder);

// ===================== FLASHCARDS (DECKS) =====================
router.post("/flashcards", createFlashcard);
router.get("/flashcards", listFlashcards);
router.get("/flashcards/:flashcardId", getFlashcard);
router.patch("/flashcards/:flashcardId", updateFlashcard);
router.delete("/flashcards/:flashcardId", deleteFlashcard);

// ===================== CARDS =====================
router.post("/flashcards/:flashcardId/cards", addCards);
router.get("/flashcards/:flashcardId/cards", listCards);
router.get("/cards/:cardId", getCard);
router.patch("/cards/:cardId", updateCard);
router.delete("/cards/:cardId", deleteCard);

// ===================== PRACTICE & QUESTIONS =====================
router.post("/flashcards/:flashcardId/questions", createQuestion);
router.get("/flashcards/:flashcardId/questions", listQuestions);
router.get("/flashcards/:flashcardId/questions/managed", listManagedQuestions);

router.get("/questions/:questionId", getManagedQuestion);
router.patch("/questions/:questionId", updateQuestion);
router.delete("/questions/:questionId", deleteQuestion);
router.post("/questions/:questionId/check", checkQuestion);

// ===================== LEGACY LESSONS & VOCABULARY COMPATIBILITY =====================
router.post("/lessons", createLesson);
router.get("/lessons", listLessons);
router.get("/lessons/:lessonId", getLesson);
router.patch("/lessons/:lessonId", updateLesson);
router.delete("/lessons/:lessonId", deleteLesson);

router.post("/lessons/:lessonId/vocabularies", addVocabulary);
router.get("/lessons/:lessonId/vocabularies", listVocabulary);

router.post("/lessons/:lessonId/questions", createQuestion);
router.get("/lessons/:lessonId/questions", listQuestions);
router.get("/lessons/:lessonId/questions/managed", listManagedQuestions);
