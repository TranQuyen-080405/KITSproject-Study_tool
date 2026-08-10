// This file loads runtime configuration for the API Gateway.
export const apiGatewayConfig = {
  port: Number(process.env.API_GATEWAY_PORT ?? 3000),
  contentServiceUrl: process.env.CONTENT_SERVICE_URL ?? "http://localhost:3002",
  learningServiceUrl: process.env.LEARNING_SERVICE_URL ?? "http://localhost:3003",
  analyticsServiceUrl: process.env.ANALYTICS_SERVICE_URL ?? "http://localhost:3005",
  userServiceUrl: process.env.USER_SERVICE_URL ?? "http://localhost:3001",
  contentServiceTimeoutMs: Number(process.env.CONTENT_SERVICE_TIMEOUT_MS ?? 3000),
};
