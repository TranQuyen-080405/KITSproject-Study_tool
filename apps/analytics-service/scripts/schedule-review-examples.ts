/**
 * Reproduce the three scheduleReview flows used in the SM-2 report.
 * Input is only what a learner submits. Interval, streak and ease factor
 * come back from the Analytics Service function and are written to JSON.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scheduleReview, type ReviewRecord } from "../src/services/index.js";

type Answer = "đúng" | "sai";

type Step = {
  when: string;
  answer: Answer;
  seconds: number;
  note: string;
};

type Scenario = {
  title: string;
  word: string;
  steps: Step[];
};

const scenarios: Scenario[] = [
  {
    title: "Nhánh thuộc",
    word: "사과",
    steps: [
      { when: "02/11/2026 08:00", answer: "đúng", seconds: 4.8, note: "Lần 1, đúng nhưng chậm" },
      { when: "03/11/2026 08:12", answer: "đúng", seconds: 1.6, note: "Đúng hẹn 1 ngày, trả lời nhanh" },
      { when: "06/11/2026 09:05", answer: "đúng", seconds: 0.9, note: "Đúng hẹn 3 ngày, trả lời nhanh" },
      { when: "14/11/2026 19:40", answer: "đúng", seconds: 2.1, note: "Ôn lại đúng hẹn, vẫn nhanh" },
    ],
  },
  {
    title: "Nhánh không thuộc",
    word: "레몬",
    steps: [
      { when: "02/11/2026 08:05", answer: "sai", seconds: 6.2, note: "Gặp lần đầu, sai" },
      { when: "02/11/2026 08:16", answer: "đúng", seconds: 3.5, note: "Ôn lại sau 10 phút, đúng chậm" },
      { when: "03/11/2026 08:20", answer: "sai", seconds: 5.1, note: "Hôm sau vẫn sai" },
      { when: "03/11/2026 08:31", answer: "đúng", seconds: 2.8, note: "Ôn lại sau 10 phút, đúng nhưng chậm" },
      { when: "04/11/2026 07:50", answer: "đúng", seconds: 1.4, note: "Hôm sau đúng và nhanh" },
    ],
  },
  {
    title: "Nhánh người học thật",
    word: "바나나",
    steps: [
      { when: "02/11/2026 20:10", answer: "đúng", seconds: 5.2, note: "Tối thứ Hai, đoán đúng nhưng do dự" },
      { when: "03/11/2026 20:05", answer: "đúng", seconds: 1.1, note: "Tối hôm sau, nhớ ngay" },
      { when: "06/11/2026 21:15", answer: "sai", seconds: 8, note: "Đến hạn 3 ngày nhưng quên" },
      { when: "06/11/2026 21:26", answer: "đúng", seconds: 3.6, note: "Xem lại rồi trả lời đúng, chậm" },
      { when: "07/11/2026 18:40", answer: "đúng", seconds: 1.7, note: "Chiều hôm sau, trả lời nhanh" },
      { when: "10/11/2026 19:05", answer: "đúng", seconds: 2.2, note: "Đúng hẹn, vẫn nhanh, lên mastered" },
    ],
  },
];

const outputPath = resolve(dirname(fileURLToPath(import.meta.url)), "output", "schedule-review-examples.json");

function toReviewedAt(when: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(when);
  if (!match) throw new Error(`Thời điểm không đọc được: ${when}`);
  const [, day, month, year, hour, minute] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:00+07:00`;
}

function formatLocal(value: string): string {
  const shifted = new Date(new Date(value).getTime() + 7 * 60 * 60 * 1000);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(shifted.getUTCDate())}/${pad(shifted.getUTCMonth() + 1)} ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

function formulaResult(record: ReviewRecord) {
  return {
    n: record.correctStreak,
    intervalDays: record.intervalDays,
    easeFactor: record.easeFactor,
    status: record.status,
    nextReviewAt: formatLocal(record.nextReviewAt),
  };
}

const report = {
  timezone: "Asia/Ho_Chi_Minh",
  scenarios: scenarios.map((scenario) => {
    let record: ReviewRecord | undefined;
    return {
      title: scenario.title,
      word: scenario.word,
      steps: scenario.steps.map((step) => {
        record = scheduleReview(record, {
          userId: "hocvien",
          cardId: scenario.word,
          deckId: "tu-vung",
          word: scenario.word,
          correct: step.answer === "đúng",
          reviewedAt: toReviewedAt(step.when),
          responseTimeMs: Math.round(step.seconds * 1000),
        });
        return {
          input: {
            when: step.when,
            answer: step.answer,
            seconds: step.seconds,
            note: step.note,
          },
          output: formulaResult(record),
        };
      }),
    };
  }),
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(outputPath);
