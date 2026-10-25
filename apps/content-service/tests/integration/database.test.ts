import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db.js";
import { AppError } from "../../src/errors.js";
import { contentRepository } from "../../src/repositories/index.js";

const integration = process.env.CONTENT_TEST_DATABASE_URL ? describe.sequential : describe.skip;
const options = ["xin chào", "cảm ơn", "tạm biệt", "xin lỗi"];

async function cleanDatabase(): Promise<void> {
  await prisma.question.deleteMany();
  await prisma.card.deleteMany();
  await prisma.flashcard.deleteMany();
  await prisma.folder.deleteMany();
}

integration("Content PostgreSQL integrity", () => {
  beforeEach(cleanDatabase);
  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  it("rejects cross-deck and missing target card IDs", async () => {
    const deckA = await prisma.flashcard.create({
      data: { title: "Deck A", description: "A" },
    });
    const deckB = await prisma.flashcard.create({
      data: { title: "Deck B", description: "B" },
    });
    const cardB = await prisma.card.create({
      data: {
        flashcardId: deckB.id,
        front: "감사합니다",
        back: "cảm ơn",
      },
    });

    await expect(
      contentRepository.createQuestion(deckA.id, {
        prompt: "Cross deck",
        cardId: cardB.id,
        options,
        correctOptionIndex: 0,
      }),
    ).rejects.toEqual(new AppError("cardId must belong to this flashcard deck", 400));

    await expect(
      contentRepository.createQuestion(deckA.id, {
        prompt: "Missing card",
        cardId: "00000000-0000-0000-0000-000000000000",
        options,
        correctOptionIndex: 0,
      }),
    ).rejects.toEqual(new AppError("Target card not found", 404));
  });

  it("supports general questions and SET NULL when card is deleted", async () => {
    const deck = await prisma.flashcard.create({
      data: { title: "Deck", description: "Description" },
    });
    const card = await prisma.card.create({
      data: { flashcardId: deck.id, front: "안녕하세요", back: "xin chào" },
    });
    const targeted = await contentRepository.createQuestion(deck.id, {
      prompt: "Targeted",
      cardId: card.id,
      options,
      correctOptionIndex: 0,
    });
    const general = await contentRepository.createQuestion(deck.id, {
      prompt: "General",
      cardId: null,
      options,
      correctOptionIndex: 0,
    });

    expect(general.cardId).toBeNull();
    await prisma.card.delete({ where: { id: card.id } });
    expect(
      (await prisma.question.findUniqueOrThrow({ where: { id: targeted.id } })).cardId,
    ).toBeNull();
  });

  it("cascades deck deletion to cards and questions", async () => {
    const deck = await prisma.flashcard.create({
      data: { title: "Cascade", description: "Cascade test" },
    });
    const card = await prisma.card.create({
      data: { flashcardId: deck.id, front: "안녕", back: "chào" },
    });
    await contentRepository.createQuestion(deck.id, {
      prompt: "Cascade question",
      cardId: card.id,
      options,
      correctOptionIndex: 0,
    });

    await prisma.flashcard.delete({ where: { id: deck.id } });

    expect(await prisma.card.count({ where: { flashcardId: deck.id } })).toBe(0);
    expect(await prisma.question.count({ where: { flashcardId: deck.id } })).toBe(0);
  });

  it("rolls back every write when a transaction fails", async () => {
    await expect(
      prisma.$transaction(async (transaction) => {
        await transaction.flashcard.create({
          data: { title: "Rollback", description: "Must not persist" },
        });
        throw new Error("force rollback");
      }),
    ).rejects.toThrow("force rollback");

    expect(await prisma.flashcard.count({ where: { title: "Rollback" } })).toBe(0);
  });
});
