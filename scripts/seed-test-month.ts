import { createRequire } from "node:module";
import { scheduleReview, type ReviewRecord } from "../apps/analytics-service/src/services/index.ts";

const require = createRequire(new URL("../apps/content-service/package.json", import.meta.url));
const pg = require("pg") as typeof import("pg");

const USER_ID = "1";
const CONTENT_URL = "postgresql://postgres:postgres@localhost:5432/content_service";
const ANALYTICS_URL = "postgresql://postgres:postgres@localhost:5432/analytics_service";

type Entry = { front: string; back: string };
type DeckSeed = { id: string; title: string; description: string; daysAgo: number; entries: Entry[] };

const decks: DeckSeed[] = [
  { id: "test-month-01", title: "Gia đình", description: "Người trong nhà.", daysAgo: 29, entries: [
    ["아버지", "bố"], ["어머니", "mẹ"], ["형", "anh trai"], ["누나", "chị gái"],
    ["동생", "em"], ["할머니", "bà"], ["할아버지", "ông"], ["가족", "gia đình"],
  ].map(([front, back]) => ({ front, back })) },
  { id: "test-month-02", title: "Thời tiết", description: "Nói về trời và nhiệt độ.", daysAgo: 26, entries: [
    ["날씨", "thời tiết"], ["비", "mưa"], ["눈", "tuyết"], ["바람", "gió"],
    ["맑다", "nắng"], ["흐리다", "nhiều mây"], ["덥다", "nóng"], ["춥다", "lạnh"],
  ].map(([front, back]) => ({ front, back })) },
  { id: "test-month-03", title: "Cơ thể", description: "Bộ phận cơ thể.", daysAgo: 24, entries: [
    ["머리", "đầu"], ["눈", "mắt"], ["코", "mũi"], ["입", "miệng"],
    ["귀", "tai"], ["손", "tay"], ["발", "chân"], ["배", "bụng"],
  ].map(([front, back]) => ({ front, back })) },
  { id: "test-month-04", title: "Màu sắc", description: "Tên các màu.", daysAgo: 21, entries: [
    ["빨간색", "đỏ"], ["파란색", "xanh dương"], ["노란색", "vàng"], ["초록색", "xanh lá"],
    ["검은색", "đen"], ["흰색", "trắng"], ["분홍색", "hồng"], ["보라색", "tím"],
  ].map(([front, back]) => ({ front, back })) },
  { id: "test-month-05", title: "Trường học", description: "Lớp học và đồ dùng.", daysAgo: 18, entries: [
    ["학교", "trường"], ["선생님", "giáo viên"], ["학생", "học sinh"], ["교실", "lớp học"],
    ["책", "sách"], ["연필", "bút chì"], ["숙제", "bài tập"], ["시험", "bài kiểm tra"],
  ].map(([front, back]) => ({ front, back })) },
  { id: "test-month-06", title: "Nhà cửa", description: "Phòng và đồ trong nhà.", daysAgo: 16, entries: [
    ["집", "nhà"], ["방", "phòng"], ["부엌", "nhà bếp"], ["화장실", "nhà vệ sinh"],
    ["창문", "cửa sổ"], ["문", "cửa"], ["침대", "giường"], ["의자", "ghế"],
  ].map(([front, back]) => ({ front, back })) },
  { id: "test-month-07", title: "Cảm xúc", description: "Nói cảm giác của mình.", daysAgo: 13, entries: [
    ["행복하다", "hạnh phúc"], ["슬프다", "buồn"], ["화나다", "giận"], ["무섭다", "sợ"],
    ["피곤하다", "mệt"], ["심심하다", "chán"], ["즐겁다", "vui"], ["외롭다", "cô đơn"],
  ].map(([front, back]) => ({ front, back })) },
  { id: "test-month-08", title: "Quần áo", description: "Đồ mặc hằng ngày.", daysAgo: 10, entries: [
    ["옷", "quần áo"], ["바지", "quần"], ["치마", "váy"], ["셔츠", "áo sơ mi"],
    ["모자", "mũ"], ["신발", "giày"], ["양말", "tất"], ["가방", "túi"],
  ].map(([front, back]) => ({ front, back })) },
  { id: "test-month-09", title: "Động vật", description: "Tên một số con vật.", daysAgo: 7, entries: [
    ["개", "chó"], ["고양이", "mèo"], ["새", "chim"], ["물고기", "cá"],
    ["소", "bò"], ["돼지", "lợn"], ["말", "ngựa"], ["토끼", "thỏ"],
  ].map(([front, back]) => ({ front, back })) },
  { id: "test-month-10", title: "Du lịch", description: "Đi lại và chỗ ở.", daysAgo: 4, entries: [
    ["여행", "du lịch"], ["비행기", "máy bay"], ["호텔", "khách sạn"], ["여권", "hộ chiếu"],
    ["지도", "bản đồ"], ["표", "vé"], ["공항", "sân bay"], ["짐", "hành lý"],
  ].map(([front, back]) => ({ front, back })) },
];

function utcStamp(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function daysAgo(days: number, hour = 19): Date {
  const vietnam = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return new Date(Date.UTC(
    vietnam.getUTCFullYear(),
    vietnam.getUTCMonth(),
    vietnam.getUTCDate() - days,
    hour - 7,
    (days * 7) % 50,
  ));
}

function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function studyDays(): number[] {
  const recent = [0, 1, 2, 3, 4, 5];
  const longRun = [12, 13, 14, 15, 16, 17, 18, 19, 20];
  const scattered = [8, 10, 23, 25, 27, 29];
  return [...new Set([...recent, ...longRun, ...scattered])].sort((a, b) => b - a);
}

function streakFrom(days: number[]): { current: number; longest: number; last: string } {
  const keys = new Set(days.map((day) => dayKey(daysAgo(day))));
  let current = 0;
  for (let back = 0; keys.has(dayKey(daysAgo(back))); back += 1) current += 1;
  const sorted = [...keys].sort();
  let longest = 0;
  let run = 0;
  let previous = "";
  for (const key of sorted) {
    const prevDate = new Date(`${previous}T00:00:00`);
    const nextDate = new Date(`${key}T00:00:00`);
    const continues = previous && nextDate.getTime() - prevDate.getTime() === 86_400_000;
    run = continues ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = key;
  }
  return { current, longest: Math.max(longest, current), last: dayKey(daysAgo(0)) };
}

async function main() {
  const content = new pg.Client({ connectionString: CONTENT_URL });
  const analytics = new pg.Client({ connectionString: ANALYTICS_URL });
  await content.connect();
  await analytics.connect();
  await content.query("SET TIME ZONE 'UTC'");
  await analytics.query("SET TIME ZONE 'UTC'");
  try {
    await content.query("BEGIN");
    const cards: Array<{ id: string; deckId: string; deckTitle: string; front: string; back: string; created: Date }> = [];
    for (const deck of decks) {
      const created = daysAgo(deck.daysAgo, 18);
      await content.query(
        `INSERT INTO "Flashcard" (id, title, description, "userId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $5)
         ON CONFLICT (id) DO UPDATE
         SET title = EXCLUDED.title, description = EXCLUDED.description, "userId" = EXCLUDED."userId", "createdAt" = EXCLUDED."createdAt", "updatedAt" = EXCLUDED."updatedAt"`,
        [deck.id, deck.title, deck.description, USER_ID, utcStamp(created)],
      );
      await content.query(`DELETE FROM "Question" WHERE "flashcardId" = $1`, [deck.id]);
      await content.query(`DELETE FROM "Card" WHERE "flashcardId" = $1`, [deck.id]);
      for (let index = 0; index < deck.entries.length; index += 1) {
        const entry = deck.entries[index];
        const cardId = `${deck.id}-c${index + 1}`;
        await content.query(
          `INSERT INTO "Card" (id, "flashcardId", front, back, "orderIndex", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $6)`,
          [cardId, deck.id, entry.front, entry.back, index, utcStamp(created)],
        );
        cards.push({ id: cardId, deckId: deck.id, deckTitle: deck.title, front: entry.front, back: entry.back, created });
      }
    }
    await content.query(
      `UPDATE "Flashcard" SET "createdAt" = $1 WHERE id = $2 AND "userId" = $3`,
      [utcStamp(daysAgo(27, 20)), "9b71608c-ad30-4e83-af4f-c6a6dfd014ee", USER_ID],
    );
    await content.query(
      `UPDATE "Flashcard" SET "createdAt" = $1 WHERE id = $2 AND "userId" = $3`,
      [utcStamp(daysAgo(15, 11)), "92f6e57d-89fa-4ca5-ab05-0480a7b85e90", USER_ID],
    );
    await content.query("COMMIT");

    await analytics.query("BEGIN");
    let due = 0;
    let waiting = 0;
    let mastered = 0;
    for (let index = 0; index < cards.length; index += 1) {
      const card = cards[index];
      const lastDays = 1 + (index % 26);
      const speed = 1400 + (index % 5) * 700;
      let record: ReviewRecord | undefined;
      const pattern = index % 4;
      const steps: Array<{ days: number; correct: boolean }> = pattern === 0
        ? [{ days: lastDays, correct: true }]
        : pattern === 1
          ? [{ days: lastDays + 4, correct: true }, { days: lastDays, correct: true }]
          : pattern === 2
            ? [{ days: lastDays + 8, correct: true }, { days: lastDays + 4, correct: false }, { days: lastDays + 3, correct: true }, { days: lastDays, correct: true }]
            : [{ days: lastDays + 10, correct: true }, { days: lastDays + 6, correct: true }, { days: lastDays, correct: true }];
      for (const step of steps) {
        record = scheduleReview(record, {
          userId: USER_ID,
          cardId: card.id,
          deckId: card.deckId,
          front: card.front,
          back: card.back,
          correct: step.correct,
          reviewedAt: daysAgo(step.days, 19).toISOString(),
          responseTimeMs: speed,
        });
      }
      if (!record) continue;
      if (record.status === "mastered") mastered += 1;
      if (new Date(record.nextReviewAt).getTime() <= Date.now()) due += 1;
      else waiting += 1;
      await analytics.query(
        `INSERT INTO "UserReview"
          (id, "userId", "cardId", "deckId", word, front, translation, back, status,
           "correctCount", "incorrectCount", "correctStreak", "totalReviews", "intervalDays", "easeFactor",
           "nextReviewAt", "lastReviewedAt", "lastResponseTimeMs", "averageResponseTimeMs", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$20)
         ON CONFLICT ("userId", "cardId") DO UPDATE SET
           "deckId" = EXCLUDED."deckId", word = EXCLUDED.word, front = EXCLUDED.front,
           translation = EXCLUDED.translation, back = EXCLUDED.back, status = EXCLUDED.status,
           "correctCount" = EXCLUDED."correctCount", "incorrectCount" = EXCLUDED."incorrectCount",
           "correctStreak" = EXCLUDED."correctStreak", "totalReviews" = EXCLUDED."totalReviews",
           "intervalDays" = EXCLUDED."intervalDays", "easeFactor" = EXCLUDED."easeFactor",
           "nextReviewAt" = EXCLUDED."nextReviewAt", "lastReviewedAt" = EXCLUDED."lastReviewedAt",
           "lastResponseTimeMs" = EXCLUDED."lastResponseTimeMs", "averageResponseTimeMs" = EXCLUDED."averageResponseTimeMs",
           "updatedAt" = EXCLUDED."updatedAt"`,
        [
          card.id, USER_ID, card.id, card.deckId, card.front, card.front, card.back, card.back, record.status,
          record.correctCount, record.incorrectCount, record.correctStreak, record.totalReviews, record.intervalDays, record.easeFactor,
          utcStamp(new Date(record.nextReviewAt)), utcStamp(new Date(record.lastReviewedAt)), record.lastResponseTimeMs ?? speed, record.averageResponseTimeMs ?? speed,
          utcStamp(card.created),
        ],
      );
    }

    const days = studyDays();
    for (let index = 0; index < days.length; index += 1) {
      const deck = decks[index % decks.length];
      const total = 8;
      const correct = 5 + (index % 4);
      const duration = 180 + (index % 6) * 70;
      await analytics.query(
        `INSERT INTO "StudySession"
          (id, "userId", "deckId", "deckTitle", "sessionType", "totalCardsOrQuestions", "correctCount",
           "scorePercentage", "durationSeconds", "averageResponseTimeMs", "completedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO UPDATE SET
           "completedAt" = EXCLUDED."completedAt", "correctCount" = EXCLUDED."correctCount",
           "scorePercentage" = EXCLUDED."scorePercentage", "durationSeconds" = EXCLUDED."durationSeconds"`,
        [
          `test-month-session-${String(index + 1).padStart(2, "0")}`,
          USER_ID,
          deck.id,
          deck.title,
          index % 3 === 0 ? "daily_review" : "deck_study",
          total,
          correct,
          Math.round((correct / total) * 100),
          duration,
          1800 + (index % 5) * 400,
          utcStamp(daysAgo(days[index], 20)),
        ],
      );
    }
    const streak = streakFrom(days);
    await analytics.query(
      `INSERT INTO "UserStreak" ("userId", "currentStreak", "longestStreak", "lastStudiedDate", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT ("userId") DO UPDATE SET
         "currentStreak" = EXCLUDED."currentStreak",
         "longestStreak" = GREATEST("UserStreak"."longestStreak", EXCLUDED."longestStreak"),
         "lastStudiedDate" = EXCLUDED."lastStudiedDate",
         "updatedAt" = NOW()`,
      [USER_ID, streak.current, streak.longest, streak.last],
    );
    await analytics.query("COMMIT");
    console.log(JSON.stringify({
      userId: USER_ID,
      decks: decks.length,
      cards: cards.length,
      sessions: days.length,
      mastered,
      due,
      waiting,
      streak,
    }, null, 2));
  } catch (error) {
    await content.query("ROLLBACK").catch(() => undefined);
    await analytics.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await content.end();
    await analytics.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
