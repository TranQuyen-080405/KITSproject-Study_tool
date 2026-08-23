// This file will define HTTP routes exposed by the Analytics Service
import { Router } from "express";
import { getDashboard, getDueReviews, submitReview } from "../controllers/index.js";

export const router = Router();

router.post("/reviews", submitReview);
router.get("/reviews/due", getDueReviews);
router.get("/dashboard", getDashboard);
