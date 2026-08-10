// This file loads runtime configuration for the Content Service.
export const contentServiceConfig = {
  port: Number(process.env.CONTENT_SERVICE_PORT ?? 3002),
};
