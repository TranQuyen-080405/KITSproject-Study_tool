// This file defines public lesson routes exposed by the API Gateway.
import { Router } from "express";
import { getLessonById, getLessons } from "../controllers/lesson-controller.js";

export const lessonRoutes = Router();

lessonRoutes.get("/", getLessons);
lessonRoutes.get("/:lessonId", getLessonById);
