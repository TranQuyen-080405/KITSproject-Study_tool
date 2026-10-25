// Parses a semicolon-separated CSV for multiple-choice questions (MCQ).
export type CsvQuizItem = {
  prompt: string;
  options: [string, string, string, string];
  correctOptionIndex: number;
  explanation?: string;
};

export type QuizCsvParseResult = {
  questions: CsvQuizItem[];
  skippedRows: number;
};

/** Minimal RFC-4180 style parser using ";" as delimiter (supports quoted fields). */
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

function parseCorrectAnswer(raw: string, options: [string, string, string, string]): number {
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();

  if (upper === "A" || trimmed === "1") return 0;
  if (upper === "B" || trimmed === "2") return 1;
  if (upper === "C" || trimmed === "3") return 2;
  if (upper === "D" || trimmed === "4") return 3;

  if (trimmed === "0") return 0;

  // Try matching against the option text directly
  for (let i = 0; i < options.length; i++) {
    if (options[i].trim().toLowerCase() === trimmed.toLowerCase() && trimmed !== "") {
      return i;
    }
  }

  return 0; // Default to option A if unparseable
}

export function parseQuizCsv(rawText: string): QuizCsvParseResult {
  const text = rawText.replace(/^\uFEFF/, "");
  const rows = parseRows(text, ";").filter((r) => r.some((cell) => cell.trim() !== ""));

  if (rows.length === 0) {
    return { questions: [], skippedRows: 0 };
  }

  let promptIdx = 1;
  let optAIdx = 2;
  let optBIdx = 3;
  let optCIdx = 4;
  let optDIdx = 5;
  let answerIdx = 6;
  let explanationIdx = 7;
  let dataRows = rows;

  const firstRow = rows[0].map((c) => c.trim().toLowerCase());
  const hasHeader = firstRow.some(
    (c) =>
      c.includes("question") ||
      c.includes("prompt") ||
      c.includes("câu hỏi") ||
      c.includes("option") ||
      c.includes("phương án") ||
      c.includes("correct") ||
      c.includes("đáp án"),
  );

  if (hasHeader) {
    dataRows = rows.slice(1);
    const p = firstRow.findIndex((c) => c.includes("question") || c.includes("prompt") || c.includes("câu hỏi"));
    if (p !== -1) promptIdx = p;

    const a = firstRow.findIndex((c) => c === "optiona" || c === "a" || c.includes("phương án a") || c.includes("option a"));
    const b = firstRow.findIndex((c) => c === "optionb" || c === "b" || c.includes("phương án b") || c.includes("option b"));
    const c = firstRow.findIndex((c) => c === "optionc" || c === "c" || c.includes("phương án c") || c.includes("option c"));
    const d = firstRow.findIndex((c) => c === "optiond" || c === "d" || c.includes("phương án d") || c.includes("option d"));

    if (a !== -1) optAIdx = a;
    if (b !== -1) optBIdx = b;
    if (c !== -1) optCIdx = c;
    if (d !== -1) optDIdx = d;

    const ans = firstRow.findIndex(
      (col) =>
        col.includes("correct") ||
        col.includes("answer") ||
        col.includes("đáp án") ||
        col === "key",
    );
    if (ans !== -1) answerIdx = ans;

    const exp = firstRow.findIndex((col) => col.includes("explanation") || col.includes("giải thích"));
    if (exp !== -1) explanationIdx = exp;
  } else {
    // If first column is not numeric, question might start at column 0
    if (isNaN(Number(rows[0][0]?.trim()))) {
      promptIdx = 0;
      optAIdx = 1;
      optBIdx = 2;
      optCIdx = 3;
      optDIdx = 4;
      answerIdx = 5;
      explanationIdx = 6;
    }
  }

  const questions: CsvQuizItem[] = [];
  let skippedRows = 0;

  for (const r of dataRows) {
    const prompt = (r[promptIdx] ?? "").trim();
    if (!prompt) {
      skippedRows++;
      continue;
    }

    const optA = (r[optAIdx] ?? "").trim();
    const optB = (r[optBIdx] ?? "").trim();
    const optC = (r[optCIdx] ?? "").trim();
    const optD = (r[optDIdx] ?? "").trim();
    const options: [string, string, string, string] = [optA, optB, optC, optD];

    const rawAns = answerIdx >= 0 ? (r[answerIdx] ?? "").trim() : "A";
    const correctOptionIndex = parseCorrectAnswer(rawAns, options);

    const explanation = explanationIdx >= 0 && r[explanationIdx] ? r[explanationIdx].trim() : undefined;

    questions.push({
      prompt,
      options,
      correctOptionIndex,
      explanation,
    });
  }

  return { questions, skippedRows };
}
