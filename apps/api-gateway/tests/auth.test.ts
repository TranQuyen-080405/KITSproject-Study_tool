import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGatewayAuth } from "../src/auth.js";
function setup() {
  const app = express(); app.use(createGatewayAuth("http://user-service:8000"));
  app.use((req, res) => res.json({ forwarded: true, authorization: req.header("authorization"), spoof: req.header("x-user-id") }));
  return app;
}
afterEach(() => vi.unstubAllGlobals());
describe("Gateway authentication", () => {
  it.each(["content/flashcards", "analytics/dashboard", "ai/conversations", "ai/questions/generate", "users/me"])("requires authentication for %s", async (path) => {
    expect((await request(setup()).get("/api/v1/" + path).set("x-user-id", "7")).status).toBe(401);
  });
  it("keeps login and health available without a token", async () => {
    expect((await request(setup()).post("/api/v1/auth/login")).status).toBe(200);
    expect((await request(setup()).get("/api/v1/ai/health")).status).toBe(200);
  });
  it("checks the bearer token and removes untrusted identity headers before proxying", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 7 })));
    vi.stubGlobal("fetch", fetch);
    const res = await request(setup()).get("/api/v1/ai/conversations").set("Authorization", "Bearer signed").set("x-user-id", "8");
    expect(res.status).toBe(200); expect(res.body.spoof).toBeUndefined();
    expect(res.body.authorization).toBe("Bearer signed");
    expect(fetch.mock.calls[0][0]).toBe("http://user-service:8000/api/v1/users/me");
  });
  it.each([401, 403, 500])("does not proxy when the account service returns %s", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status })));
    const res = await request(setup()).get("/api/v1/content/flashcards").set("Authorization", "Bearer invalid");
    expect(res.status).toBe(status === 500 ? 503 : 401); expect(res.body.forwarded).toBeUndefined();
  });
  it("fails closed on a network failure or malformed identity", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(new Response(JSON.stringify({ id: "7" })));
    vi.stubGlobal("fetch", fetch);
    for (let i = 0; i < 2; i++) expect((await request(setup()).get("/api/v1/analytics/sessions").set("Authorization", "Bearer signed")).status).toBe(503);
  });
});
