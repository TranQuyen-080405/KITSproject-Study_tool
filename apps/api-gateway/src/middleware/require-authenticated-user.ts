import type { NextFunction, Request, Response } from "express";
import { apiGatewayConfig } from "../config/index.js";
import { fetchService } from "../services/service-request-tracer.js";
import type { TracedRequest } from "./trace-api-call.js";

export type AuthenticatedRequest = TracedRequest & { userId?: string };

export async function requireAuthenticatedUser(request: AuthenticatedRequest, response: Response, next: NextFunction): Promise<void> {
  try {
    const upstream = await fetchService(
      "User",
      `${apiGatewayConfig.userServiceUrl}/auth/session`,
      request.apiCallTraceId,
      { headers: { authorization: request.header("authorization") ?? "" } },
    );
    if (!upstream.ok) {
      response.status(401).json({ error: "Bạn cần đăng nhập để thực hiện thao tác này." });
      return;
    }
    const { user } = await upstream.json() as { user: { userId: string } };
    request.userId = user.userId;
    next();
  } catch {
    response.status(502).json({ error: "User Service is unavailable." });
  }
}
