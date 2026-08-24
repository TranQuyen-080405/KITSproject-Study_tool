import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db.js";
import { AppError } from "../../src/errors.js";
import { contentRepository } from "../../src/repositories/index.js";

const integration = process.env.CONTENT_TEST_DATABASE_URL ? describe.sequential : describe.skip;
const options = ["xin chào", "cảm ơn", "tạm biệt", "xin lỗi"];

async function cleanDatabase(): Promise<void> {
  await prisma.question.deleteMany();
  await prisma.vocabulary.deleteMany();
  await prisma.lesson.deleteMany();
}

integration("Content PostgreSQL integrity", () => {
  beforeEach(cleanDatabase);
  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  it("rejects cross-lesson and missing target vocabulary IDs", async () => {
    const lessonA = await prisma.lesson.create({
      data: { name: "Lesson A", description: "A" },
    });
    const lessonB = await prisma.lesson.create({
      data: { name: "Lesson B", description: "B" },
    });
    const vocabularyB = await prisma.vocabulary.create({
      data: {
        lessonId: lessonB.id,
        word: "감사합니다",
        meaning: "cảm ơn",
      },
    });

    await expect(
      contentRepository.createQuestion(lessonA.id, {
        prompt: "Cross lesson",
        vocabularyId: vocabularyB.id,
        options,
        correctOptionIndex: 0,
      }),
    ).rejects.toEqual(new AppError("vocabularyId must belong to this lesson", 400));

    await expect(
      contentRepository.createQuestion(lessonA.id, {
        prompt: "Missing vocabulary",
        vocabularyId: "00000000-0000-0000-0000-000000000000",
        options,
        correctOptionIndex: 0,
      }),
    ).rejects.toEqual(new AppError("Target vocabulary not found", 404));
  });

  it("supports general questions and SET NULL when vocabulary is deleted", async () => {
    const lesson = await prisma.lesson.create({
      data: { name: "Lesson", description: "Description" },
    });
    const vocabulary = await prisma.vocabulary.create({
      data: { lessonId: lesson.id, word: "안녕하세요", meaning: "xin chào" },
    });
    const targeted = await contentRepository.createQuestion(lesson.id, {
      prompt: "Targeted",
      vocabularyId: vocabulary.id,
      options,
      correctOptionIndex: 0,
    });
    const general = await contentRepository.createQuestion(lesson.id, {
      prompt: "General",
      vocabularyId: null,
      options,
      correctOptionIndex: 0,
    });

    expect(general.vocabularyId).toBeNull();
    await prisma.vocabulary.delete({ where: { id: vocabulary.id } });
    expect(
      (await prisma.question.findUniqueOrThrow({ where: { id: targeted.id } })).vocabularyId,
    ).toBeNull();
  });

  it("cascades lesson deletion to vocabulary and questions", async () => {
    const lesson = await prisma.lesson.create({
      data: { name: "Cascade", description: "Cascade test" },
    });
    const vocabulary = await prisma.vocabulary.create({
      data: { lessonId: lesson.id, word: "안녕", meaning: "chào" },
    });
    await contentRepository.createQuestion(lesson.id, {
      prompt: "Cascade question",
      vocabularyId: vocabulary.id,
      options,
      correctOptionIndex: 0,
    });

    await prisma.lesson.delete({ where: { id: lesson.id } });

    expect(await prisma.vocabulary.count({ where: { lessonId: lesson.id } })).toBe(0);
    expect(await prisma.question.count({ where: { lessonId: lesson.id } })).toBe(0);
  });

  it("rolls back every write when a transaction fails", async () => {
    await expect(
      prisma.$transaction(async (transaction) => {
        await transaction.lesson.create({
          data: { name: "Rollback", description: "Must not persist" },
        });
        throw new Error("force rollback");
      }),
    ).rejects.toThrow("force rollback");

    expect(await prisma.lesson.count({ where: { name: "Rollback" } })).toBe(0);
  });
});
