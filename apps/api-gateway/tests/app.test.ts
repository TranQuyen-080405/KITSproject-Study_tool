import express from "express";
import { Server } from "node:http";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import type { GatewayConfig, ServiceUrls } from "../src/config/index.js";

type UpstreamCall = {
  method: string;
  path: string;
  authorization?: string;
  cookie?: string;
  body: string;
};

type MockUpstream = {
  url: string;
  calls: UpstreamCall[];
  close: () => Promise<void>;
};

const serviceNames = ["user", "content", "analytics", "ai"] as const;

async function startMockUpstream(status = 200): Promise<MockUpstream> {
  const calls: UpstreamCall[] = [];
  const app = express();

  app.use(express.raw({ type: "*/*" }));
  app.use((req, res) => {
    calls.push({
      method: req.method,
      path: req.originalUrl,
      authorization: req.header("authorization"),
      cookie: req.header("cookie"),
      body: Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "",
    });
    res.status(status).json({ ok: status < 400, path: req.originalUrl });
  });

  const server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("mock upstream did not bind to a TCP port");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    calls,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

function buildConfig(overrides: Partial<ServiceUrls>): GatewayConfig {
  return {
    port: 3000,
    services: {
      user: "http://127.0.0.1:1",
      content: "http://127.0.0.1:1",
      analytics: "http://127.0.0.1:1",
      ai: "http://127.0.0.1:1",
      ...overrides,
    },
  };
}

describe("createApp", () => {
  const upstreams = new Map<(typeof serviceNames)[number], MockUpstream>();

  beforeAll(async () => {
    for (const serviceName of serviceNames) {
      upstreams.set(serviceName, await startMockUpstream());
    }
  });

  afterAll(async () => {
    await Promise.all([...upstreams.values()].map((upstream) => upstream.close()));
  });

  test("GET /health returns 200", async () => {
    const response = await request(createApp(buildConfig({}))).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ service: "api-gateway", status: "ok" });
  });

  test("unknown route returns JSON 404", async () => {
    const response = await request(createApp(buildConfig({}))).get("/missing-route");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Route not found" });
  });

  test.each([
    ["/api/v1/auth/login", "user"],
    ["/api/v1/users/me", "user"],
    ["/api/v1/content/lessons", "content"],
    ["/api/v1/analytics/dashboard", "analytics"],
    ["/api/v1/ai/chat", "ai"],
  ] as const)("%s routes to %s upstream", async (path, serviceName) => {
    const upstream = upstreams.get(serviceName)!;
    const app = createApp(buildConfig({ [serviceName]: upstream.url }));

    const response = await request(app).get(path);

    expect(response.status).toBe(200);
    expect(upstream.calls.at(-1)?.path).toBe(path);
  });

  test("method and complete original path are preserved", async () => {
    const upstream = upstreams.get("user")!;
    const app = createApp(buildConfig({ user: upstream.url }));

    const response = await request(app).put("/api/v1/auth/sessions/current");

    expect(response.status).toBe(200);
    expect(upstream.calls.at(-1)).toMatchObject({
      method: "PUT",
      path: "/api/v1/auth/sessions/current",
    });
  });

  test("query string is preserved", async () => {
    const upstream = upstreams.get("content")!;
    const app = createApp(buildConfig({ content: upstream.url }));

    const response = await request(app).get("/api/v1/content/search?q=hangul&page=2");

    expect(response.status).toBe(200);
    expect(upstream.calls.at(-1)?.path).toBe("/api/v1/content/search?q=hangul&page=2");
  });

  test("Authorization and Cookie headers are preserved", async () => {
    const upstream = upstreams.get("user")!;
    const app = createApp(buildConfig({ user: upstream.url }));

    const response = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", "Bearer test-token")
      .set("Cookie", "session=abc; theme=dark");

    expect(response.status).toBe(200);
    expect(upstream.calls.at(-1)).toMatchObject({
      authorization: "Bearer test-token",
      cookie: "session=abc; theme=dark",
    });
  });

  test("JSON POST body arrives intact at mock upstream", async () => {
    const upstream = upstreams.get("user")!;
    const app = createApp(buildConfig({ user: upstream.url }));
    const body = { email: "student@example.com", password: "secret" };

    const response = await request(app).post("/api/v1/auth/login").send(body);

    expect(response.status).toBe(200);
    expect(JSON.parse(upstream.calls.at(-1)?.body ?? "")).toEqual(body);
  });

  test("upstream status is passed through unchanged", async () => {
    const upstream = await startMockUpstream(401);
    const app = createApp(buildConfig({ user: upstream.url }));

    try {
      const response = await request(app).get("/api/v1/users/me");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ ok: false, path: "/api/v1/users/me" });
    } finally {
      await upstream.close();
    }
  });

  test("unreachable upstream returns 503 JSON without crashing Gateway", async () => {
    const app = createApp(buildConfig({ analytics: "http://127.0.0.1:1" }));

    const response = await request(app).get("/api/v1/analytics/dashboard");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: "Analytics service unavailable" });
  });
});
