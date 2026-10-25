import express from "express";
import request from "supertest";
import { describe, expect, it, vi, afterEach } from "vitest";
import { DeckTestService, generateTestQuestion, generateTestQuestions, type TestSession, type TestStore, type TestCard } from "../src/services/deck-tests.js";
import { createDeckTestRouter } from "../src/routes/deck-tests.js";

function setup() {
  let sequence = 0;
  const cards = [
    { id: "card-a", front: "사과", back: "táo" },
    { id: "card-b", front: "물", back: "nước" },
  ];
  const deck = { id: "deck", title: "Korean", userId: "7", cards };
  const sessions = new Map<string, TestSession>();
  const store: TestStore = {
    deck: vi.fn(async (id) => id === "deck" ? deck : null),
    list: async (id, userId) => [...sessions.values()].filter((s) => s.flashcardId === id && s.userId === userId)
      .map(({ questions: _q, answers: _a, ...summary }) => structuredClone(summary)),
    get: async (id, deckId, userId) => {
      const session = sessions.get(id);
      return session?.flashcardId === deckId && session.userId === userId ? structuredClone(session) : null;
    },
    create: vi.fn(async (data) => {
      const session: TestSession = {
        ...structuredClone(data), id: `session-${++sequence}`, correctCount: 0, scorePercentage: 0,
        version: 0, createdAt: new Date(), completedAt: null,
      };
      sessions.set(session.id, session);
      return structuredClone(session);
    }),
    saveAnswer: vi.fn(async (previous: TestSession, answers: Array<number | null>, completedAt: Date | null) => {
      const current = sessions.get(previous.id)!;
      if (current.version !== previous.version) return null;
      const correctCount = answers.filter((a, i) => a === current.questions[i].correctOptionIndex).length;
      const updated = {
        ...current, answers, completedAt, correctCount,
        scorePercentage: Math.round(correctCount / current.totalQuestions * 100), version: current.version + 1,
      };
      sessions.set(current.id, structuredClone(updated));
      return structuredClone(updated);
    }),
  };
  const generate = vi.fn(async (cards: TestCard[]) => cards.map((card) => ({
    id: `q-${card.id}`, cardId: card.id, word: card.front, translation: card.back,
    prompt: `Nghĩa của ${card.front}?`, options: ["a", "b", "c", "d"],
    correctOptionIndex: card.id === "card-a" ? 0 : 2, explanation: "Giải thích",
  })));
  const service = new DeckTestService(store, generate);
  const app = express();
  app.use(express.json());
  app.use("/api/v1/content", createDeckTestRouter(service, async () => "7"));
  app.use((error: { statusCode?: number; message: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error.statusCode ?? 500).json({ error: error.message });
  });
  return { service, store, generate, cards, sessions, app, deck };
}
const base = "/api/v1/content/flashcards/deck/test-sessions";

describe("persistent deck tests", () => {
  it("creates exactly one question per card and persists the full question snapshots", async () => {
    const { service, store, generate } = setup();
    const session = await service.start("deck", "7");
    expect(generate).toHaveBeenCalledTimes(1);
    expect(session.questions.map((q) => q.cardId)).toEqual(["card-a", "card-b"]);
    expect(session.answers).toEqual([null, null]);
    expect(await store.get(session.id, "deck", "7")).toEqual(session);
    expect((await service.list("deck", "7"))[0]).not.toHaveProperty("questions");
  });

  it("does not save a partial test when AI fails for one of the words", async () => {
    const { service, store, generate } = setup();
    generate.mockRejectedValueOnce(new Error("AI down"));
    await expect(service.start("deck", "7")).rejects.toThrow("AI down");
    expect(store.create).not.toHaveBeenCalled();
  });

  it("rejects empty decks before invoking AI", async () => {
    const { service, cards, generate } = setup();
    cards.splice(0);
    await expect(service.start("deck", "7")).rejects.toMatchObject({ statusCode: 400 });
    expect(generate).not.toHaveBeenCalled();
  });

  it("saves answers, resumes progress, calculates score and completes only on the last answer", async () => {
    const { service } = setup();
    const session = await service.start("deck", "7");
    const first = await service.answer("deck", session.id, "7", { questionId: "q-card-a", selectedOptionIndex: 0 });
    expect(first.answers).toEqual([0, null]);
    expect(first.completedAt).toBeNull();
    expect((await service.get("deck", session.id, "7")).answers).toEqual([0, null]);
    const completed = await service.answer("deck", session.id, "7", { questionId: "q-card-b", selectedOptionIndex: 1 });
    expect(completed.correctCount).toBe(1);
    expect(completed.scorePercentage).toBe(50);
    expect(completed.completedAt).toBeInstanceOf(Date);
  });

  it("retries the exact saved questions with fresh answers and a new ID, without invoking AI", async () => {
    const { service, generate, cards } = setup();
    const original = await service.start("deck", "7");
    await service.answer("deck", original.id, "7", { questionId: "q-card-a", selectedOptionIndex: 0 });
    const completed = await service.answer("deck", original.id, "7", { questionId: "q-card-b", selectedOptionIndex: 2 });
    generate.mockClear();
    cards.splice(0); // Deleted/edited vocabulary cannot alter a historical test.
    const retry = await service.start("deck", "7", original.id);
    expect(generate).not.toHaveBeenCalled();
    expect(retry.id).not.toBe(original.id);
    expect(retry.sourceSessionId).toBe(original.id);
    expect(retry.questions).toEqual(completed.questions);
    expect(retry.answers).toEqual([null, null]);
    expect(retry.correctCount).toBe(0);
    expect(retry.completedAt).toBeNull();
    expect((await service.get("deck", original.id, "7")).answers).toEqual([0, 2]);
  });

  it("makes answer retries idempotent and refuses changing saved answers, invalid choices or skipped questions", async () => {
    const { service } = setup();
    const session = await service.start("deck", "7");
    await expect(service.answer("deck", session.id, "7", { questionId: "q-card-b", selectedOptionIndex: 1 })).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.answer("deck", session.id, "7", { questionId: "q-card-a", selectedOptionIndex: 4 })).rejects.toMatchObject({ statusCode: 400 });
    const answer = { questionId: "q-card-a", selectedOptionIndex: 0 };
    const first = await service.answer("deck", session.id, "7", answer);
    expect(await service.answer("deck", session.id, "7", answer)).toEqual(first);
    await expect(service.answer("deck", session.id, "7", { ...answer, selectedOptionIndex: 1 })).rejects.toMatchObject({ statusCode: 409 });
    await expect(service.start("deck", "7", session.id)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("isolates attempts by deck and authenticated user", async () => {
    const { service, deck } = setup();
    const original = await service.start("deck", "7");
    await expect(service.get("deck", original.id, "8")).rejects.toMatchObject({ statusCode: 404 });
    deck.userId = "8";
    await expect(service.get("deck", original.id, "8")).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.get("other-deck", original.id, "7")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns a conflict on stale concurrent updates instead of overwriting another answer", async () => {
    const { service, store } = setup();
    const session = await service.start("deck", "7");
    vi.mocked(store.saveAnswer).mockResolvedValueOnce(null);
    await expect(service.answer("deck", session.id, "7", { questionId: "q-card-a", selectedOptionIndex: 0 })).rejects.toMatchObject({ statusCode: 409 });
  });

  it("requires authentication and saves the resolved user, ignoring userId from the browser", async () => {
    const { app } = setup();
    expect((await request(app).get(base)).status).toBe(401);
    expect((await request(app).post(base).send({})).status).toBe(401);
    const created = await request(app).post(base).set("Authorization", "Bearer token").send({ userId: "8" });
    expect(created.status).toBe(201);
    expect(created.body.session.userId).toBe("7");
    const list = await request(app).get(base).set("Authorization", "Bearer token");
    expect(list.status).toBe(200);
    expect(list.body.sessions).toHaveLength(1);
    const detail = await request(app).get(`${base}/${created.body.session.id}`).set("Authorization", "Bearer token");
    expect(detail.body.session.questions).toHaveLength(2);
    const answer = await request(app).put(`${base}/${created.body.session.id}/answer`)
      .set("Authorization", "Bearer token").send({ questionId: "q-card-a", selectedOptionIndex: 0 });
    expect(answer.status).toBe(200);
    expect(answer.body.session.answers).toEqual([0, null]);
  });
});

afterEach(() => vi.unstubAllGlobals());
describe("AI question boundary", () => {
  it("sends exactly one target word with its identity and rejects malformed AI results", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      questions: [{ prompt: "Meaning?", options: ["a", "b", "c", "d"], correct_option_index: 2 }],
    })));
    vi.stubGlobal("fetch", fetchMock);
    const question = await generateTestQuestion({ id: "card", front: "물", back: "nước" }, "Deck", "Bearer signed");
    expect(question.cardId).toBe("card");
    expect(question.correctOptionIndex).toBe(2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      words: [{ word: "물", meaning: "nước", vocabulary_id: "card" }], question_count: 1,
    });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      questions: [{ prompt: "Bad", options: ["a"], correct_option_index: 0 }],
    })));
    await expect(generateTestQuestion({ id: "card", front: "물", back: "nước" }, "Deck")).rejects.toMatchObject({ statusCode: 502 });
  });
});

describe("batched test answers", () => {
  it("autosaves a whole batch without completing; explicit submission calculates the final score", async () => {
    const { service } = setup();
    const session = await service.start("deck", "7");
    const saved = await service.saveAnswers("deck", session.id, "7", { answers: [0, 1], correctCount: 99, scorePercentage: 100 });
    expect(saved.answers).toEqual([0, 1]);
    expect(saved.correctCount).toBe(1);
    expect(saved.scorePercentage).toBe(50);
    expect(saved.completedAt).toBeNull();
    const submitted = await service.saveAnswers("deck", session.id, "7", { answers: [0, 1] }, true);
    expect(submitted.completedAt).toBeInstanceOf(Date);
    expect(submitted.scorePercentage).toBe(50);
    expect((await service.get("deck", session.id, "7")).answers).toEqual([0, 1]);
  });
  it("does not erase newer progress when an older autosave is retried", async () => {
    const { service, store } = setup();
    const session = await service.start("deck", "7");
    const saved = await service.saveAnswers("deck", session.id, "7", { answers: [0, 2] });
    const retried = await service.saveAnswers("deck", session.id, "7", { answers: [0, null] });
    expect(retried.answers).toEqual([0, 2]);
    expect(retried.version).toBe(saved.version);
    expect(store.saveAnswer).toHaveBeenCalledTimes(1);
  });
  it("validates batch length, indices, gaps, completeness and immutable choices", async () => {
    const { service } = setup();
    const session = await service.start("deck", "7");
    for (const answers of [[0], [null, 0], [0, 4], [0, 0.5], [0, "1"]]) {
      await expect(service.saveAnswers("deck", session.id, "7", { answers })).rejects.toMatchObject({ statusCode: 400 });
    }
    await expect(service.saveAnswers("deck", session.id, "7", { answers: [0, null] }, true)).rejects.toMatchObject({ statusCode: 400 });
    await service.saveAnswers("deck", session.id, "7", { answers: [0, null] });
    await expect(service.saveAnswers("deck", session.id, "7", { answers: [1, 2] })).rejects.toMatchObject({ statusCode: 409 });
  });
  it("treats retrying a final submission as idempotent and prevents changing completed answers", async () => {
    const { service, store } = setup();
    const session = await service.start("deck", "7");
    const completed = await service.saveAnswers("deck", session.id, "7", { answers: [0, 2] }, true);
    const retry = await service.saveAnswers("deck", session.id, "7", { answers: [0, 2] }, true);
    expect(retry).toEqual(completed);
    expect(store.saveAnswer).toHaveBeenCalledTimes(1);
    await expect(service.saveAnswers("deck", session.id, "7", { answers: [0, 1] }, true)).rejects.toMatchObject({ statusCode: 409 });
  });
  it("returns compact progress from batch/submit endpoints and enforces authentication", async () => {
    const { app } = setup();
    expect((await request(app).put(base + "/any/answers").send({ answers: [0, null] })).status).toBe(401);
    expect((await request(app).post(base + "/any/submit").send({ answers: [0, 1] })).status).toBe(401);
    const created = await request(app).post(base).set("Authorization", "Bearer token").send({});
    const path = base + "/" + created.body.session.id;
    const partial = await request(app).put(path + "/answers").set("Authorization", "Bearer token").send({ answers: [0, null] });
    expect(partial.status).toBe(200);
    expect(partial.body.progress.answers).toEqual([0, null]);
    expect(partial.body.progress).not.toHaveProperty("questions");
    expect(partial.body.progress.completedAt).toBeNull();
    const submitted = await request(app).post(path + "/submit").set("Authorization", "Bearer token").send({ answers: [0, 2] });
    expect(submitted.status).toBe(200);
    expect(submitted.body.progress.scorePercentage).toBe(100);
    expect(submitted.body.progress.completedAt).toBeTruthy();
    expect(submitted.body.progress).not.toHaveProperty("questions");
  });
});

describe("deck test authentication forwarding", () => {
  it("forwards the caller token through the start route into generation", async () => {
    const { app, generate } = setup();
    const result = await request(app).post(base).set("Authorization", "Bearer caller").send({});
    expect(result.status).toBe(201);
    expect(generate).toHaveBeenCalledWith(expect.any(Array), "Korean", "Bearer caller");
  });
});

describe("batched AI question generation", () => {
  function generated(vocabulary_id: string) {
    return { vocabulary_id, prompt: "Meaning of " + vocabulary_id, options: ["a", "b", "c", "d"], correct_option_index: 1 };
  }
  it("sends one request for multiple cards and maps reordered duplicate words by card ID", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ questions: [generated("b"), generated("a")] })));
    vi.stubGlobal("fetch", fetchMock);
    const result = await generateTestQuestions([
      { id: "a", front: "말", back: "horse" }, { id: "b", front: "말", back: "speech" },
    ], "Deck", "Bearer signed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ question_count: 2, one_per_word: true });
    expect(result.map((question) => [question.cardId, question.translation])).toEqual([["a", "horse"], ["b", "speech"]]);
    expect(result[0].prompt).toBe("Meaning of a");
  });
  it("uses three requests for 45 cards and persists only the complete question set", async () => {
    const { store, cards } = setup();
    cards.splice(0, cards.length, ...Array.from({ length: 45 }, (_, index) => ({ id: "card-" + index, front: "word", back: "meaning" })));
    const fetchMock = vi.fn().mockImplementation(async (_url, init) => {
      const request = JSON.parse(init.body);
      return new Response(JSON.stringify({ questions: request.words.map((word: { vocabulary_id: string }) => generated(word.vocabulary_id)) }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await new DeckTestService(store).start("deck", "7", undefined, "Bearer signed");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map((call) => JSON.parse(call[1].body).words.length)).toEqual([20, 20, 5]);
    expect(result.questions).toHaveLength(45); expect(store.create).toHaveBeenCalledTimes(1);
  });
  it("returns the provider quota error as 429 without creating a session or retrying", async () => {
    const { store } = setup();
    const message = "Model AI đã hết quota trong ngày.";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: { code: "AI_QUOTA_EXCEEDED", message } }), { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    const app = express(); app.use(express.json());
    app.use("/api/v1/content", createDeckTestRouter(new DeckTestService(store), async () => "7"));
    app.use((error: { statusCode: number; message: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => { res.status(error.statusCode).json({ error: error.message }); });
    const result = await request(app).post(base).set("Authorization", "Bearer signed").send({});
    expect(result.status).toBe(429); expect(result.body.error).toBe(message);
    expect(fetchMock).toHaveBeenCalledTimes(1); expect(store.create).not.toHaveBeenCalled();
  });
  it("rejects missing or duplicate card IDs instead of attaching questions to the wrong words", async () => {
    const cards = [{ id: "a", front: "말", back: "horse" }, { id: "b", front: "말", back: "speech" }];
    for (const questions of [[generated("a")], [generated("a"), generated("a")]]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ questions }))));
      await expect(generateTestQuestions(cards, "Deck")).rejects.toMatchObject({ statusCode: 502 });
    }
  });
});
