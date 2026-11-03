export type ServiceUrls = {
  user: string;
  content: string;
  analytics: string;
  ai: string;
};

export type GatewayConfig = {
  port: number;
  services: ServiceUrls;
  corsOrigins?: string[];
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  return {
    port: Number(env.PORT ?? 3000),
    corsOrigins: (env.CORS_ORIGINS ??
      "http://localhost,http://localhost:5173,http://localhost:8081,http://127.0.0.1:5173,http://127.0.0.1:8081,https://localhost,capacitor://localhost")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    services: {
      user: env.USER_SERVICE_URL ?? "http://localhost:8001",
      content: env.CONTENT_SERVICE_URL ?? "http://localhost:3001",
      analytics: env.ANALYTICS_SERVICE_URL ?? "http://localhost:3003",
      ai: env.AI_SERVICE_URL ?? "http://localhost:3004",
    },
  };
}

export const config = loadConfig();
