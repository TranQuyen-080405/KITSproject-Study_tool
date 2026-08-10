import type { Request, Response } from "express";
import { getSession, login, loginAsGuest, register } from "../services/index.js";

function tokenFrom(request: Request): string | undefined {
  const authorization = request.header("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
}

export function postLogin(request: Request, response: Response): void {
  const { username, password } = request.body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    response.status(400).json({ error: "Username and password are required." });
    return;
  }
  const session = login(username, password);
  if (!session) {
    response.status(401).json({ error: "Invalid username or password." });
    return;
  }
  response.json(session);
}

export function postRegister(request: Request, response: Response): void {
  const { username, password } = request.body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    response.status(400).json({ error: "Username and password are required." });
    return;
  }
  const result = register(username, password);
  if (!result.ok) {
    response.status(result.error === "Username already exists." ? 409 : 400).json({ error: result.error });
    return;
  }
  response.status(201).json(result.session);
}

export function postGuestLogin(_request: Request, response: Response): void {
  const session = loginAsGuest();
  if (!session) {
    response.status(500).json({ error: "Guest account is not configured." });
    return;
  }
  response.json(session);
}

export function getSessionDetails(request: Request, response: Response): void {
  const token = tokenFrom(request);
  const user = token && getSession(token);
  if (!user) {
    response.status(401).json({ error: "Invalid session." });
    return;
  }
  response.json({ user });
}
