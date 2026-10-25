import type { RequestHandler } from "express";

export function createGatewayAuth(userServiceUrl: string): RequestHandler {
  return async (request, response, next) => {
    // Client-supplied identity headers are never a source of authority.
    delete request.headers["x-user-id"];
    const protectedPath = /^\/api\/v1\/(content|analytics|ai|users)(\/|$)/.test(request.path);
    if (!protectedPath || (request.method === "GET" && request.path === "/api/v1/ai/health")) {
      next(); return;
    }
    const authorization = request.header("authorization");
    if (!authorization || !/^Bearer \S+$/i.test(authorization)) {
      response.status(401).json({ error: "Authentication required" }); return;
    }
    try {
      const result = await fetch(`${userServiceUrl.replace(/\/$/, "")}/api/v1/users/me`, {
        headers: { authorization }, signal: AbortSignal.timeout(10_000),
      });
      if (result.status === 401 || result.status === 403) {
        response.status(401).json({ error: "Invalid access token" }); return;
      }
      if (!result.ok) { response.status(503).json({ error: "User service unavailable" }); return; }
      const user = await result.json() as { id?: unknown };
      if (!Number.isSafeInteger(user.id) || Number(user.id) <= 0) throw new Error("Invalid identity");
      next();
    } catch { response.status(503).json({ error: "User service unavailable" }); }
  };
}
