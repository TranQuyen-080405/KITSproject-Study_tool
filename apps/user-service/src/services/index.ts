import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { MockUserDatabase, MockUserRecord } from "../mocks/mock-user-database.js";

const dataPath = fileURLToPath(new URL("../../data/users.json", import.meta.url));
const sessions = new Map<string, MockUserRecord>();

function readDatabase(): MockUserDatabase {
  return JSON.parse(readFileSync(dataPath, "utf8")) as MockUserDatabase;
}

function writeDatabase(database: MockUserDatabase): void {
  writeFileSync(dataPath, `${JSON.stringify(database, null, 2)}\n`);
}

function passwordMatches(password: string, passwordHash: string): boolean {
  const [salt, expectedHash] = passwordHash.split(":");
  if (!salt || !expectedHash) return false;
  const actualHash = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(actualHash, "hex"), Buffer.from(expectedHash, "hex"));
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function findByUsername(username: string): MockUserRecord | undefined {
  const normalized = username.trim().toLowerCase();
  return readDatabase().userRecords.find((record) => record.username.toLowerCase() === normalized);
}

export function login(username: string, password: string) {
  const user = findByUsername(username);
  if (!user || user.userId === "guest-user" || !user.passwordHash || !passwordMatches(password, user.passwordHash)) {
    return undefined;
  }
  return createSession(user);
}

export function register(username: string, password: string): { ok: true; session: ReturnType<typeof createSession> } | { ok: false; error: string } {
  const trimmed = username.trim();
  if (!trimmed || !password) return { ok: false, error: "Username and password are required." };
  if (findByUsername(trimmed)) return { ok: false, error: "Username already exists." };

  const user: MockUserRecord = {
    userId: randomUUID(),
    username: trimmed,
    displayName: trimmed,
    passwordHash: hashPassword(password),
  };
  const database = readDatabase();
  database.userRecords.push(user);
  writeDatabase(database);
  return { ok: true, session: createSession(user) };
}

export function loginAsGuest() {
  const guest = readDatabase().userRecords.find((record) => record.userId === "guest-user");
  if (!guest) return undefined;
  return createSession(guest);
}

export function getSession(token: string) {
  const user = sessions.get(token);
  return user ? toPublicUser(user) : undefined;
}

function createSession(user: MockUserRecord) {
  const token = randomUUID();
  sessions.set(token, user);
  return { token, user: toPublicUser(user) };
}

function toPublicUser(user: MockUserRecord) {
  return { userId: user.userId, username: user.username, displayName: user.displayName };
}
