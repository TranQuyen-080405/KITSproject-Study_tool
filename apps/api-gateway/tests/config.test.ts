import { afterEach, describe, expect, test, vi } from "vitest";

const ORIGINAL_ENV = process.env;

describe("loadConfig", () => {
  afterEach(() => {
    vi.resetModules();
    process.env = ORIGINAL_ENV;
  });

  test("uses host-development defaults", async () => {
    process.env = {};

    const { loadConfig } = await import("../src/config/index.js");

    expect(loadConfig()).toEqual({
      port: 3000,
      corsOrigins: [
        "http://localhost",
        "http://localhost:5173",
        "http://localhost:8081",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8081",
        "https://localhost",
        "capacitor://localhost",
      ],
      services: {
        user: "http://localhost:8001",
        content: "http://localhost:3001",
        analytics: "http://localhost:3003",
        ai: "http://localhost:3004",
      },
    });
  });

  test("uses environment overrides", async () => {
    process.env = {
      PORT: "4000",
      CORS_ORIGINS: "https://localhost, https://app.example",
      USER_SERVICE_URL: "http://user.example",
      CONTENT_SERVICE_URL: "http://content.example",
      ANALYTICS_SERVICE_URL: "http://analytics.example",
      AI_SERVICE_URL: "http://ai.example",
    };

    const { loadConfig } = await import("../src/config/index.js");

    expect(loadConfig()).toEqual({
      port: 4000,
      corsOrigins: ["https://localhost", "https://app.example"],
      services: {
        user: "http://user.example",
        content: "http://content.example",
        analytics: "http://analytics.example",
        ai: "http://ai.example",
      },
    });
  });
});
