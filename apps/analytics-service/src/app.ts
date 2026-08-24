// Express application for the Analytics Service.
import express from "express";
import { router } from "./routes/index.js";

export const app = express();

app.use(express.json({ limit: "256kb" }));

app.get("/health", (_request, response) => {
  response.json({ service: "analytics-service", status: "ok" });
});

// Gateway forwards /api/v1/analytics/* unchanged.
app.use("/api/v1/analytics", router);
