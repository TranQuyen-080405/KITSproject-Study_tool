import express from "express";
import { config as defaultConfig, type GatewayConfig } from "./config/index.js";
import { createRouter } from "./routes/index.js";

export function createApp(config: GatewayConfig) {
  const app = express();

  app.get("/health", (_req, res) => {
    res.status(200).json({ service: "api-gateway", status: "ok" });
  });

  app.use(createRouter(config.services));

  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  return app;
}

export const app = createApp(defaultConfig);
