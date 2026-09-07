import { prisma } from "../db.js";
import { AppError } from "../errors.js";
import type { Prisma } from "../generated/prisma/client.js";
import { assertTargetVocabulary } from "../validation.js";

export interface CreateLessonRecord {
  name: string;
  description: string;
}

export interface CreateVocabularyRecord {
  word: string;
  meaning: string;
}

export interface CreateQuestionRecord {
  prompt: string;
  vocabularyId: string | null;
  options: string[];
  correctOptionIndex: number;
}

export class ContentRepository {
  createLesson(data: CreateLessonRecord) {
    return prisma.lesson.create({ data });
  }

  listLessons() {
    return prisma.lesson.findMany({
      include: { _count: { select: { vocabulary: true, questions: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  getLessonDetail(lessonId: string) {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        vocabulary: { orderBy: { createdAt: "asc" } },
        questions: {
          select: {
            id: true,
            lessonId: true,
            vocabularyId: true,
            prompt: true,
            options: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  async addVocabulary(lessonId: string, items: CreateVocabularyRecord[]) {
    return prisma.$transaction(async (transaction) => {
      await this.requireLesson(transaction, lessonId);

      const words = items.map((item) => item.word);
      const existing = await transaction.vocabulary.findMany({
        where: { lessonId, word: { in: words } },
        select: { word: true },
      });
      if (existing.length) {
        throw new AppError(
          `Vocabulary already exists in this lesson: ${existing.map(({ word }) => word).join(", ")}`,
          409,
        );
      }

      await transaction.vocabulary.createMany({
        data: items.map((item) => ({ lessonId, ...item })),
      });
      return transaction.vocabulary.findMany({
        where: { lessonId, word: { in: words } },
        orderBy: { createdAt: "asc" },
      });
    });
  }

  async listVocabulary(lessonId: string) {
    await this.requireLesson(prisma, lessonId);
    return prisma.vocabulary.findMany({
      where: { lessonId },
      orderBy: { createdAt: "asc" },
    });
  }

  async createQuestion(lessonId: string, data: CreateQuestionRecord) {
    return prisma.$transaction(async (transaction) => {
      await this.requireLesson(transaction, lessonId);
      const vocabulary = data.vocabularyId
        ? await transaction.vocabulary.findUnique({
            where: { id: data.vocabularyId },
            select: { lessonId: true },
          })
        : null;
      assertTargetVocabulary(lessonId, data.vocabularyId, vocabulary);

      return transaction.question.create({
        data: {
          lesson: { connect: { id: lessonId } },
          ...(data.vocabularyId
            ? { vocabulary: { connect: { id: data.vocabularyId } } }
            : {}),
          prompt: data.prompt,
          options: data.options,
          correctOptionIndex: data.correctOptionIndex,
        },
      });
    });
  }

  async listQuestions(lessonId: string) {
    await this.requireLesson(prisma, lessonId);
    return prisma.question.findMany({
      where: { lessonId },
      select: {
        id: true,
        lessonId: true,
        vocabularyId: true,
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
        lessonId: true,
        vocabularyId: true,
        correctOptionIndex: true,
        prompt: true,
        options: true,
      },
    });
  }

  getManagedQuestion(questionId: string) {
    return prisma.question.findUnique({ where: { id: questionId } });
  }

  async listManagedQuestions(lessonId: string) {
    await this.requireLesson(prisma, lessonId);
    return prisma.question.findMany({
      where: { lessonId },
      orderBy: { createdAt: "asc" },
    });
  }

  async updateLesson(lessonId: string, data: CreateLessonRecord) {
    try {
      return await prisma.lesson.update({ where: { id: lessonId }, data });
    } catch {
      return null;
    }
  }

  async deleteLesson(lessonId: string) {
    try {
      await prisma.lesson.delete({ where: { id: lessonId } });
      return true;
    } catch {
      return false;
    }
  }

  async updateQuestion(questionId: string, data: CreateQuestionRecord) {
    return prisma.$transaction(async (transaction) => {
      const existing = await transaction.question.findUnique({
        where: { id: questionId },
        select: { id: true, lessonId: true },
      });
      if (!existing) return null;

      const vocabulary = data.vocabularyId
        ? await transaction.vocabulary.findUnique({
            where: { id: data.vocabularyId },
            select: { lessonId: true },
          })
        : null;
      assertTargetVocabulary(existing.lessonId, data.vocabularyId, vocabulary);

      return transaction.question.update({
        where: { id: questionId },
        data: {
          prompt: data.prompt,
          options: data.options,
          correctOptionIndex: data.correctOptionIndex,
          vocabularyId: data.vocabularyId,
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

  private async requireLesson(
    client: Prisma.TransactionClient | typeof prisma,
    lessonId: string,
  ): Promise<void> {
    const lesson = await client.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });
    if (!lesson) throw new AppError("Lesson not found", 404);
  }
}

export const contentRepository = new ContentRepository();
