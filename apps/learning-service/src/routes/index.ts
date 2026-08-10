import { Router } from "express";
import { submitStudyAttempt } from "../controllers/index.js";

export const router = Router();

router.post("/study-attempts", submitStudyAttempt);
