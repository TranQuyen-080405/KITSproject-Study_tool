import type { RequestHandler } from "express";

export type ResolveUser = (authorization: string) => Promise<string>;
export class AuthError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
export const resolveUser: ResolveUser = async (authorization) => {
  let response: Response;
  try {
    response = await fetch(`${process.env.USER_SERVICE_URL ?? "http://localhost:8001"}/api/v1/users/me`, {
      headers: { authorization }, signal: AbortSignal.timeout(10_000),
    });
  } catch { throw new AuthError("User service unavailable", 503); }
  if (response.status === 401 || response.status === 403) throw new AuthError("Invalid access token", 401);
  if (!response.ok) throw new AuthError("User service unavailable", 503);
  const user = await response.json() as { id?: unknown };
  if (!Number.isSafeInteger(user.id) || Number(user.id) <= 0) throw new AuthError("Invalid user response", 503);
  return String(user.id);
};
export function createAnalyticsAuth(resolve: ResolveUser = resolveUser): RequestHandler {
  return async (request, response, next) => {
    const authorization = request.header("authorization");
    if (!authorization || !/^Bearer \S+$/i.test(authorization)) {
      response.status(401).json({ error: "Authentication required" }); return;
    }
    try {
      response.locals.analyticsUserId = await resolve(authorization);
      next();
    } catch (error) {
      response.status(error instanceof AuthError ? error.status : 503).json({
        error: error instanceof AuthError ? error.message : "User service unavailable",
      });
    }
  };
}
