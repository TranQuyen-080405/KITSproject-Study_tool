import { prisma } from "../src/db.js";

const folderName = "Tiếng Hàn Sơ Cấp";
const flashcardTitle = "Chào hỏi tiếng Hàn";

async function main() {
  // 1. Seed or find Folder
  const existingFolder = await prisma.folder.findFirst({ where: { name: folderName } });
  const folder = existingFolder
    ? await prisma.folder.update({
        where: { id: existingFolder.id },
        data: { description: "Thư mục các bài học tiếng Hàn trình độ nhập môn và sơ cấp." },
      })
    : await prisma.folder.create({
        data: {
          name: folderName,
          description: "Thư mục các bài học tiếng Hàn trình độ nhập môn và sơ cấp.",
        },
      });

  // 2. Seed or find Flashcard Deck
  const existingDeck = await prisma.flashcard.findFirst({ where: { title: flashcardTitle } });
  const flashcard = existingDeck
    ? await prisma.flashcard.update({
        where: { id: existingDeck.id },
        data: {
          folderId: folder.id,
          description: "Bộ thẻ từ vựng và câu chào hỏi giao tiếp cơ bản.",
        },
      })
    : await prisma.flashcard.create({
        data: {
          title: flashcardTitle,
          folderId: folder.id,
          description: "Bộ thẻ từ vựng và câu chào hỏi giao tiếp cơ bản.",
        },
      });

  // 3. Seed Cards
  const cardItems = [
    { front: "안녕하세요", back: "xin chào", orderIndex: 0 },
    { front: "감사합니다", back: "cảm ơn", orderIndex: 1 },
    { front: "미안합니다", back: "xin lỗi", orderIndex: 2 },
  ];

  const cards = [];
  for (const item of cardItems) {
    const existing = await prisma.card.findFirst({
      where: { flashcardId: flashcard.id, front: item.front },
    });
    if (existing) {
      cards.push(
        await prisma.card.update({
          where: { id: existing.id },
          data: { back: item.back, orderIndex: item.orderIndex },
        }),
      );
    } else {
      cards.push(
        await prisma.card.create({
          data: { flashcardId: flashcard.id, ...item },
        }),
      );
    }
  }

  // 4. Seed Questions
  const questionItems = [
    {
      prompt: "안녕하세요 có nghĩa là gì?",
      cardId: cards[0].id,
      options: ["xin chào", "cảm ơn", "xin lỗi", "tạm biệt"],
      correctOptionIndex: 0,
    },
    {
      prompt: "Chọn nghĩa đúng của 감사합니다.",
      cardId: cards[1].id,
      options: ["xin lỗi", "cảm ơn", "xin chào", "không sao"],
      correctOptionIndex: 1,
    },
    {
      prompt: "Khi muốn xin lỗi lịch sự, bạn chọn câu nào?",
      cardId: cards[2].id,
      options: ["안녕하세요", "감사합니다", "미안합니다", "안녕히 가세요"],
      correctOptionIndex: 2,
    },
  ];

  for (const q of questionItems) {
    const existingQuestion = await prisma.question.findFirst({
      where: { flashcardId: flashcard.id, prompt: q.prompt },
    });
    if (existingQuestion) {
      await prisma.question.update({
        where: { id: existingQuestion.id },
        data: q,
      });
    } else {
      await prisma.question.create({
        data: { flashcardId: flashcard.id, ...q },
      });
    }
  }

  console.log(
    `Seeded folder "${folder.name}" with deck "${flashcard.title}" (${cards.length} cards, ${questionItems.length} questions).`,
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
