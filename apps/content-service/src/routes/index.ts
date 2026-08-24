import { Router } from "express";
import {
  addVocabulary,
  checkQuestion,
  createLesson,
  createQuestion,
  getLesson,
  listLessons,
  listQuestions,
  listVocabulary,
} from "../controllers/index.js";

export const router = Router();

router.post("/lessons", createLesson);
router.get("/lessons", listLessons);
router.get("/lessons/:lessonId", getLesson);

router.post("/lessons/:lessonId/vocabularies", addVocabulary);
router.get("/lessons/:lessonId/vocabularies", listVocabulary);

router.post("/lessons/:lessonId/questions", createQuestion);
router.get("/lessons/:lessonId/questions", listQuestions);
router.post("/questions/:questionId/check", checkQuestion);
