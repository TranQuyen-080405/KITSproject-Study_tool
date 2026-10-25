import { Router } from "express";
import type { RequestHandler } from "express";
import { AppError } from "../errors.js";
import { resolveContentUser } from "../auth.js";
import { deckTestStore } from "../repositories/deck-tests.js";
import { DeckTestService } from "../services/deck-tests.js";

export { resolveContentUser as resolveTestUser } from "../auth.js";

export function createDeckTestRouter(
  service = new DeckTestService(deckTestStore),
  resolveUser = resolveContentUser,
) {
  const router = Router();
  const authenticate: RequestHandler = async (request, response, next) => {
    try {
      if (response.locals.contentUserId) { next(); return; }
      const authorization = request.header("authorization");
      if (!authorization || !/^Bearer \S+$/i.test(authorization)) throw new AppError("Vui lòng đăng nhập để kiểm tra.", 401);
      response.locals.contentUserId = await resolveUser(authorization);
      next();
    } catch (error) { next(error); }
  };
  const base = "/flashcards/:flashcardId/test-sessions";
  // Do not intercept unrelated legacy content endpoints.
  router.use(base, authenticate);
  router.get(base, async (request, response) => {
    const sessions = await service.list(String(request.params.flashcardId), response.locals.contentUserId);
    response.json({ sessions });
  });
  router.post(base, async (request, response) => {
    const session = await service.start(
      String(request.params.flashcardId), response.locals.contentUserId, request.body?.sourceSessionId, request.header("authorization"),
    );
    response.status(201).json({ session });
  });
  router.get(base + "/:sessionId", async (request, response) => {
    response.json({ session: await service.get(
      String(request.params.flashcardId), String(request.params.sessionId), response.locals.contentUserId,
    ) });
  });
  function progress(session: Awaited<ReturnType<DeckTestService["get"]>>) {
    const { id, answers, correctCount, totalQuestions, scorePercentage, completedAt, version } = session;
    return { id, answers, correctCount, totalQuestions, scorePercentage, completedAt, version };
  }
  router.put(base + "/:sessionId/answers", async (request, response) => {
    response.json({ progress: progress(await service.saveAnswers(
      String(request.params.flashcardId), String(request.params.sessionId),
      response.locals.contentUserId, request.body,
    )) });
  });
  router.post(base + "/:sessionId/submit", async (request, response) => {
    response.json({ progress: progress(await service.saveAnswers(
      String(request.params.flashcardId), String(request.params.sessionId),
      response.locals.contentUserId, request.body, true,
    )) });
  });
  router.put(base + "/:sessionId/answer", async (request, response) => {
    response.json({ session: await service.answer(
      String(request.params.flashcardId), String(request.params.sessionId),
      response.locals.contentUserId, request.body,
    ) });
  });
  return router;
}
