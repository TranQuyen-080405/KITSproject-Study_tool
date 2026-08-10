// This controller proxies dashboard statistics from Analytics Service.
import type { Response } from "express";
import { apiGatewayConfig } from "../config/index.js";
import type { AuthenticatedRequest } from "../middleware/require-authenticated-user.js";
import { fetchService } from "../services/service-request-tracer.js";

export async function getWordCorrectness(request: AuthenticatedRequest, response: Response): Promise<void> {
  const userId = request.userId;
  if (!userId) {
    response.status(401).json({ error: "Bạn cần đăng nhập để xem Dashboard." });
    return;
  }

  try {
    const analyticsResponse = await fetchService(
      "Analytics",
      `${apiGatewayConfig.analyticsServiceUrl}/dashboard/word-correctness?userId=${encodeURIComponent(userId)}`,
      request.apiCallTraceId,
    );
    const body = await analyticsResponse.json();
    response.status(analyticsResponse.status).json(body);
  } catch {
    response.status(502).json({ error: "Analytics Service is unavailable." });
  }
}
