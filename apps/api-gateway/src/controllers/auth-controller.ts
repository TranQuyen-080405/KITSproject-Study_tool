import type { Response } from "express";
import { apiGatewayConfig } from "../config/index.js";
import type { TracedRequest } from "../middleware/trace-api-call.js";
import { fetchService } from "../services/service-request-tracer.js";

async function proxyAuth(path: string, request: TracedRequest, response: Response): Promise<void> {
  try {
    const upstream = await fetchService(
      "User",
      `${apiGatewayConfig.userServiceUrl}${path}`,
      request.apiCallTraceId,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request.body ?? {}),
      },
    );
    response.status(upstream.status).json(await upstream.json());
  } catch {
    response.status(502).json({ error: "User Service is unavailable." });
  }
}

export async function login(request: TracedRequest, response: Response): Promise<void> {
  await proxyAuth("/auth/login", request, response);
}

export async function register(request: TracedRequest, response: Response): Promise<void> {
  await proxyAuth("/auth/register", request, response);
}

export async function guestLogin(request: TracedRequest, response: Response): Promise<void> {
  await proxyAuth("/auth/guest", request, response);
}
