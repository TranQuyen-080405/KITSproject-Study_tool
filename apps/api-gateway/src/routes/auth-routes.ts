import { Router } from "express";
import { guestLogin, login, register } from "../controllers/auth-controller.js";

export const authRoutes = Router();
authRoutes.post("/login", login);
authRoutes.post("/register", register);
authRoutes.post("/guest", guestLogin);
