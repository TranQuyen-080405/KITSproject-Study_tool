import { Router } from "express";
import { getSessionDetails, postGuestLogin, postLogin, postRegister } from "../controllers/index.js";

export const router = Router();
router.post("/auth/login", postLogin);
router.post("/auth/register", postRegister);
router.post("/auth/guest", postGuestLogin);
router.get("/auth/session", getSessionDetails);
