import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "../apps/content-service/src/db.js";

type LessonSeed = {
  name: string;
  description: string;
  entries: Array<{ word: string; meaning: string; prompt: string; distractors: string[] }>;
};

type AnalyticsDb = {
  reviews: Record<
    string,
    {
      userId: string;
      vocabularyId: string;
      word: string;
      translation?: string;
      status: "new" | "learning" | "mastered";
      correctCount: number;
      incorrectCount: number;
      correctStreak: number;
      totalReviews: number;
      intervalDays: number;
      easeFactor: number;
      nextReviewAt: string;
      lastReviewedAt: string;
    }
  >;
};

const USER_ID = "1";
const ANALYTICS_FILE = path.resolve("apps/analytics-service/.analytics-data.json");

const lessons: LessonSeed[] = [
  {
    name: "Giao tiếp cơ bản",
    description: "Chào hỏi và giao tiếp hàng ngày.",
    entries: [
      { word: "안녕하세요", meaning: "xin chào", prompt: "Từ nào nghĩa là xin chào?", distractors: ["cảm ơn", "xin lỗi", "tạm biệt"] },
      { word: "감사합니다", meaning: "cảm ơn", prompt: "Nghĩa đúng của 감사합니다 là gì?", distractors: ["xin chào", "xin lỗi", "không sao"] },
      { word: "죄송합니다", meaning: "xin lỗi", prompt: "Khi muốn xin lỗi lịch sự, dùng từ nào?", distractors: ["xin chào", "cảm ơn", "hẹn gặp lại"] },
      { word: "안녕히 가세요", meaning: "tạm biệt", prompt: "Tạm biệt (người đi) là từ nào?", distractors: ["xin chào", "chúc ngủ ngon", "cảm ơn"] },
      { word: "괜찮아요", meaning: "không sao", prompt: "Nghĩa của 괜찮아요 là gì?", distractors: ["xin lỗi", "chào buổi sáng", "muộn rồi"] },
      { word: "실례합니다", meaning: "xin phép", prompt: "Từ nào dùng để xin phép?", distractors: ["cảm ơn", "không sao", "chúc mừng"] },
    ],
  },
  {
    name: "Mua sắm",
    description: "Ngữ cảnh mua sắm, hỏi giá và thanh toán.",
    entries: [
      { word: "얼마예요", meaning: "bao nhiêu tiền", prompt: "Hỏi giá món hàng dùng câu nào?", distractors: ["ở đâu", "mấy giờ", "vì sao"] },
      { word: "비싸요", meaning: "đắt", prompt: "비싸요 có nghĩa là gì?", distractors: ["rẻ", "mới", "đẹp"] },
      { word: "싸요", meaning: "rẻ", prompt: "Từ nào nghĩa là rẻ?", distractors: ["đắt", "hỏng", "nặng"] },
      { word: "카드", meaning: "thẻ", prompt: "Thanh toán bằng thẻ là từ nào?", distractors: ["tiền mặt", "hóa đơn", "địa chỉ"] },
      { word: "현금", meaning: "tiền mặt", prompt: "현금 có nghĩa là gì?", distractors: ["thẻ", "hàng giảm giá", "cân nặng"] },
      { word: "영수증", meaning: "hóa đơn", prompt: "Sau khi mua hàng, bạn nhận gì?", distractors: ["vé xe", "hộ chiếu", "đồng hồ"] },
    ],
  },
  {
    name: "Thời gian",
    description: "Từ chỉ thời gian để luyện phản xạ lên lịch học.",
    entries: [
      { word: "오늘", meaning: "hôm nay", prompt: "오늘 nghĩa là gì?", distractors: ["hôm qua", "ngày mai", "tuần sau"] },
      { word: "내일", meaning: "ngày mai", prompt: "Từ nào nghĩa là ngày mai?", distractors: ["hôm nay", "hôm qua", "tháng này"] },
      { word: "어제", meaning: "hôm qua", prompt: "어제 là hôm nào?", distractors: ["hôm nay", "ngày mai", "cuối tuần"] },
      { word: "아침", meaning: "buổi sáng", prompt: "Buổi sáng là từ nào?", distractors: ["buổi tối", "buổi trưa", "nửa đêm"] },
      { word: "저녁", meaning: "buổi tối", prompt: "저녁 có nghĩa là gì?", distractors: ["buổi sáng", "buổi trưa", "ngày nghỉ"] },
      { word: "주말", meaning: "cuối tuần", prompt: "Từ chỉ cuối tuần là gì?", distractors: ["đầu tuần", "tháng sau", "mùa đông"] },
    ],
  },
  {
    name: "Ăn uống",
    description: "Từ vựng gọi món, đồ uống, khẩu vị.",
    entries: [
      { word: "물", meaning: "nước", prompt: "물 nghĩa là gì?", distractors: ["cơm", "trà", "sữa"] },
      { word: "밥", meaning: "cơm", prompt: "Từ nào nghĩa là cơm?", distractors: ["nước", "thịt", "rau"] },
      { word: "커피", meaning: "cà phê", prompt: "커피 có nghĩa là gì?", distractors: ["trà", "nước ép", "sữa"] },
      { word: "차", meaning: "trà", prompt: "Đồ uống nào là trà?", distractors: ["cà phê", "nước lọc", "bia"] },
      { word: "맛있어요", meaning: "ngon", prompt: "Khen món ăn ngon dùng từ nào?", distractors: ["mặn", "đắng", "nhạt"] },
      { word: "매워요", meaning: "cay", prompt: "Từ nào miêu tả món ăn cay?", distractors: ["ngọt", "mặn", "chua"] },
    ],
  },
  {
    name: "Di chuyển",
    description: "Đường đi, phương tiện và chỉ dẫn.",
    entries: [
      { word: "지하철", meaning: "tàu điện ngầm", prompt: "지하철 là phương tiện gì?", distractors: ["xe buýt", "taxi", "xe đạp"] },
      { word: "버스", meaning: "xe buýt", prompt: "Từ nào nghĩa là xe buýt?", distractors: ["tàu điện ngầm", "taxi", "máy bay"] },
      { word: "택시", meaning: "taxi", prompt: "택시 nghĩa là gì?", distractors: ["xe buýt", "tàu hỏa", "xe máy"] },
      { word: "오른쪽", meaning: "bên phải", prompt: "Rẽ phải là từ nào?", distractors: ["bên trái", "đi thẳng", "quay lại"] },
      { word: "왼쪽", meaning: "bên trái", prompt: "왼쪽 có nghĩa là gì?", distractors: ["bên phải", "đi thẳng", "lên tầng"] },
      { word: "곧장", meaning: "đi thẳng", prompt: "Từ chỉ đi thẳng là gì?", distractors: ["rẽ phải", "rẽ trái", "dừng lại"] },
    ],
  },
];

function buildOptions(correct: string, distractors: string[], index: number): string[] {
  const options = [correct, ...distractors].slice(0, 4);
  const rotateBy = index % 4;
  return options.map((_, i) => options[(i + rotateBy) % options.length]);
}

function monthAgo(daysBack: number): Date {
  return new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
}

async function seedLessons(): Promise<Array<{ vocabularyId: string; word: string; meaning: string }>> {
  const vocabAccumulator: Array<{ vocabularyId: string; word: string; meaning: string }> = [];

  for (let lessonIndex = 0; lessonIndex < lessons.length; lessonIndex += 1) {
    const lessonSeed = lessons[lessonIndex];
    const lessonId = `mock-month-${lessonIndex + 1}`;
    const lesson = await prisma.lesson.upsert({
      where: { id: lessonId },
      create: {
        id: lessonId,
        name: lessonSeed.name,
        description: lessonSeed.description,
      },
      update: {
        name: lessonSeed.name,
        description: lessonSeed.description,
      },
    });

    for (let i = 0; i < lessonSeed.entries.length; i += 1) {
      const entry = lessonSeed.entries[i];
      const vocab = await prisma.vocabulary.upsert({
        where: { lessonId_word: { lessonId: lesson.id, word: entry.word } },
        create: { lessonId: lesson.id, word: entry.word, meaning: entry.meaning },
        update: { meaning: entry.meaning },
      });

      const options = buildOptions(entry.meaning, entry.distractors, i);
      const correctOptionIndex = options.findIndex((option) => option === entry.meaning);

      const existingQuestion = await prisma.question.findFirst({
        where: { lessonId: lesson.id, prompt: entry.prompt },
      });

      if (existingQuestion) {
        await prisma.question.update({
          where: { id: existingQuestion.id },
          data: {
            vocabularyId: vocab.id,
            prompt: entry.prompt,
            options,
            correctOptionIndex,
          },
        });
      } else {
        await prisma.question.create({
          data: {
            lessonId: lesson.id,
            vocabularyId: vocab.id,
            prompt: entry.prompt,
            options,
            correctOptionIndex,
          },
        });
      }

      vocabAccumulator.push({ vocabularyId: vocab.id, word: entry.word, meaning: entry.meaning });
    }
  }

  return vocabAccumulator;
}

async function seedAnalytics(vocabulary: Array<{ vocabularyId: string; word: string; meaning: string }>) {
  let analytics: AnalyticsDb = { reviews: {} };
  try {
    const raw = await fs.readFile(ANALYTICS_FILE, "utf8");
    analytics = JSON.parse(raw) as AnalyticsDb;
    if (!analytics.reviews) analytics.reviews = {};
  } catch {
    analytics = { reviews: {} };
  }

  for (let i = 0; i < vocabulary.length; i += 1) {
    const item = vocabulary[i];
    const key = `${USER_ID}::${item.vocabularyId}`;
    const cycle = i % 5;
    const totalReviews = 6 + (i % 12);
    const incorrectCount = cycle === 0 ? 1 : cycle === 1 ? 2 : 3;
    const correctCount = totalReviews - incorrectCount;
    const correctStreak = cycle === 4 ? 5 : cycle === 3 ? 3 : cycle === 2 ? 2 : 1;
    const status: "learning" | "mastered" = correctStreak >= 3 ? "mastered" : "learning";
    const intervalDays = status === "mastered" ? 5 + (i % 16) : 1 + (i % 4);
    const easeFactor = Number((2.45 - cycle * 0.18 + (i % 3) * 0.06).toFixed(2));

    const lastReviewedAt = monthAgo(1 + (i % 28));
    const dueBiasDays = i % 3 === 0 ? -2 : i % 3 === 1 ? 0 : 2;
    const nextReviewAt = new Date(lastReviewedAt.getTime() + (intervalDays + dueBiasDays) * 24 * 60 * 60 * 1000);

    analytics.reviews[key] = {
      userId: USER_ID,
      vocabularyId: item.vocabularyId,
      word: item.word,
      translation: item.meaning,
      status,
      correctCount,
      incorrectCount,
      correctStreak,
      totalReviews,
      intervalDays,
      easeFactor: Math.max(1.3, Math.min(2.9, easeFactor)),
      nextReviewAt: nextReviewAt.toISOString(),
      lastReviewedAt: lastReviewedAt.toISOString(),
    };
  }

  await fs.writeFile(ANALYTICS_FILE, JSON.stringify(analytics, null, 2), "utf8");
}

async function main() {
  const vocabulary = await seedLessons();
  await seedAnalytics(vocabulary);
  console.log(`Seeded mock month data for user ${USER_ID}: ${lessons.length} lessons, ${vocabulary.length} vocabulary reviews.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
