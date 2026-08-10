// This file mounts HTTP routes exposed by the API Gateway.
import { Router } from "express";
import { authRoutes } from "./auth-routes.js";
import { dashboardRoutes } from "./dashboard-routes.js";
import { lessonRoutes } from "./lesson-routes.js";
import { studyRoutes } from "./study-routes.js";

export const router = Router();

router.use("/api/auth", authRoutes);
router.use("/api/lessons", lessonRoutes);
router.use("/api/dashboard", dashboardRoutes);
router.use("/api/study", studyRoutes);
