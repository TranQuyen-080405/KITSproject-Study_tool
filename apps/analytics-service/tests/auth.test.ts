import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { AuthError, resolveUser } from "../src/auth.js";
import { reviewRepository } from "../src/repositories/index.js";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("Analytics authentication and account isolation", () => {
  it("rejects every read/write route before calling storage without a token", async () => {
    const resolve = vi.fn(async () => "7"); const app = createApp(resolve);
    for (const path of ["dashboard", "sessions", "reviews/due", "reviews/queue", "reviews/deck"]) {
      expect((await request(app).get("/api/v1/analytics/" + path).set("x-user-id", "7")).status).toBe(401);
    }
    for (const path of ["reviews", "sessions", "sessions/submit"]) {
      expect((await request(app).post("/api/v1/analytics/" + path).send({ userId: "7" })).status).toBe(401);
    }
    expect(resolve).not.toHaveBeenCalled();
  });
  it("reads only the verified account even when query/header impersonate another user", async () => {
    const list = vi.spyOn(reviewRepository, "listSessionsByUser").mockResolvedValue([]);
    const res = await request(createApp(async () => "7")).get("/api/v1/analytics/sessions?userId=8")
      .set("Authorization", "Bearer valid").set("x-user-id", "8");
    expect(res.status).toBe(200); expect(list).toHaveBeenCalledWith("7");
  });
  it("writes only the verified owner, ignoring spoofed body and nested review owners", async () => {
    vi.spyOn(reviewRepository, "transaction").mockImplementation(async (userId, operation) => {
      expect(userId).toBe("7"); return operation(reviewRepository);
    });
    const save = vi.spyOn(reviewRepository, "save").mockImplementation(async (review) => review);
    vi.spyOn(reviewRepository, "get").mockResolvedValue(undefined);
    vi.spyOn(reviewRepository, "saveSession").mockImplementation(async (session) => session);
    vi.spyOn(reviewRepository, "getStreak").mockResolvedValue(undefined);
    vi.spyOn(reviewRepository, "saveStreak").mockImplementation(async (streak) => streak);
    const res = await request(createApp(async () => "7")).post("/api/v1/analytics/sessions/submit")
      .set("Authorization", "Bearer valid").send({ userId: "8", sessionType: "deck_study",
        totalCardsOrQuestions: 1, correctCount: 1, durationSeconds: 1,
        reviews: [{ userId: "8", cardId: "c", correct: true }] });
    expect(res.status).toBe(201); expect(res.body.session.userId).toBe("7");
    expect(save.mock.calls[0][0].userId).toBe("7");
  });
  it("rejects invalid/revoked tokens and fails closed if identity service is unavailable", async () => {
    for (const status of [401, 503]) {
      const app = createApp(async () => { throw new AuthError("denied", status); });
      expect((await request(app).get("/api/v1/analytics/sessions").set("Authorization", "Bearer invalid")).status).toBe(status);
    }
  });
  it("validates tokens against User Service and handles upstream failures", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 7 })));
    vi.stubGlobal("fetch", fetch);
    expect(await resolveUser("Bearer signed")).toBe("7");
    expect(fetch.mock.calls[0][1].headers.authorization).toBe("Bearer signed");
    fetch.mockResolvedValueOnce(new Response("", { status: 401 }));
    await expect(resolveUser("Bearer invalid")).rejects.toMatchObject({ status: 401 });
    fetch.mockRejectedValueOnce(new Error("offline"));
    await expect(resolveUser("Bearer signed")).rejects.toMatchObject({ status: 503 });
  });
});
