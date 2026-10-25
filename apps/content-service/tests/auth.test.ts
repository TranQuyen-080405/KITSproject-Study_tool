import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createContentAuth, type OwnershipStore } from "../src/auth.js";

function setup() {
  const store: OwnershipStore = {
    getFlashcardDetail: vi.fn(async (id) => id === "mine" ? { userId: "7" } : id === "other" ? { userId: "8" } : null),
    getFolderDetail: vi.fn(async (id) => ({ userId: id === "mine" ? "7" : "8" })),
    getCard: vi.fn(async () => ({ flashcardId: "other" })),
    getManagedQuestion: vi.fn(async () => ({ flashcardId: "other" })),
  };
  const app = express(); app.use(express.json());
  app.use(createContentAuth(store, async () => "7"));
  app.use((req, res) => res.json({ userId: res.locals.contentUserId, body: req.body }));
  app.use((error: { statusCode?: number; message: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => { res.status(error.statusCode ?? 500).json({ error: error.message }); });
  return app;
}
describe("mobile content ownership", () => {
  it("rejects unauthenticated content requests", async () => { expect((await request(setup()).get("/flashcards")).status).toBe(401); });
  it("sets the authenticated identity and ignores a spoofed owner", async () => {
    const res = await request(setup()).post("/flashcards").set("Authorization", "Bearer token").send({ title: "Hello", userId: "8" });
    expect(res.body).toMatchObject({ userId: "7", body: { userId: "7" } });
  });
  it.each(["/flashcards/other", "/FLASHCARDS/other", "/lessons/other", "/cards/any", "/questions/any/check", "/folders/other"])("blocks access through %s", async (path) => {
    expect((await request(setup()).get(path).set("Authorization", "Bearer token")).status).toBe(404);
  });
  it("allows reading and updating one's own deck", async () => {
    expect((await request(setup()).patch("/flashcards/mine").set("Authorization", "Bearer token").send({ title: "New title" })).status).toBe(200);
  });
  it("rejects moving an owned deck into another user's folder", async () => {
    expect((await request(setup()).patch("/flashcards/mine").set("Authorization", "Bearer token").send({ folderId: "other" })).status).toBe(404);
  });
});

// Exercise the real token resolver, rather than just the ownership test double.
afterEach(() => vi.unstubAllGlobals());
describe("content token verification", () => {
  function app() {
    const server = express();
    server.use(createContentAuth());
    server.use((_req, res) => res.json({ userId: res.locals.contentUserId }));
    server.use((error: { statusCode?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => { res.sendStatus(error.statusCode ?? 500); });
    return server;
  }
  it("uses the identity returned by User Service", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 7 }))));
    const response = await request(app()).get("/flashcards?userId=8").set("Authorization", "Bearer signed");
    expect(response.status).toBe(200); expect(response.body.userId).toBe("7");
  });
  it.each([401, 403, 500])("fails closed when User Service returns %s", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status })));
    expect((await request(app()).get("/flashcards").set("Authorization", "Bearer invalid")).status).toBe(status === 500 ? 503 : 401);
  });
  it("returns 503 when User Service cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect((await request(app()).get("/flashcards").set("Authorization", "Bearer signed")).status).toBe(503);
  });
});
