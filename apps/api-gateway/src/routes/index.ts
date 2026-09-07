import { Router, type NextFunction, type Request, type Response } from "express";
import { ServerResponse } from "node:http";
import { createProxyMiddleware } from "http-proxy-middleware";
import type { ServiceUrls } from "../config/index.js";

type RouteTarget = {
  prefixes: string[];
  service: keyof ServiceUrls;
  displayName: string;
};

const routeTargets: RouteTarget[] = [
  { prefixes: ["/api/v1/auth", "/api/v1/users"], service: "user", displayName: "User" },
  { prefixes: ["/api/v1/content"], service: "content", displayName: "Content" },
  { prefixes: ["/api/v1/analytics"], service: "analytics", displayName: "Analytics" },
  { prefixes: ["/api/v1/ai"], service: "ai", displayName: "AI" },
];

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function handleProxyError(displayName: string, res: ServerResponse): void {
  if (res.headersSent) {
    res.end();
    return;
  }

  res.writeHead(503, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: `${displayName} service unavailable` }));
}

export function createRouter(services: ServiceUrls): Router {
  const router = Router();
  const proxies = new Map(
    routeTargets.map((target) => [
      target.service,
      createProxyMiddleware<Request, Response>({
        target: services[target.service],
        changeOrigin: true,
        on: {
          error: (_error, _req, res) => {
            if (res instanceof ServerResponse) {
              handleProxyError(target.displayName, res);
              return;
            }

            res.end();
          },
        },
      }),
    ]),
  );

  router.use((req: Request, res: Response, next: NextFunction) => {
    const target = routeTargets.find((candidate) =>
      candidate.prefixes.some((prefix) => matchesPrefix(req.path, prefix)),
    );

    if (!target) {
      next();
      return;
    }

    proxies.get(target.service)!(req, res, next);
  });

  return router;
}
