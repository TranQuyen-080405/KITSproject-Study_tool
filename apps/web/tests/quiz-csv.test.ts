import { describe, expect, it } from "vitest";
import { parseQuizCsv } from "../src/lib/quiz-csv";
import * as fs from "fs";
import * as path from "path";

describe("parseQuizCsv", () => {
  it("should parse sample-quiz.csv correctly", () => {
    const csvPath = path.resolve(__dirname, "../../../assets/sample-quiz.csv");
    const raw = fs.readFileSync(csvPath, "utf-8");
    const result = parseQuizCsv(raw);

    expect(result.skippedRows).toBe(0);
    expect(result.questions).toHaveLength(5);

    // Question 1
    expect(result.questions[0].prompt).toBe("Từ nào sau đây có nghĩa là 'Xin chào'?");
    expect(result.questions[0].options).toEqual(["안녕하세요", "감사합니다", "죄송합니다", "잘 가요"]);
    expect(result.questions[0].correctOptionIndex).toBe(0); // A

    // Question 3
    expect(result.questions[2].prompt).toBe("Đâu là cách nói 'Cảm ơn' trang trọng?");
    expect(result.questions[2].options[1]).toBe("감사합니다");
    expect(result.questions[2].correctOptionIndex).toBe(1); // B
  });

  it("should handle numeric correct answers (1-based and 0-based)", () => {
    const csv = `Question;A;B;C;D;Answer
Câu 1;opt1;opt2;opt3;opt4;3
Câu 2;opt1;opt2;opt3;opt4;0`;
    const result = parseQuizCsv(csv);
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].correctOptionIndex).toBe(2); // '3' -> index 2
    expect(result.questions[1].correctOptionIndex).toBe(0); // '0' -> index 0
  });

  it("should handle direct matching string for correct answer", () => {
    const csv = `Question;A;B;C;D;Answer
Thủ đô của Hàn Quốc là gì?;Busan;Seoul;Incheon;Daegu;Seoul`;
    const result = parseQuizCsv(csv);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].correctOptionIndex).toBe(1); // Seoul is index 1
  });
});
