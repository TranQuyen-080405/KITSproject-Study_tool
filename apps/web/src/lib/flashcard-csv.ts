// Parses a semicolon-separated CSV (columns: ID;Front;Back) into flashcard items.
import { aiApi } from "../api/ai-api";
import type { CardItem } from "../api/flashcard-api";

export type CsvParseResult = {
  cards: CardItem[];
  /** Rows ignored because both Front and Back were empty. */
  skippedRows: number;
};

/** Minimal RFC-4180 style parser using ";" as the delimiter (supports quoted fields). */
function parseRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function parseFlashcardCsv(rawText: string): CsvParseResult {
  const text = rawText.replace(/^\uFEFF/, "");
  const parsedRows = parseRows(text, ";");
  const rows = parsedRows.filter((r) => r.some((cell) => cell.trim() !== ""));

  let frontIdx = 1;
  let backIdx = 2;
  let dataRows = rows;

  // Optional header row: ID;Front;Back (tolerates the "Fron" typo).
  if (rows.length > 0) {
    const header = rows[0].map((c) => c.trim().toLowerCase());
    const f = header.findIndex((c) => c === "front" || c === "fron");
    const b = header.findIndex((c) => c === "back");
    if (f !== -1 || b !== -1) {
      frontIdx = f;
      backIdx = b;
      dataRows = rows.slice(1);
    } else if (rows[0].length === 2) {
      frontIdx = 0;
      backIdx = 1;
    } else if (rows[0].length === 1) {
      frontIdx = 0;
      backIdx = -1;
    }
  }

  const cards: CardItem[] = [];
  let skippedRows = parsedRows.length - rows.length;
  for (const r of dataRows) {
    const front = (r[frontIdx] ?? "").trim();
    const back = backIdx >= 0 ? (r[backIdx] ?? "").trim() : "";
    if (!front && !back) {
      skippedRows++;
      continue;
    }
    cards.push({ front, back });
  }
  return { cards, skippedRows };
}


/** Fill only missing sides; reject incomplete/ambiguous AI output before any cards are saved. */
export async function completeFlashcardCsv(
  input: CardItem[],
  complete = aiApi.completeFlashcards,
): Promise<CsvParseResult> {
  const normalized = input.map((card) => ({ front: card.front.trim(), back: card.back.trim() }));
  const cards = normalized.filter((card) => card.front || card.back);
  const skippedRows = normalized.length - cards.length;
  if (!cards.length) throw new Error("Không có thẻ có nội dung để lưu.");
  if (cards.length > 200) throw new Error("Mỗi lần chỉ có thể nhập tối đa 200 thẻ.");
  const missing = cards.flatMap((card, index) => !card.front || !card.back ? [{ ...card, index }] : []);
  if (!missing.length) return { cards, skippedRows };
  const response = await complete(missing);
  if (!Array.isArray(response.cards)) throw new Error("AI chưa điền đủ các mặt còn thiếu.");
  const targets = new Map(missing.map((card) => [card.index, card]));
  const seen = new Set<number>();
  for (const item of response.cards) {
    const original = targets.get(item.index);
    if (!original || seen.has(item.index) || typeof item.front !== "string" || typeof item.back !== "string") {
      throw new Error("AI trả về dữ liệu không khớp các dòng CSV. Vui lòng thử lại.");
    }
    const front = original.front || item.front.trim();
    const back = original.back || item.back.trim();
    if (!front || !back || front.length > 500 || back.length > 2000) throw new Error("AI chưa điền đầy đủ nội dung hợp lệ cho các thẻ.");
    cards[item.index] = { front, back };
    seen.add(item.index);
  }
  if (seen.size !== missing.length) throw new Error("AI chưa điền đủ các mặt còn thiếu. Vui lòng thử lại.");
  return { cards, skippedRows };
}
