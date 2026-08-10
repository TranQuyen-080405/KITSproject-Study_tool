// This file mounts HTTP routes exposed by the Content Service.
import { Router } from "express";
import { checkLessonAnswers } from "../controllers/lesson-controller.js";
import { lessonRoutes } from "./lesson-routes.js";

export const router = Router();

router.use("/lessons", lessonRoutes);
router.post("/internal/lessons/:lessonId/answer-checks", checkLessonAnswers);
