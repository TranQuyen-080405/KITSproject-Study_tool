// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardDetailPage } from "../src/pages/flashcard-detail-page";
import { addCardsToFlashcard, fetchFlashcardDeck } from "../src/api/flashcard-api";
import { fetchDeckReviews, fetchDeckStudySessions } from "../src/api/analytics-api";
import { aiApi } from "../src/api/ai-api";

vi.mock("../src/api/flashcard-api", () => ({
  addCardsToFlashcard: vi.fn(), fetchFlashcardDeck: vi.fn(), deleteCard: vi.fn(),
  deleteFlashcardDeck: vi.fn(), updateCard: vi.fn(), updateFlashcardDeck: vi.fn(),
}));
vi.mock("../src/api/analytics-api", () => ({ fetchDeckReviews: vi.fn(), fetchDeckStudySessions: vi.fn() }));
vi.mock("../src/api/ai-api", () => ({ aiApi: { completeFlashcards: vi.fn() } }));
vi.mock("../src/components/app-sidebar", () => ({ AppSidebar: () => null }));
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  vi.mocked(fetchFlashcardDeck).mockResolvedValue({ id: "deck", title: "Deck", description: null, folderId: null,
    userId: "7", createdAt: "2026-10-24T00:00:00Z", updatedAt: "2026-10-24T00:00:00Z", cards: [] });
  vi.mocked(fetchDeckReviews).mockResolvedValue([]); vi.mocked(fetchDeckStudySessions).mockResolvedValue([]);
  vi.mocked(addCardsToFlashcard).mockImplementation(async (_deck, items) => items.map((card, index) => ({ ...card,
    id: "card-" + index, flashcardId: "deck", hint: null, orderIndex: index })));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
async function upload(csv: string) {
  await act(async () => root.render(<FlashcardDetailPage deckId="deck" onNavigate={vi.fn()} onBackToDecks={vi.fn()}
    onStartStudy={vi.fn()} account={{ id: 7, username: "learner", email: "test@example.com", displayName: "Learner", emailVerified: true, accessToken: "token" }} />));
  await act(async () => (container.querySelector('button[title="Nhập thẻ từ file CSV"]') as HTMLButtonElement).click());
  const input = container.querySelector("#csv-file-input") as HTMLInputElement;
  Object.defineProperty(input, "files", { configurable: true, value: [{ name: "cards.csv", text: async () => csv }] });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
}
async function save() {
  await act(async () => container.querySelector("#csv-file-input")!.closest("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
}
describe("CSV import workflow", () => {
  it("automatically fills either missing side then saves all valid cards in one request", async () => {
    vi.mocked(aiApi.completeFlashcards).mockResolvedValue({ cards: [
      { index: 2, front: "고양이", back: "Con mèo" }, { index: 1, front: "물", back: "Nước" },
    ] });
    await upload("ID;Front;Back\n1;사과;Quả táo\n2;물;\n3;;Con mèo\n4;;");
    expect(container.textContent).toContain("2 thẻ thiếu Front hoặc Back");
    await save();
    expect(aiApi.completeFlashcards).toHaveBeenCalledExactlyOnceWith([
      { index: 1, front: "물", back: "" }, { index: 2, front: "", back: "Con mèo" },
    ]);
    expect(addCardsToFlashcard).toHaveBeenCalledExactlyOnceWith("deck", [
      { front: "사과", back: "Quả táo" }, { front: "물", back: "Nước" }, { front: "고양이", back: "Con mèo" },
    ]);
    expect(container.textContent).toContain("Đã thêm thành công 3 thẻ từ file CSV!");
  });
  it("keeps the preview and saves nothing when AI completion fails", async () => {
    vi.mocked(aiApi.completeFlashcards).mockRejectedValue(new Error("AI unavailable"));
    await upload("ID;Front;Back\n1;;Con mèo"); await save();
    expect(addCardsToFlashcard).not.toHaveBeenCalled();
    expect(container.textContent).toContain("AI unavailable");
    expect(container.querySelector("#csv-file-input")).not.toBeNull();
  });
  it("skips AI and saves directly when no side is missing", async () => {
    await upload("ID;Front;Back\n1;물;Nước"); await save();
    expect(aiApi.completeFlashcards).not.toHaveBeenCalled();
    expect(addCardsToFlashcard).toHaveBeenCalledExactlyOnceWith("deck", [{ front: "물", back: "Nước" }]);
  });
});
