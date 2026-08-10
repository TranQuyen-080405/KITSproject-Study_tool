// This file defines public study routes exposed by the API Gateway.
import { Router } from "express";
import { submitStudyAttempt } from "../controllers/study-controller.js";
import { requireAuthenticatedUser } from "../middleware/require-authenticated-user.js";

export const studyRoutes = Router();
studyRoutes.post("/attempts", requireAuthenticatedUser, submitStudyAttempt);
