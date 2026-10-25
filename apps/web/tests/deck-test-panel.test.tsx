// @vitest-environment jsdom
import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeckTestPanel } from "../src/components/deck-test-panel";
import { deckTestsApi, type TestSession, type TestProgress } from "../src/api/deck-tests-api";
import { testDraftKey } from "../src/lib/deck-test-draft";

vi.mock("../src/api/deck-tests-api", () => ({
  deckTestsApi: { list: vi.fn(), get: vi.fn(), start: vi.fn(), answer: vi.fn(), saveAnswers: vi.fn(), submit: vi.fn() },
}));
const fixture = (completed = false, count = 2): TestSession => ({
  id: completed ? "old" : "new", userId: "7", flashcardId: "deck", sourceSessionId: completed ? null : "old",
  deckTitle: "Từ vựng", createdAt: "2026-10-24T10:00:00.000Z",
  completedAt: completed ? "2026-10-24T10:05:00.000Z" : null,
  correctCount: completed ? 1 : 0, totalQuestions: count, scorePercentage: completed ? 50 : 0,
  questions: Array.from({ length: count }, (_, index) => ({
    id: "q" + (index + 1), cardId: "c" + (index + 1), word: index % 2 ? "물" : "사과",
    translation: index % 2 ? "nước" : "táo", prompt: index % 2 ? "Nghĩa của 물?" : "Nghĩa của 사과?",
    options: ["táo", "nước", "nhà", "sách"], correctOptionIndex: index % 2, explanation: "Giải thích.",
  })),
  answers: completed ? [0, 0] : Array.from({ length: count }, () => null),
});
function progress(answers: Array<number | null>, completed = false): TestProgress {
  const correctCount = answers.filter((answer, index) => answer === index % 2).length;
  return {
    id: "new", answers, correctCount, totalQuestions: answers.length,
    scorePercentage: Math.round(correctCount / answers.length * 100),
    completedAt: completed ? "2026-10-24T10:06:00.000Z" : null,
  };
}
let container: HTMLDivElement;
let root: Root;
function button(text: string) {
  const result = [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === text);
  if (!result) throw new Error("Button not found: " + text);
  return result;
}
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.mocked(deckTestsApi.list).mockResolvedValue([fixture(true)]);
  vi.mocked(deckTestsApi.get).mockResolvedValue(fixture(true));
  vi.mocked(deckTestsApi.start).mockResolvedValue(fixture());
  vi.mocked(deckTestsApi.saveAnswers).mockImplementation(async (_deck, _id, answers) => progress(answers));
  vi.mocked(deckTestsApi.submit).mockImplementation(async (_deck, _id, answers) => progress(answers, true));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
});
async function mount(autoStart = false) {
  await act(async () => root.render(<StrictMode><DeckTestPanel deckId="deck" accessToken="token"
    cardCount={6} autoStart={autoStart} /></StrictMode>));
}
async function chooseAndNext(option = "A. táo") {
  await act(async () => button(option).click());
  await act(async () => button("Câu tiếp theo").click());
}

describe("deck test UI", () => {
  it("opens historical answers/score and retakes the saved question set in a new attempt", async () => {
    await mount();
    expect(container.textContent).toContain("Lịch sử kiểm tra (1)");
    expect(container.querySelector(".test-history-row")?.textContent).toContain("Thời gian: 5 phút");
    await act(async () => (container.querySelector(".test-history-row") as HTMLButtonElement).click());
    expect(container.textContent).toContain("Kết quả: 50%");
    expect(container.textContent).toContain("Thời gian làm bài: 5 phút");
    expect(container.querySelector(".is-wrong")?.textContent).toContain("Bạn chọn");
    await act(async () => button("Làm lại").click());
    expect(deckTestsApi.start).toHaveBeenCalledWith("deck", "token", "old");
    expect(container.textContent).toContain("Câu 1/2");
    expect(container.querySelector(".is-correct")).toBeNull();
  });
  it("starts only once in React StrictMode when launched by the deck button", async () => {
    await mount(true);
    expect(deckTestsApi.start).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Nghĩa của 사과?");
  });
  it("grades immediately and advances without API calls; submits the whole short test once", async () => {
    await mount(true);
    await act(async () => button("A. táo").click());
    expect(container.textContent).toContain("Chính xác!");
    expect(button("Câu tiếp theo").disabled).toBe(false);
    expect(deckTestsApi.answer).not.toHaveBeenCalled();
    expect(deckTestsApi.saveAnswers).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(testDraftKey(fixture()))!).answers).toEqual([0, null]);
    await act(async () => button("Câu tiếp theo").click());
    await act(async () => button("B. nước").click());
    expect(deckTestsApi.saveAnswers).not.toHaveBeenCalled();
    await act(async () => button("Nộp bài").click());
    expect(deckTestsApi.submit).toHaveBeenCalledExactlyOnceWith("deck", "new", [0, 1], "token");
    expect(container.textContent).toContain("Kết quả: 100%");
    expect(localStorage.getItem(testDraftKey(fixture()))).toBeNull();
  });
  it("autosaves every five new answers without blocking navigation, including when the save fails", async () => {
    vi.mocked(deckTestsApi.start).mockResolvedValue(fixture(false, 6));
    vi.mocked(deckTestsApi.saveAnswers).mockRejectedValueOnce(new Error("Mất kết nối"));
    await mount(true);
    for (let index = 0; index < 4; index++) await chooseAndNext();
    expect(deckTestsApi.saveAnswers).not.toHaveBeenCalled();
    await act(async () => button("A. táo").click());
    expect(deckTestsApi.saveAnswers).toHaveBeenCalledExactlyOnceWith("deck", "new", [0, 0, 0, 0, 0, null], "token");
    expect(container.textContent).toContain("Mất kết nối");
    expect(button("Câu tiếp theo").disabled).toBe(false);
    await act(async () => button("Câu tiếp theo").click());
    expect(container.textContent).toContain("Câu 6/6");
    await act(async () => button("B. nước").click());
    await act(async () => button("Nộp bài").click());
    expect(container.textContent).toContain("Kết quả:");
  });
  it("autosaves dirty progress after fifteen seconds and sends nothing while idle", async () => {
    vi.useFakeTimers();
    await mount(true);
    await act(async () => vi.advanceTimersByTimeAsync(45_000));
    expect(deckTestsApi.saveAnswers).not.toHaveBeenCalled();
    await act(async () => button("A. táo").click());
    await act(async () => vi.advanceTimersByTimeAsync(14_999));
    expect(deckTestsApi.saveAnswers).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(deckTestsApi.saveAnswers).toHaveBeenCalledExactlyOnceWith("deck", "new", [0, null], "token");
    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(deckTestsApi.saveAnswers).toHaveBeenCalledTimes(1);
  });
  it("waits for an in-flight autosave before submitting the latest full snapshot", async () => {
    vi.mocked(deckTestsApi.start).mockResolvedValue(fixture(false, 6));
    let resolveSave!: (value: TestProgress) => void;
    vi.mocked(deckTestsApi.saveAnswers).mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve; }));
    await mount(true);
    for (let index = 0; index < 5; index++) await chooseAndNext();
    expect(deckTestsApi.saveAnswers).toHaveBeenCalledTimes(1);
    await act(async () => button("B. nước").click());
    await act(async () => button("Nộp bài").click());
    expect(deckTestsApi.submit).not.toHaveBeenCalled();
    expect(button("Đang nộp bài…").disabled).toBe(true);
    await act(async () => resolveSave(progress([0, 0, 0, 0, 0, null])));
    expect(deckTestsApi.submit).toHaveBeenCalledExactlyOnceWith("deck", "new", [0, 0, 0, 0, 0, 1], "token");
    expect(container.textContent).toContain("Kết quả:");
  });
  it("keeps the local draft after final-submit failure and retries without losing answers", async () => {
    vi.mocked(deckTestsApi.submit).mockRejectedValueOnce(new Error("Chưa nộp được"));
    await mount(true);
    await chooseAndNext();
    await act(async () => button("B. nước").click());
    await act(async () => button("Nộp bài").click());
    expect(container.textContent).toContain("Chưa nộp được");
    expect(localStorage.getItem(testDraftKey(fixture()))).not.toBeNull();
    await act(async () => button("Nộp bài").click());
    expect(deckTestsApi.submit).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("Kết quả: 100%");
    expect(localStorage.getItem(testDraftKey(fixture()))).toBeNull();
  });
  it("restores unsynced local answers when returning to a session", async () => {
    await mount(true);
    await act(async () => button("A. táo").click());
    await act(async () => button("← Lịch sử kiểm tra").click());
    vi.mocked(deckTestsApi.get).mockResolvedValue(fixture());
    await act(async () => (container.querySelectorAll(".test-history-row")[0] as HTMLButtonElement).click());
    expect(container.textContent).toContain("Câu 2/2");
    expect(deckTestsApi.saveAnswers).not.toHaveBeenCalled();
    expect(deckTestsApi.start).toHaveBeenCalledTimes(1);
  });
  it("keeps a newly created attempt when an older history response arrives late", async () => {
    const resolveHistory: Array<(rows: TestSession[]) => void> = [];
    vi.mocked(deckTestsApi.list).mockImplementation(() => new Promise((resolve) => resolveHistory.push(resolve)));
    await mount(true);
    await act(async () => { for (const resolve of resolveHistory) resolve([]); });
    await act(async () => button("← Lịch sử kiểm tra").click());
    expect(container.textContent).toContain("Lịch sử kiểm tra (1)");
  });
  it("resumes server-saved progress without creating another attempt", async () => {
    const partial = { ...fixture(), answers: [0, null] };
    vi.mocked(deckTestsApi.list).mockResolvedValue([partial]);
    vi.mocked(deckTestsApi.get).mockResolvedValue(partial);
    await mount();
    await act(async () => (container.querySelector(".test-history-row") as HTMLButtonElement).click());
    expect(container.textContent).toContain("Câu 2/2");
    expect(deckTestsApi.start).not.toHaveBeenCalled();
  });
});
