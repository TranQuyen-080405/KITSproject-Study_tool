import { Router } from "express";
import {
  addVocabulary,
  checkQuestion,
  createLesson,
  createQuestion,
  deleteLesson,
  deleteQuestion,
  getLesson,
  getManagedQuestion,
  listLessons,
  listManagedQuestions,
  listQuestions,
  listVocabulary,
  updateLesson,
  updateQuestion,
} from "../controllers/index.js";

export const router = Router();

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

router.get("/questions/:questionId", getManagedQuestion);
router.patch("/questions/:questionId", updateQuestion);
router.delete("/questions/:questionId", deleteQuestion);
router.post("/questions/:questionId/check", checkQuestion);
