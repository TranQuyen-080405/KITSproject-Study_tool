import type { RequestHandler } from "express";
import { AppError } from "./errors.js";
import { contentRepository } from "./repositories/index.js";

type Owned = { userId: string | null } | null;
export type OwnershipStore = {
  getFlashcardDetail(id: string): Promise<Owned>;
  getFolderDetail(id: string): Promise<Owned>;
  getCard(id: string): Promise<{ flashcardId: string } | null>;
  getManagedQuestion(id: string): Promise<{ flashcardId: string } | null>;
};

export async function resolveContentUser(authorization: string): Promise<string> {
  let response: globalThis.Response;
  try {
    response = await fetch(`${process.env.USER_SERVICE_URL ?? "http://localhost:8001"}/api/v1/users/me`, {
      headers: { authorization }, signal: AbortSignal.timeout(10000),
    });
  } catch { throw new AppError("User service unavailable", 503); }
  if (response.status === 401 || response.status === 403) throw new AppError("Please sign in again", 401);
  if (!response.ok) throw new AppError("User service unavailable", 503);
  try {
    const user = await response.json() as { id?: unknown };
    if (!Number.isSafeInteger(user.id) || Number(user.id) <= 0) throw new Error("Invalid identity");
    return String(user.id);
  } catch { throw new AppError("Invalid user response", 503); }
}

export function createContentAuth(
  store: OwnershipStore = contentRepository,
  resolveUser = resolveContentUser,
): RequestHandler {
  return async (request, response, next) => {
    try {
      const authorization = request.header("authorization");
      if (!authorization || !/^Bearer \S+$/i.test(authorization)) throw new AppError("Authentication required", 401);
      const userId = await resolveUser(authorization);
      response.locals.contentUserId = userId;
      async function own(record: Promise<Owned>) {
        const entity = await record;
        if (!entity || entity.userId !== userId) throw new AppError("Content not found", 404);
      }
      const parts = request.path.split("/").filter(Boolean).map(decodeURIComponent);
      const [rawResource, resourceId] = parts;
      const resource = rawResource?.toLowerCase();
      if (resourceId) {
        if (resource === "flashcards" || resource === "lessons") await own(store.getFlashcardDetail(resourceId));
        if (resource === "folders") await own(store.getFolderDetail(resourceId));
        if (resource === "cards" || resource === "questions") {
          const item = resource === "cards" ? await store.getCard(resourceId) : await store.getManagedQuestion(resourceId);
          if (!item) throw new AppError("Content not found", 404);
          await own(store.getFlashcardDetail(item.flashcardId));
        }
      }
      if (request.query.folderId && typeof request.query.folderId === "string") await own(store.getFolderDetail(request.query.folderId));
      if (request.body && typeof request.body === "object" && !Array.isArray(request.body)) {
        if (request.body.folderId && typeof request.body.folderId === "string") await own(store.getFolderDetail(request.body.folderId));
        // Ownership always comes from the verified account, never request JSON.
        request.body.userId = userId;
      }
      next();
    } catch (error) { next(error); }
  };
}
