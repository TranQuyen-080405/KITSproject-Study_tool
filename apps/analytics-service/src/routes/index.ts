import { Router } from "express";
import {
  getDashboard,
  getDeckReviews,
  getDueReviews,
  getReviewQueue,
  getSessions,
  submitBatchSession,
  submitReview,
  submitSession,
} from "../controllers/index.js";

export const router = Router();

router.post("/reviews", submitReview);
router.get("/reviews/due", getDueReviews);
router.get("/reviews/deck", getDeckReviews);
router.get("/reviews/queue", getReviewQueue);
router.get("/dashboard", getDashboard);
router.post("/sessions", submitSession);
router.post("/sessions/submit", submitBatchSession);
router.get("/sessions", getSessions);
