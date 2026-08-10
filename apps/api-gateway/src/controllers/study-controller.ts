// This controller proxies study-attempt submissions to Learning Service.
import type { Response } from "express";
import { apiGatewayConfig } from "../config/index.js";
import type { AuthenticatedRequest } from "../middleware/require-authenticated-user.js";
import { fetchService } from "../services/service-request-tracer.js";

export async function submitStudyAttempt(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!request.userId) {
    response.status(401).json({ error: "Bạn cần đăng nhập để lưu kết quả." });
    return;
  }
  try {
    const learningResponse = await fetchService(
      "Learning",
      `${apiGatewayConfig.learningServiceUrl}/study-attempts`,
      request.apiCallTraceId,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...request.body, userId: request.userId }),
      },
    );
    response.status(learningResponse.status).json(await learningResponse.json());
  } catch {
    response.status(502).json({ error: "Learning Service is unavailable." });
  }
}
