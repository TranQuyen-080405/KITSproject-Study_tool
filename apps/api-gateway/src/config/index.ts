export type ServiceUrls = {
  user: string;
  content: string;
  learning: string;
  analytics: string;
  ai: string;
};

export type GatewayConfig = {
  port: number;
  services: ServiceUrls;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  return {
    port: Number(env.PORT ?? 3000),
    services: {
      user: env.USER_SERVICE_URL ?? "http://localhost:8001",
      content: env.CONTENT_SERVICE_URL ?? "http://localhost:3001",
      learning: env.LEARNING_SERVICE_URL ?? "http://localhost:3002",
      analytics: env.ANALYTICS_SERVICE_URL ?? "http://localhost:3003",
      ai: env.AI_SERVICE_URL ?? "http://localhost:3004",
    },
  };
}

export const config = loadConfig();
