// This file configures the Express application for the API Gateway.
import express from "express";
import { traceApiCall } from "./middleware/trace-api-call.js";
import { debugRoutes } from "./routes/debug-routes.js";
import { router } from "./routes/index.js";

export const app = express();

app.use(express.json());
app.use(traceApiCall);
if (process.env.NODE_ENV !== "production") {
  app.get("/", (_request, response) => {
    response.redirect("/debug/api-calls");
  });
  app.use("/debug", debugRoutes);
}
app.use(router);
