import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export type WordCorrectnessRecord = {
  userId: string;
  wordId: string;
  wordText: string;
  correctCount: number;
  wrongCount: number;
};

type AnalyticsData = { wordRecords: WordCorrectnessRecord[]; processedEventIds: string[] };

const dataPath = fileURLToPath(new URL("../../data/word-correctness.json", import.meta.url));
const guestRecords = new Map<string, WordCorrectnessRecord>();
const guestProcessedEventIds = new Set<string>();

function isGuest(userId: string): boolean {
  return userId === "guest-user";
}

async function readData(): Promise<AnalyticsData> {
  return JSON.parse(await readFile(dataPath, "utf8")) as AnalyticsData;
}

export async function recordAnswer(
  eventId: string,
  userId: string,
  wordId: string,
  wordText: string,
  isCorrect: boolean,
): Promise<void> {
  if (isGuest(userId)) {
    if (guestProcessedEventIds.has(eventId)) return;
    const key = `${userId}:${wordId}`;
    const record = guestRecords.get(key) ?? { userId, wordId, wordText, correctCount: 0, wrongCount: 0 };
    if (isCorrect) record.correctCount += 1;
    else record.wrongCount += 1;
    guestRecords.set(key, record);
    guestProcessedEventIds.add(eventId);
    return;
  }

  const data = await readData();
  if (data.processedEventIds.includes(eventId)) return;
  const key = `${userId}:${wordId}`;
  const record =
    data.wordRecords.find((item) => `${item.userId}:${item.wordId}` === key) ??
    { userId, wordId, wordText, correctCount: 0, wrongCount: 0 };
  if (isCorrect) record.correctCount += 1;
  else record.wrongCount += 1;
  if (!data.wordRecords.includes(record)) data.wordRecords.push(record);
  data.processedEventIds.push(eventId);
  await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`);
}

export async function listWordCorrectness(userId: string): Promise<WordCorrectnessRecord[]> {
  if (isGuest(userId)) {
    return [...guestRecords.values()].filter((record) => record.userId === userId);
  }
  return (await readData()).wordRecords.filter((record) => record.userId === userId);
}
