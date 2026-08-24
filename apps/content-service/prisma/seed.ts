import { prisma } from "../src/db.js";

const lessonName = "Chào hỏi tiếng Hàn";

async function main() {
  const existingLesson = await prisma.lesson.findFirst({ where: { name: lessonName } });
  const lesson = existingLesson
    ? await prisma.lesson.update({
        where: { id: existingLesson.id },
        data: { description: "Bài học mẫu để luyện từ vựng và hội thoại cơ bản." },
      })
    : await prisma.lesson.create({
        data: {
          name: lessonName,
          description: "Bài học mẫu để luyện từ vựng và hội thoại cơ bản.",
        },
      });

  const vocabularyItems = [
    { word: "안녕하세요", meaning: "xin chào" },
    { word: "감사합니다", meaning: "cảm ơn" },
    { word: "미안합니다", meaning: "xin lỗi" },
  ];
  const vocabulary = [];
  for (const item of vocabularyItems) {
    vocabulary.push(
      await prisma.vocabulary.upsert({
        where: { lessonId_word: { lessonId: lesson.id, word: item.word } },
        update: { meaning: item.meaning },
        create: { lessonId: lesson.id, ...item },
      }),
    );
  }

  const questions = [
    {
      prompt: "안녕하세요 có nghĩa là gì?",
      vocabularyId: vocabulary[0].id,
      options: ["xin chào", "cảm ơn", "xin lỗi", "tạm biệt"],
      correctOptionIndex: 0,
    },
    {
      prompt: "Chọn nghĩa đúng của 감사합니다.",
      vocabularyId: vocabulary[1].id,
      options: ["xin lỗi", "cảm ơn", "xin chào", "không sao"],
      correctOptionIndex: 1,
    },
    {
      prompt: "Khi muốn xin lỗi lịch sự, bạn chọn câu nào?",
      vocabularyId: vocabulary[2].id,
      options: ["안녕하세요", "감사합니다", "미안합니다", "안녕히 가세요"],
      correctOptionIndex: 2,
    },
  ];

  for (const question of questions) {
    const existingQuestion = await prisma.question.findFirst({
      where: { lessonId: lesson.id, prompt: question.prompt },
    });
    if (existingQuestion) {
      await prisma.question.update({
        where: { id: existingQuestion.id },
        data: question,
      });
    } else {
      await prisma.question.create({
        data: { lessonId: lesson.id, ...question },
      });
    }
  }

  console.log(
    `Seeded lesson "${lesson.name}" (${lesson.id}) with ${vocabulary.length} words and ${questions.length} questions.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
