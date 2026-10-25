import { prisma } from "../db.js";
import { AppError } from "../errors.js";
import type { Prisma } from "../generated/prisma/client.js";
import { assertTargetCard } from "../validation.js";

export interface CreateFolderRecord {
  name: string;
  description?: string | null;
  userId?: string | null;
}

export interface UpdateFolderRecord {
  name?: string;
  description?: string | null;
}

export interface CreateFlashcardRecord {
  title: string;
  description?: string | null;
  folderId?: string | null;
  userId?: string | null;
}

export interface UpdateFlashcardRecord {
  title?: string;
  description?: string | null;
  folderId?: string | null;
}

export interface CreateCardRecord {
  front: string;
  back: string;
  hint?: string | null;
  orderIndex?: number;
}

export interface UpdateCardRecord {
  front?: string;
  back?: string;
  hint?: string | null;
  orderIndex?: number;
}

export interface CreateQuestionRecord {
  prompt: string;
  cardId?: string | null;
  vocabularyId?: string | null;
  options: string[];
  correctOptionIndex: number;
}

export class ContentRepository {
  // ===================== FOLDER =====================
  createFolder(data: CreateFolderRecord) {
    return prisma.folder.create({ data });
  }

  listFolders(userId?: string) {
    return prisma.folder.findMany({
      where: userId ? { userId } : undefined,
      include: { _count: { select: { flashcards: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  getFolderDetail(folderId: string) {
    return prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        flashcards: {
          include: {
            _count: { select: { cards: true, questions: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  async updateFolder(folderId: string, data: UpdateFolderRecord) {
    try {
      return await prisma.folder.update({ where: { id: folderId }, data });
    } catch {
      return null;
    }
  }

  async deleteFolder(folderId: string) {
    try {
      await prisma.folder.delete({ where: { id: folderId } });
      return true;
    } catch {
      return false;
    }
  }

  // ===================== FLASHCARD (DECK) =====================
  async createFlashcard(data: CreateFlashcardRecord) {
    if (data.folderId) {
      await this.requireFolder(prisma, data.folderId);
    }
    return prisma.flashcard.create({ data });
  }

  listFlashcards(folderId?: string | null, userId?: string) {
    return prisma.flashcard.findMany({
      where: { ...(folderId !== undefined ? { folderId } : {}), ...(userId !== undefined ? { userId } : {}) },
      include: {
        folder: { select: { id: true, name: true } },
        _count: { select: { cards: true, questions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  getFlashcardDetail(flashcardId: string) {
    return prisma.flashcard.findUnique({
      where: { id: flashcardId },
      include: {
        folder: { select: { id: true, name: true } },
        cards: { orderBy: { orderIndex: "asc" } },
        questions: {
          select: {
            id: true,
            flashcardId: true,
            cardId: true,
            prompt: true,
            options: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { cards: true, questions: true } },
      },
    });
  }

  async updateFlashcard(flashcardId: string, data: UpdateFlashcardRecord) {
    if (data.folderId) {
      await this.requireFolder(prisma, data.folderId);
    }
    try {
      return await prisma.flashcard.update({ where: { id: flashcardId }, data });
    } catch {
      return null;
    }
  }

  async deleteFlashcard(flashcardId: string) {
    try {
      await prisma.flashcard.delete({ where: { id: flashcardId } });
      return true;
    } catch {
      return false;
    }
  }

  // ===================== CARD =====================
  async addCards(flashcardId: string, items: CreateCardRecord[]) {
    return prisma.$transaction(async (transaction) => {
      await this.requireFlashcard(transaction, flashcardId);

      const existingCardsCount = await transaction.card.count({
        where: { flashcardId },
      });

      const cardsData = items.map((item, index) => ({
        flashcardId,
        front: item.front,
        back: item.back,
        hint: item.hint ?? null,
        orderIndex: item.orderIndex ?? existingCardsCount + index,
      }));

      await transaction.card.createMany({ data: cardsData });

      return transaction.card.findMany({
        where: { flashcardId },
        orderBy: { orderIndex: "asc" },
      });
    });
  }

  async listCards(flashcardId: string) {
    await this.requireFlashcard(prisma, flashcardId);
    return prisma.card.findMany({
      where: { flashcardId },
      orderBy: { orderIndex: "asc" },
    });
  }

  async getCard(cardId: string) {
    return prisma.card.findUnique({ where: { id: cardId } });
  }

  async updateCard(cardId: string, data: UpdateCardRecord) {
    try {
      return await prisma.card.update({ where: { id: cardId }, data });
    } catch {
      return null;
    }
  }

  async deleteCard(cardId: string) {
    try {
      await prisma.card.delete({ where: { id: cardId } });
      return true;
    } catch {
      return false;
    }
  }

  // ===================== QUESTION =====================
  async createQuestion(flashcardId: string, data: CreateQuestionRecord) {
    return prisma.$transaction(async (transaction) => {
      await this.requireFlashcard(transaction, flashcardId);
      const effectiveCardId = data.cardId ?? data.vocabularyId ?? null;
      const card = effectiveCardId
        ? await transaction.card.findUnique({
            where: { id: effectiveCardId },
            select: { flashcardId: true },
          })
        : null;
      assertTargetCard(flashcardId, effectiveCardId, card);

      return transaction.question.create({
        data: {
          flashcard: { connect: { id: flashcardId } },
          ...(effectiveCardId ? { card: { connect: { id: effectiveCardId } } } : {}),
          prompt: data.prompt,
          options: data.options,
          correctOptionIndex: data.correctOptionIndex,
        },
      });
    });
  }

  async listQuestions(flashcardId: string) {
    await this.requireFlashcard(prisma, flashcardId);
    return prisma.question.findMany({
      where: { flashcardId },
      select: {
        id: true,
        flashcardId: true,
        cardId: true,
        prompt: true,
        options: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  getQuestionForCheck(questionId: string) {
    return prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        flashcardId: true,
        cardId: true,
        correctOptionIndex: true,
        prompt: true,
        options: true,
      },
    });
  }

  getManagedQuestion(questionId: string) {
    return prisma.question.findUnique({ where: { id: questionId } });
  }

  async listManagedQuestions(flashcardId: string) {
    await this.requireFlashcard(prisma, flashcardId);
    return prisma.question.findMany({
      where: { flashcardId },
      orderBy: { createdAt: "asc" },
    });
  }

  async updateQuestion(questionId: string, data: CreateQuestionRecord) {
    return prisma.$transaction(async (transaction) => {
      const existing = await transaction.question.findUnique({
        where: { id: questionId },
        select: { id: true, flashcardId: true },
      });
      if (!existing) return null;

      const effectiveCardId = data.cardId ?? data.vocabularyId ?? null;
      const card = effectiveCardId
        ? await transaction.card.findUnique({
            where: { id: effectiveCardId },
            select: { flashcardId: true },
          })
        : null;
      assertTargetCard(existing.flashcardId, effectiveCardId, card);

      return transaction.question.update({
        where: { id: questionId },
        data: {
          prompt: data.prompt,
          options: data.options,
          correctOptionIndex: data.correctOptionIndex,
          cardId: effectiveCardId,
        },
      });
    });
  }

  async deleteQuestion(questionId: string) {
    try {
      await prisma.question.delete({ where: { id: questionId } });
      return true;
    } catch {
      return false;
    }
  }

  // ===================== HELPERS =====================
  private async requireFolder(
    client: Prisma.TransactionClient | typeof prisma,
    folderId: string,
  ): Promise<void> {
    const folder = await client.folder.findUnique({
      where: { id: folderId },
      select: { id: true },
    });
    if (!folder) throw new AppError("Folder not found", 404);
  }

  private async requireFlashcard(
    client: Prisma.TransactionClient | typeof prisma,
    flashcardId: string,
  ): Promise<void> {
    const flashcard = await client.flashcard.findUnique({
      where: { id: flashcardId },
      select: { id: true },
    });
    if (!flashcard) throw new AppError("Flashcard deck not found", 404);
  }
}

export const contentRepository = new ContentRepository();
