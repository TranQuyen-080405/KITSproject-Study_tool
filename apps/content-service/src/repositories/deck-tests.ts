import { prisma } from "../db.js";
import type { NewTestSession, TestSession, TestStore } from "../services/deck-tests.js";

function asSession(row: unknown): TestSession {
  return row as TestSession;
}

export const deckTestStore: TestStore = {
  deck(id) {
    return prisma.flashcard.findUnique({
      where: { id },
      select: { id: true, title: true, userId: true, cards: {
        select: { id: true, front: true, back: true }, orderBy: { orderIndex: "asc" },
      } },
    });
  },
  async list(flashcardId, userId) {
    return prisma.deckTestSession.findMany({
      where: { flashcardId, userId },
      omit: { questions: true, answers: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  },
  async get(id, flashcardId, userId) {
    const row = await prisma.deckTestSession.findFirst({ where: { id, flashcardId, userId } });
    return row ? asSession(row) : null;
  },
  async create(data: NewTestSession) {
    return asSession(await prisma.deckTestSession.create({ data }));
  },
  async saveAnswer(session, answers, completedAt) {
    const correctCount = answers.filter((answer, index) =>
      answer !== null && answer === session.questions[index].correctOptionIndex,
    ).length;
    return prisma.$transaction(async (transaction) => {
      const updated = await transaction.deckTestSession.updateMany({
        where: { id: session.id, userId: session.userId, version: session.version, completedAt: null },
        data: {
          answers, correctCount, completedAt,
          scorePercentage: Math.round(correctCount / session.totalQuestions * 100),
          version: { increment: 1 },
        },
      });
      if (!updated.count) return null;
      return asSession(await transaction.deckTestSession.findUniqueOrThrow({ where: { id: session.id } }));
    });
  },
};
