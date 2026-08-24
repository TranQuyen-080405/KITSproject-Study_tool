import express, { type NextFunction, type Request, type Response } from "express";
import { AppError } from "./errors.js";
import { router } from "./routes/index.js";

export const app = express();

app.use(express.json({ limit: "256kb" }));

app.get("/health", (_request, response) => {
  response.json({ service: "content-service", status: "ok" });
});

app.use("/api/v1/content", router);

app.use(
  (error: unknown, _request: Request, response: Response, _next: NextFunction): void => {
    if (error instanceof AppError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    if (
      error instanceof SyntaxError &&
      "status" in error &&
      (error as SyntaxError & { status: number }).status === 400
    ) {
      response.status(400).json({ error: "Invalid JSON body" });
      return;
    }
    console.error(error);
    response.status(500).json({ error: "Internal server error" });
  },
);
