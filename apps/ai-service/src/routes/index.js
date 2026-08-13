import { Router } from "express";
import { 
  createConversationController, listConversationController, getConversationController,
  deleteConversationController
} from "../controllers/index.js";
export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});


router.post("/conversations", createConversationController);
router.get("/conversations", listConversationController);
router.get("/conversations/:id", getConversationController);
router.delete("/conversations/:id", deleteConversationController);