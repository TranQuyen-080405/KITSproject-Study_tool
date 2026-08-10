// This file defines public dashboard routes exposed by the API Gateway.
import { Router } from "express";
import { getWordCorrectness } from "../controllers/dashboard-controller.js";
import { requireAuthenticatedUser } from "../middleware/require-authenticated-user.js";

export const dashboardRoutes = Router();

dashboardRoutes.get("/word-correctness", requireAuthenticatedUser, getWordCorrectness);
