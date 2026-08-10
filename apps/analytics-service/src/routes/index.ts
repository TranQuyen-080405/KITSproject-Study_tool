import { Router } from "express";
import { getWordCorrectness, postAnswerCheckedEvent } from "../controllers/index.js";

export const router = Router();
router.get("/dashboard/word-correctness", getWordCorrectness);
router.post("/internal/events/answer-checked", postAnswerCheckedEvent);
