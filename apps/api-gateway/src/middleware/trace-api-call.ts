import type { NextFunction, Request, Response } from "express";
import {
  finishApiCall,
  startApiCall,
} from "../services/api-call-trace-store.js";

export type TracedRequest = Request & { apiCallTraceId?: string };

export function traceApiCall(
  request: TracedRequest,
  response: Response,
  next: NextFunction,
): void {
  if (!request.path.startsWith("/api/")) {
    next();
    return;
  }

  const trace = startApiCall({
    kind: "browser",
    service: "Gateway",
    method: request.method,
    path: request.originalUrl,
  });
  request.apiCallTraceId = trace.id;

  response.once("finish", () => {
    finishApiCall(trace, { status: response.statusCode });
  });
  next();
}
