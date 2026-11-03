export type ReviewQuizWord = {
  cardId: string;
  deckId?: string;
  word: string;
  translation?: string;
};

export type ReviewQuizQuestion = {
  cardId: string;
  deckId?: string;
  word: string;
  translation: string;
  prompt: string;
  options: string[];
  correctIndex: number;
};

const FALLBACK_MEANINGS = [
  "nước",
  "đi học",
  "xin chào",
  "cảm ơn",
  "nhà",
  "bạn",
  "ăn",
  "ngủ",
  "sách",
  "trường",
];

function meaningKey(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueMeanings(words: ReviewQuizWord[]): string[] {
  const seen = new Set<string>();
  const meanings: string[] = [];
  for (const word of words) {
    const meaning = word.translation?.trim();
    if (!meaning) continue;
    const key = meaningKey(meaning);
    if (seen.has(key)) continue;
    seen.add(key);
    meanings.push(meaning);
  }
  return meanings;
}

function shuffle<T>(items: T[], random = Math.random): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

export function buildReviewQuiz(
  words: ReviewQuizWord[],
  extras: ReviewQuizWord[] = [],
  random = Math.random,
): ReviewQuizQuestion[] {
  const pool = uniqueMeanings([...words, ...extras]);
  const questions: ReviewQuizQuestion[] = [];

  for (const item of words) {
    const front = item.word.trim();
    const translation = item.translation?.trim();
    if (!front || !translation) continue;

    const used = new Set([meaningKey(translation)]);
    const distractors: string[] = [];
    for (const meaning of [...pool, ...FALLBACK_MEANINGS]) {
      const key = meaningKey(meaning);
      if (used.has(key)) continue;
      used.add(key);
      distractors.push(meaning);
      if (distractors.length === 3) break;
    }
    if (distractors.length === 0) continue;

    const options = shuffle([translation, ...distractors], random);
    questions.push({
      cardId: item.cardId || front,
      deckId: item.deckId,
      word: front,
      translation,
      prompt: `“${front}” nghĩa là gì?`,
      options,
      correctIndex: options.findIndex((option) => meaningKey(option) === meaningKey(translation)),
    });
  }

  return questions;
}
