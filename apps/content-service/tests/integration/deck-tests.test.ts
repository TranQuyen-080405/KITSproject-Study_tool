import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/db.js";
import { deckTestStore } from "../../src/repositories/deck-tests.js";
import { DeckTestService, type TestCard } from "../../src/services/deck-tests.js";

const schema = new URL(process.env.CONTENT_TEST_DATABASE_URL ?? "postgresql://localhost/db").searchParams.get("schema");
const isolated = schema && /^deck_tests_[a-f0-9]{32}$/.test(schema) ? describe.sequential : describe.skip;

isolated("Deck test PostgreSQL persistence (isolated schema)", () => {
  afterAll(async () => {
    // Only the unique, disposable schema created for this suite can be removed.
    if (schema && /^deck_tests_[a-f0-9]{32}$/.test(schema)) {
      await prisma.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    }
    await prisma.$disconnect();
  });

  it("persists scores, snapshots and retries; keeps old attempts after vocabulary edits/deletes", async () => {
    const deck = await prisma.flashcard.create({
      data: { title: "Test deck", userId: "7", cards: { create: [
        { front: "사과", back: "táo", orderIndex: 0 }, { front: "물", back: "nước", orderIndex: 1 },
      ] } }, include: { cards: true },
    });
    let calls = 0;
    const service = new DeckTestService(deckTestStore, async (cards: TestCard[]) => {
      calls++;
      return cards.map((card) => ({
        id: "q-" + card.id, cardId: card.id, word: card.front, translation: card.back,
        prompt: card.front + "?", options: ["a", "b", "c", "d"], correctOptionIndex: 1, explanation: "why",
      }));
    });
    const attempt = await service.start(deck.id, "7");
    expect(attempt.questions).toHaveLength(2);
    expect((await service.list(deck.id, "7"))[0]).not.toHaveProperty("questions");
    await service.saveAnswers(deck.id, attempt.id, "7", { answers: [1, null] });
    const autosaved = await service.saveAnswers(deck.id, attempt.id, "7", { answers: [1, 0] });
    expect(autosaved.completedAt).toBeNull();
    const completed = await service.saveAnswers(deck.id, attempt.id, "7", { answers: [1, 0] }, true);
    const repeated = await service.saveAnswers(deck.id, attempt.id, "7", { answers: [1, 0] }, true);
    expect(repeated.version).toBe(completed.version);
    expect(repeated.completedAt).toEqual(completed.completedAt);
    expect(completed.scorePercentage).toBe(50);
    expect(completed.completedAt).toBeInstanceOf(Date);
    await prisma.card.deleteMany({ where: { flashcardId: deck.id } });
    const retry = await service.start(deck.id, "7", attempt.id);
    expect(calls).toBe(1);
    expect(retry.sourceSessionId).toBe(attempt.id);
    expect(retry.answers).toEqual([null, null]);
    expect(retry.questions).toEqual(attempt.questions);
    const reloaded = await service.get(deck.id, attempt.id, "7");
    expect(reloaded.answers).toEqual([1, 0]);
    expect(reloaded.correctCount).toBe(1);
    expect(reloaded.scorePercentage).toBe(50);
    expect((await service.list(deck.id, "7"))).toHaveLength(2);
    await expect(service.get(deck.id, attempt.id, "8")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("uses optimistic concurrency so only one stale answer update wins", async () => {
    const deck = await prisma.flashcard.create({ data: { title: "Concurrency", userId: "7" } });
    const attempt = await deckTestStore.create({
      flashcardId: deck.id, userId: "7", sourceSessionId: null, deckTitle: deck.title,
      questions: [{ id: "q", cardId: "snapshot", word: "물", translation: "nước",
        prompt: "?", options: ["a", "b", "c", "d"], correctOptionIndex: 0, explanation: null }],
      answers: [null], totalQuestions: 1,
    });
    const results = await Promise.all([
      deckTestStore.saveAnswer(attempt, [0], new Date()),
      deckTestStore.saveAnswer(attempt, [1], new Date()),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter((row) => row === null)).toHaveLength(1);
    const saved = await deckTestStore.get(attempt.id, deck.id, "7");
    expect(saved?.version).toBe(1);
  });
});
