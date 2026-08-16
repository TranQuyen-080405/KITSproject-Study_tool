import { Router } from "express";
import { 
  createConversationController, listConversationsController, getConversationController,
  deleteConversationController, sendMessageController, listMessagesController
} from "../controllers/index.js";
export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});


router.post("/conversations", createConversationController);
router.get("/conversations", listConversationsController);
router.get("/conversations/:id", getConversationController);
router.delete("/conversations/:id", deleteConversationController);
router.post("/conversations/:id/messages", sendMessageController);
router.get("/conversations/:id/messages", listMessagesController);
