import express from "express";
import { config as defaultConfig, type GatewayConfig } from "./config/index.js";
import { createRouter } from "./routes/index.js";
import { createGatewayAuth } from "./auth.js";

export function createApp(config: GatewayConfig) {
  const app = express();

  if (process.env.MOBILE_ONLY === "true") {
    app.use((req, res, next) => {
      const origin = req.header("origin");
      if (origin === "http://localhost:8081" || origin === "http://127.0.0.1:8081") {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Client-Platform");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
        res.setHeader("Vary", "Origin");
      }
      if (req.method === "OPTIONS") { res.sendStatus(204); return; }
      if (/^\/api\/v1\/(ai|analytics)(\/|$)/.test(req.path)) {
        res.status(404).json({ error: "Route not found" }); return;
      }
      next();
    });
  }

  app.get("/health", (_req, res) => {
    res.status(200).json({ service: "api-gateway", status: "ok" });
  });

  app.use(createGatewayAuth(config.services.user));
  app.use(createRouter(config.services));

  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  return app;
}

export const app = createApp(defaultConfig);
