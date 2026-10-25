import express from "express";
import { router } from "./routes/index.js";
import { prisma } from "./db.js";
import { createAnalyticsAuth, type ResolveUser } from "./auth.js";

export function createApp(resolveUser?: ResolveUser) {
  const app = express();
  app.use(express.json({ limit: "256kb" }));

  app.get("/health", async (_request, response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      response.json({ service: "analytics-service", status: "ok", database: "ok" });
    } catch {
      response.status(503).json({ service: "analytics-service", status: "unavailable", database: "unavailable" });
    }
  });
  app.use("/api/v1/analytics", createAnalyticsAuth(resolveUser), router);
  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof SyntaxError && "status" in error && error.status === 400) {
      response.status(400).json({ error: "Invalid JSON body" });
      return;
    }
    console.error("Analytics request failed", error instanceof Error ? error.name : "Unknown error");
    response.status(503).json({ error: "Analytics storage unavailable" });
  });

  return app;
}
export const app = createApp();
