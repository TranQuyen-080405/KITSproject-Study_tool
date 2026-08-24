import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("content-service HTTP app", () => {
  it("reports health", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ service: "content-service", status: "ok" });
  });

  it("validates input before using the database", async () => {
    const response = await request(app).post("/api/v1/content/lessons").send({
      name: "",
      description: "Missing name",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "name is required" });
  });
});
