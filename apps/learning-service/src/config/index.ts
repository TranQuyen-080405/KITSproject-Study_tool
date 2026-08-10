// This file loads runtime configuration for the Learning Service.
export const learningServiceConfig = {
  port: Number(process.env.LEARNING_SERVICE_PORT ?? 3003),
  contentServiceUrl: process.env.CONTENT_SERVICE_URL ?? "http://localhost:3002",
  analyticsServiceUrl: process.env.ANALYTICS_SERVICE_URL ?? "http://localhost:3005",
};
