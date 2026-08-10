// This file defines lesson HTTP routes owned by the Content Service.
import { Router } from "express";
import { getLessonById, getLessons } from "../controllers/lesson-controller.js";

export const lessonRoutes = Router();

lessonRoutes.get("/", getLessons);
lessonRoutes.get("/:lessonId", getLessonById);
