import { describe, expect, it, vi } from "vitest";
import { completeFlashcardCsv, parseFlashcardCsv } from "../src/lib/flashcard-csv";

describe("flashcard CSV parsing", () => {
  it("keeps either missing side and skips only rows empty on both sides", () => {
    const parsed = parseFlashcardCsv("ID;Front;Back\n1;사과;Quả táo\n2;물;\n3;;Con mèo\n4;;\n;;\n");
    expect(parsed.cards).toEqual([{ front: "사과", back: "Quả táo" }, { front: "물", back: "" }, { front: "", back: "Con mèo" }]);
    expect(parsed.skippedRows).toBe(2);
  });
  it("handles missing columns, two-column rows, BOM, quotes and reordered headers", () => {
    expect(parseFlashcardCsv("ID;Back\n1;Nước").cards).toEqual([{ front: "", back: "Nước" }]);
    expect(parseFlashcardCsv("Front\n물").cards).toEqual([{ front: "물", back: "" }]);
    expect(parseFlashcardCsv(";Nước\n물;").cards).toEqual([{ front: "", back: "Nước" }, { front: "물", back: "" }]);
    expect(parseFlashcardCsv('\uFEFFBack;ID;Front\r\n"Nghĩa; có dấu";1;물').cards).toEqual([{ front: "물", back: "Nghĩa; có dấu" }]);
  });
});
describe("AI completion before CSV import", () => {
  it("requests only incomplete rows, maps by index, and preserves supplied cells", async () => {
    const complete = vi.fn().mockResolvedValue({ cards: [
      { index: 2, front: "고양이", back: "AI changed meaning" },
      { index: 1, front: "AI changed Korean", back: "Nước" },
    ] });
    const result = await completeFlashcardCsv([
      { front: "사과", back: "Quả táo" }, { front: "물", back: "" },
      { front: "", back: "Con mèo" }, { front: "  ", back: "" },
    ], complete);
    expect(complete).toHaveBeenCalledExactlyOnceWith([
      { index: 1, front: "물", back: "" }, { index: 2, front: "", back: "Con mèo" },
    ]);
    expect(result).toEqual({ cards: [
      { front: "사과", back: "Quả táo" }, { front: "물", back: "Nước" }, { front: "고양이", back: "Con mèo" },
    ], skippedRows: 1 });
  });
  it("does not call AI when all cards already have both sides", async () => {
    const complete = vi.fn();
    expect((await completeFlashcardCsv([{ front: " 물 ", back: " Nước " }], complete)).cards).toEqual([{ front: "물", back: "Nước" }]);
    expect(complete).not.toHaveBeenCalled();
  });
  it("rejects missing, duplicate, empty or unrelated AI results instead of saving partial cards", async () => {
    for (const cards of [[], [{ index: 0, front: "물", back: "" }],
      [{ index: 9, front: "물", back: "Nước" }],
      [{ index: 0, front: "물", back: "Nước" }, { index: 0, front: "물", back: "Nước" }]]) {
      await expect(completeFlashcardCsv([{ front: "물", back: "" }], vi.fn().mockResolvedValue({ cards }))).rejects.toThrow();
    }
  });
  it("fails before AI for empty or oversized imports and propagates provider errors", async () => {
    const complete = vi.fn();
    await expect(completeFlashcardCsv([{ front: "", back: "" }], complete)).rejects.toThrow();
    await expect(completeFlashcardCsv(Array.from({ length: 201 }, () => ({ front: "물", back: "" })), complete)).rejects.toThrow("200");
    expect(complete).not.toHaveBeenCalled();
    await expect(completeFlashcardCsv([{ front: "물", back: "" }], vi.fn().mockRejectedValue(new Error("AI offline")))).rejects.toThrow("AI offline");
  });
});
