import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
const previous = process.env.MOBILE_ONLY;
afterEach(() => { if (previous === undefined) delete process.env.MOBILE_ONLY; else process.env.MOBILE_ONLY = previous; });
function app() {
  process.env.MOBILE_ONLY = "true";
  return createApp({ port: 3000, services: { user: "http://127.0.0.1:1", content: "http://127.0.0.1:1", ai: "http://127.0.0.1:1", analytics: "http://127.0.0.1:1" } });
}
describe("mobile-only gateway", () => {
  it("does not expose AI or Analytics routes", async () => {
    const gateway = app();
    expect((await request(gateway).get("/api/v1/ai/health")).status).toBe(404);
    expect((await request(gateway).get("/api/v1/analytics/dashboard")).status).toBe(404);
  });
  it("allows the local browser preview's authenticated preflight", async () => {
    const res = await request(app()).options("/api/v1/content/flashcards").set("Origin", "http://localhost:8081");
    expect(res.status).toBe(204); expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:8081");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });
  it("does not grant CORS access to an arbitrary origin", async () => {
    const res = await request(app()).options("/api/v1/content/flashcards").set("Origin", "https://other.example");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
