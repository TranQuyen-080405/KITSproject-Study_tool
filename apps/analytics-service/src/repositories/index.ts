import { prisma } from "../db.js";
import type { Prisma, PrismaClient, UserReview, StudySession, UserStreak } from "../generated/prisma/client.js";
import type { ReviewRecord, ReviewStatus, StudySessionRecord, SessionType, UserStreakRecord } from "../services/index.js";

export function toReview(row: UserReview): ReviewRecord {
  return {
    userId: row.userId, cardId: row.cardId, vocabularyId: row.cardId, deckId: row.deckId ?? undefined,
    word: row.word, front: row.front, translation: row.translation ?? undefined, back: row.back ?? undefined,
    status: row.status as ReviewStatus, correctCount: row.correctCount, incorrectCount: row.incorrectCount,
    correctStreak: row.correctStreak, totalReviews: row.totalReviews, intervalDays: row.intervalDays,
    easeFactor: row.easeFactor, nextReviewAt: row.nextReviewAt.toISOString(),
    lastReviewedAt: row.lastReviewedAt.toISOString(), lastResponseTimeMs: row.lastResponseTimeMs ?? undefined,
    averageResponseTimeMs: row.averageResponseTimeMs ?? undefined,
  };
}
export function reviewData(review: ReviewRecord): Prisma.UserReviewCreateManyInput {
  return {
    userId: review.userId, cardId: review.cardId || review.vocabularyId || "", deckId: review.deckId ?? null,
    word: review.word, front: review.front, translation: review.translation ?? null, back: review.back ?? null,
    status: review.status, correctCount: review.correctCount, incorrectCount: review.incorrectCount,
    correctStreak: review.correctStreak, totalReviews: review.totalReviews, intervalDays: review.intervalDays,
    easeFactor: review.easeFactor, nextReviewAt: new Date(review.nextReviewAt),
    lastReviewedAt: new Date(review.lastReviewedAt), lastResponseTimeMs: review.lastResponseTimeMs ?? null,
    averageResponseTimeMs: review.averageResponseTimeMs ?? null,
  };
}
export function toSession(row: StudySession): StudySessionRecord {
  return {
    id: row.id, userId: row.userId, deckId: row.deckId ?? undefined, deckTitle: row.deckTitle ?? undefined,
    sessionType: row.sessionType as SessionType, totalCardsOrQuestions: row.totalCardsOrQuestions,
    correctCount: row.correctCount, scorePercentage: row.scorePercentage, durationSeconds: row.durationSeconds,
    averageResponseTimeMs: row.averageResponseTimeMs ?? undefined, completedAt: row.completedAt.toISOString(),
  };
}
export function sessionData(session: StudySessionRecord): Prisma.StudySessionCreateManyInput {
  return {
    ...session, deckId: session.deckId ?? null, deckTitle: session.deckTitle ?? null,
    averageResponseTimeMs: session.averageResponseTimeMs ?? null, completedAt: new Date(session.completedAt),
  };
}
export function toStreak(row: UserStreak): UserStreakRecord {
  return { ...row, updatedAt: row.updatedAt.toISOString() };
}

export class ReviewRepository {
  constructor(
    private readonly client: Prisma.TransactionClient = prisma,
    private readonly root: PrismaClient | null = prisma,
  ) {}

  async transaction<T>(userId: string, operation: (repository: ReviewRepository) => Promise<T>): Promise<T> {
    if (!this.root) return operation(this);
    return this.root.$transaction(async (transaction) => {
      // Serialize each user's read-modify-write across requests and service instances.
      await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))::text`;
      return operation(new ReviewRepository(transaction, null));
    }, { maxWait: 10_000, timeout: 30_000 });
  }

  async get(userId: string, cardId: string): Promise<ReviewRecord | undefined> {
    const row = await this.client.userReview.findUnique({ where: { userId_cardId: { userId, cardId } } });
    return row ? toReview(row) : undefined;
  }
  async save(review: ReviewRecord): Promise<ReviewRecord> {
    const data = reviewData(review);
    return toReview(await this.client.userReview.upsert({
      where: { userId_cardId: { userId: data.userId, cardId: data.cardId } }, create: data, update: data,
    }));
  }
  async batchSaveReviews(reviews: ReviewRecord[]): Promise<void> {
    for (const review of reviews) await this.save(review);
  }
  async listByUser(userId: string): Promise<ReviewRecord[]> {
    return (await this.client.userReview.findMany({ where: { userId } })).map(toReview);
  }
  async listByDeck(userId: string, deckId: string): Promise<ReviewRecord[]> {
    return (await this.client.userReview.findMany({ where: { userId, deckId } })).map(toReview);
  }
  async saveSession(session: StudySessionRecord): Promise<StudySessionRecord> {
    const data = sessionData(session);
    return toSession(await this.client.studySession.upsert({ where: { id: session.id }, create: data, update: data }));
  }
  async listSessionsByUser(userId: string): Promise<StudySessionRecord[]> {
    return (await this.client.studySession.findMany({
      where: { userId }, orderBy: [{ completedAt: "desc" }, { id: "desc" }],
    })).map(toSession);
  }
  async listSessionsByDeck(userId: string, deckId: string): Promise<StudySessionRecord[]> {
    return (await this.client.studySession.findMany({
      where: { userId, deckId }, orderBy: [{ completedAt: "desc" }, { id: "desc" }],
    })).map(toSession);
  }
  async getStreak(userId: string): Promise<UserStreakRecord | undefined> {
    const row = await this.client.userStreak.findUnique({ where: { userId } });
    return row ? toStreak(row) : undefined;
  }
  async saveStreak(streak: UserStreakRecord): Promise<UserStreakRecord> {
    const data = { ...streak, updatedAt: new Date(streak.updatedAt) };
    return toStreak(await this.client.userStreak.upsert({ where: { userId: streak.userId }, create: data, update: data }));
  }
}
export const reviewRepository = new ReviewRepository();
