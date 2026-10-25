import { useEffect, useMemo, useState } from "react";
import {
  addCardsToFlashcard,
  deleteCard,
  deleteFlashcardDeck,
  fetchFlashcardDeck,
  updateCard,
  updateFlashcardDeck,
  type CardItem,
  type FlashcardCard,
  type FlashcardDeck,
} from "../api/flashcard-api";
import {
  fetchDeckReviews,
  fetchDeckStudySessions,
  type DeckCardReview,
  type StudySession,
} from "../api/analytics-api";
import { completeFlashcardCsv, parseFlashcardCsv } from "../lib/flashcard-csv";
import { DeckTestPanel } from "../components/deck-test-panel";
import { AppPage, AppSidebar } from "../components/app-sidebar";
import {
  ArrowLeftIcon2D,
  BotIcon2D,
  BrainIcon2D,
  CheckIcon2D,
  ClockIcon2D,
  CloseIcon2D,
  EditIcon2D,
  FlameIcon2D,
  LayersIcon2D,
  LightbulbIcon2D,
  PlayIcon2D,
  PlusIcon2D,
  QuestionIcon2D,
  TrashIcon2D,
  TrophyIcon2D,
  UploadIcon2D,
} from "../components/icons";
import type { Account } from "../types/auth";
import "../styles/app.css";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  return `${mins}p ${remainingSecs}s`;
}

export type FlashcardDetailPageProps = {
  deckId: string;
  onNavigate: (page: AppPage) => void;
  onBackToDecks: () => void;
  onStartStudy: (deckId: string) => void;
  initialTab?: "cards" | "tests" | "history";
  startTestOnOpen?: boolean;
  onTestStartHandled?: () => void;
  account?: Account;
  onLogout?: () => void;
};


export function FlashcardDetailPage({
  deckId,
  onNavigate,
  onBackToDecks,
  onStartStudy,
  initialTab = "cards",
  startTestOnOpen = false,
  onTestStartHandled,
  account,
  onLogout,
}: FlashcardDetailPageProps) {
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [cards, setCards] = useState<FlashcardCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [activeTab, setActiveTab] = useState<"tests" | "cards" | "history">(initialTab);
  useEffect(() => { setActiveTab(initialTab); }, [initialTab, deckId]);

  const [startRequested, setStartRequested] = useState(false);
  const [testBusy, setTestBusy] = useState(false);

  // Analytics State
  const [deckReviews, setDeckReviews] = useState<DeckCardReview[]>([]);
  const [deckSessions, setDeckSessions] = useState<StudySession[]>([]);

  const reviewMap = useMemo(() => {
    const map = new Map<string, DeckCardReview>();
    for (const r of deckReviews) {
      if (r.cardId) map.set(r.cardId, r);
      if (r.word) map.set(r.word.trim().toLowerCase(), r);
    }
    return map;
  }, [deckReviews]);

  const deckLearnedCount = useMemo(() => {
    return deckReviews.filter((r) => r.status === "mastered").length;
  }, [deckReviews]);

  const deckDueCount = useMemo(() => {
    const now = new Date();
    return deckReviews.filter((r) => new Date(r.nextReviewAt) <= now).length;
  }, [deckReviews]);

  // Deck metadata editing
  const [isEditingDeck, setIsEditingDeck] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingDeck, setIsSavingDeck] = useState(false);

  // Card authoring (add)
  const [isCardFormOpen, setIsCardFormOpen] = useState(false);
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [cardError, setCardError] = useState<string>();

  // Card batch/inline editing states
  const [isEditingCards, setIsEditingCards] = useState(false);
  const [editingDrafts, setEditingDrafts] = useState<Record<string, { front: string; back: string }>>({});
  const [singleEditingId, setSingleEditingId] = useState<string | null>(null);
  const [isSavingCards, setIsSavingCards] = useState(false);
  const [cardsSuccessMessage, setCardsSuccessMessage] = useState<string>();
  const [cardsErrorMessage, setCardsErrorMessage] = useState<string>();

  // CSV Import State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvCards, setCsvCards] = useState<CardItem[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvNotice, setCsvNotice] = useState<string>();
  const [csvError, setCsvError] = useState<string>();
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [isTranslatingCsv, setIsTranslatingCsv] = useState(false);
  const [csvSuccessMessage, setCsvSuccessMessage] = useState<string>();

  const missingSideCount = csvCards.filter((card) => (card.front.trim() || card.back.trim()) && (!card.front.trim() || !card.back.trim())).length;

  function resetCsvForm() {
    setCsvCards([]);
    setCsvFileName("");
    setCsvNotice(undefined);
    setCsvError(undefined);
    setIsImportingCsv(false);
    setIsTranslatingCsv(false);
  }

  function openCsvModal() {
    if (isImportingCsv || isTranslatingCsv) return;
    resetCsvForm();
    setIsCardFormOpen(false);
    setIsCsvModalOpen(true);
  }

  function closeCsvModal() {
    if (isImportingCsv || isTranslatingCsv) return;
    setIsCsvModalOpen(false);
    resetCsvForm();
  }

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCsvError(undefined);
    setCsvNotice(undefined);
    try {
      const { cards: parsed, skippedRows } = parseFlashcardCsv(await file.text());
      setCsvFileName(file.name);
      setCsvCards(parsed);
      if (parsed.length === 0) {
        setCsvError("Không tìm thấy thẻ hợp lệ trong file CSV (cần cột ID;Front;Back, phân tách bằng dấu chấm phẩy).");
      } else if (skippedRows > 0) {
        setCsvNotice(`Đã bỏ qua ${skippedRows} dòng trống cả Front và Back.`);
      }
    } catch {
      setCsvError("Không đọc được file CSV.");
    }
  }

  function handleCsvCardChange(index: number, field: "front" | "back", val: string) {
    setCsvCards((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: val } : c)));
    if (csvError) setCsvError(undefined);
  }

  function handleCsvCardRemove(index: number) {
    setCsvCards((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAiCompleteCsv() {
    if (!csvCards.length || isImportingCsv || isTranslatingCsv) return;
    setIsTranslatingCsv(true);
    setCsvError(undefined);
    try {
      const completed = await completeFlashcardCsv(csvCards);
      setCsvCards(completed.cards);
      if (completed.skippedRows) setCsvNotice(`Đã bỏ qua ${completed.skippedRows} dòng trống cả Front và Back.`);
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : "AI chưa điền được các mặt còn thiếu. Bạn có thể tự nhập nội dung.");
    } finally {
      setIsTranslatingCsv(false);
    }
  }

  async function handleImportCsvSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isImportingCsv || isTranslatingCsv) return;
    if (!csvCards.length) {
      setCsvError("Vui lòng tải lên file CSV có ít nhất một thẻ.");
      return;
    }
    setIsImportingCsv(true);
    setCsvError(undefined);
    try {
      const completed = await completeFlashcardCsv(csvCards);
      setCsvCards(completed.cards);
      if (completed.skippedRows) setCsvNotice(`Đã bỏ qua ${completed.skippedRows} dòng trống cả Front và Back.`);
      const newCards = await addCardsToFlashcard(deckId, completed.cards);
      setCards(newCards);
      setDeck((prev) => (prev ? { ...prev, cardCount: newCards.length } : prev));
      setCsvSuccessMessage(`Đã thêm thành công ${completed.cards.length} thẻ từ file CSV!`);
      setIsCsvModalOpen(false);
      resetCsvForm();
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : "Thêm thẻ từ CSV thất bại.");
    } finally {
      setIsImportingCsv(false);
    }
  }

  async function loadData() {
    setIsLoading(true);
    setErrorMessage(undefined);
    try {
      const [deckData, reviewsData, sessionsData] = await Promise.all([
        fetchFlashcardDeck(deckId),
        fetchDeckReviews(deckId, account?.accessToken).catch(() => []),
        fetchDeckStudySessions(deckId, 20, account?.accessToken).catch(() => []),
      ]);
      setDeck(deckData);
      setCards(deckData.cards || []);
      setDeckReviews(reviewsData);
      setDeckSessions(sessionsData);
      setEditTitle(deckData.title);
      setEditDescription(deckData.description || "");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Không tải được thông tin bộ Flashcard.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [deckId, account?.id]);

  // Handle deck metadata save
  async function handleSaveDeckMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!editTitle.trim()) return;
    setIsSavingDeck(true);
    try {
      const updated = await updateFlashcardDeck(deckId, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      setDeck((prev) => (prev ? { ...prev, title: updated.title, description: updated.description } : updated));
      setIsEditingDeck(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Cập nhật thông tin thất bại.");
    } finally {
      setIsSavingDeck(false);
    }
  }

  // Handle deck deletion
  async function handleDeleteDeck() {
    if (!deck) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bộ "${deck.title}" không? Hành động này không thể hoàn tác.`)) {
      return;
    }
    try {
      await deleteFlashcardDeck(deckId);
      onBackToDecks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Xóa bộ thẻ thất bại.");
    }
  }

  // Add Card
  async function handleSaveCard(e: React.FormEvent) {
    e.preventDefault();
    if (!cardFront.trim() || !cardBack.trim()) {
      setCardError("Vui lòng nhập cả mặt trước và mặt sau.");
      return;
    }
    setIsSavingCard(true);
    setCardError(undefined);
    try {
      const newCards = await addCardsToFlashcard(deckId, [
        { front: cardFront.trim(), back: cardBack.trim() },
      ]);
      setCards(newCards);
      setCardFront("");
      setCardBack("");
      setIsCardFormOpen(false);
    } catch (err) {
      setCardError(err instanceof Error ? err.message : "Thêm thẻ thất bại.");
    } finally {
      setIsSavingCard(false);
    }
  }

  // Delete Card
  async function handleDeleteCard(cardId: string) {
    if (!window.confirm("Bạn có chắc muốn xóa thẻ từ vựng này không?")) return;
    try {
      await deleteCard(cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      setEditingDrafts((prev) => {
        const next = { ...prev };
        delete next[cardId];
        return next;
      });
      if (singleEditingId === cardId) setSingleEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Xóa thẻ thất bại.");
    }
  }

  // Card batch & inline editing handlers
  function handleStartEditCards() {
    const drafts: Record<string, { front: string; back: string }> = {};
    for (const c of cards) {
      drafts[c.id] = { front: c.front, back: c.back };
    }
    setEditingDrafts(drafts);
    setIsEditingCards(true);
    setSingleEditingId(null);
    setCardsErrorMessage(undefined);
    setCardsSuccessMessage(undefined);
  }

  function handleCancelEditCards() {
    setIsEditingCards(false);
    setSingleEditingId(null);
    setEditingDrafts({});
    setCardsErrorMessage(undefined);
  }

  function handleDraftChange(cardId: string, field: "front" | "back", val: string) {
    setEditingDrafts((prev) => ({
      ...prev,
      [cardId]: {
        front: prev[cardId]?.front ?? "",
        back: prev[cardId]?.back ?? "",
        [field]: val,
      },
    }));
    if (cardsErrorMessage) setCardsErrorMessage(undefined);
  }

  async function handleSaveAllCards() {
    const changed: { id: string; front: string; back: string }[] = [];
    for (const card of cards) {
      const draft = editingDrafts[card.id];
      if (!draft) continue;
      const trimmedFront = draft.front.trim();
      const trimmedBack = draft.back.trim();
      if (!trimmedFront || !trimmedBack) {
        setCardsErrorMessage(`Thẻ #${cards.indexOf(card) + 1} không được để trống mặt trước hoặc mặt sau.`);
        return;
      }
      if (trimmedFront !== card.front || trimmedBack !== card.back) {
        changed.push({ id: card.id, front: trimmedFront, back: trimmedBack });
      }
    }

    if (changed.length === 0) {
      setIsEditingCards(false);
      return;
    }

    setIsSavingCards(true);
    setCardsErrorMessage(undefined);
    try {
      const updatedCards = await Promise.all(
        changed.map((item) =>
          updateCard(item.id, { front: item.front, back: item.back }),
        ),
      );
      const updatedMap = new Map(updatedCards.map((c) => [c.id, c]));
      setCards((prev) =>
        prev.map((c) => (updatedMap.has(c.id) ? updatedMap.get(c.id)! : c)),
      );
      setIsEditingCards(false);
      setCardsSuccessMessage(`Đã cập nhật thành công ${changed.length} thẻ từ vựng!`);
      setTimeout(() => setCardsSuccessMessage(undefined), 5000);
    } catch (err) {
      setCardsErrorMessage(
        err instanceof Error ? err.message : "Cập nhật thẻ thất bại.",
      );
    } finally {
      setIsSavingCards(false);
    }
  }

  function handleStartEditSingle(card: FlashcardCard) {
    setEditingDrafts((prev) => ({
      ...prev,
      [card.id]: { front: card.front, back: card.back },
    }));
    setSingleEditingId(card.id);
  }

  function handleCancelEditSingle() {
    setSingleEditingId(null);
  }

  async function handleSaveSingleCard(cardId: string) {
    const draft = editingDrafts[cardId];
    if (!draft) {
      setSingleEditingId(null);
      return;
    }
    const trimmedFront = draft.front.trim();
    const trimmedBack = draft.back.trim();
    if (!trimmedFront || !trimmedBack) {
      alert("Vui lòng nhập cả mặt trước và mặt sau.");
      return;
    }
    setIsSavingCards(true);
    try {
      const updated = await updateCard(cardId, { front: trimmedFront, back: trimmedBack });
      setCards((prev) => prev.map((c) => (c.id === cardId ? updated : c)));
      setSingleEditingId(null);
      setCardsSuccessMessage("Đã cập nhật thẻ thành công!");
      setTimeout(() => setCardsSuccessMessage(undefined), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Cập nhật thẻ thất bại.");
    } finally {
      setIsSavingCards(false);
    }
  }


  return (
    <div className="app-layout">
      <AppSidebar
        account={account}
        activePage="flashcards"
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <main
        className="lesson-page"
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "20px 24px 60px",
          width: "100%",
        }}
      >
        {/* Top Back & Header */}
        <div style={{ marginBottom: "20px" }}>
          <button
            className="manage-secondary-button interactive-element"
            onClick={onBackToDecks}
            type="button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              fontSize: "12.5px",
              fontWeight: 600,
              borderRadius: "10px",
              marginBottom: "14px",
            }}
          >
            <ArrowLeftIcon2D size={14} /> Danh sách Flashcard
          </button>

          {isLoading ? (
            <p className="page-status">Đang tải thông tin bộ Flashcard...</p>
          ) : null}

          {errorMessage ? (
            <p className="page-status page-status-error">{errorMessage}</p>
          ) : null}

          {deck ? (
            <div
              className="glass-card"
              style={{
                padding: "24px",
                borderRadius: "20px",
                border: "1px solid var(--border-glass)",
                background: "var(--bg-glass-card)",
                boxShadow: "var(--shadow-glass)",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                <div style={{ flex: "1 1 340px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    

                  </div>

                  {isEditingDeck ? (
                    <form onSubmit={handleSaveDeckMeta} style={{ marginTop: "10px" }}>
                      <input
                        className="glass-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Tên bộ flashcard..."
                        required
                        style={{
                          width: "100%",
                          fontSize: "16px",
                          fontWeight: 700,
                          padding: "8px 12px",
                          marginBottom: "8px",
                          borderRadius: "8px",
                        }}
                      />
                      <textarea
                        className="glass-input"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Mô tả bộ thẻ (tùy chọn)..."
                        rows={2}
                        style={{
                          width: "100%",
                          fontSize: "13px",
                          padding: "8px 12px",
                          marginBottom: "10px",
                          borderRadius: "8px",
                          resize: "vertical",
                        }}
                      />
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="manage-primary-button interactive-element"
                          type="submit"
                          disabled={isSavingDeck}
                          style={{ padding: "6px 14px", fontSize: "12px", borderRadius: "8px" }}
                        >
                          {isSavingDeck ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                        <button
                          className="manage-secondary-button interactive-element"
                          type="button"
                          onClick={() => setIsEditingDeck(false)}
                          style={{ padding: "6px 14px", fontSize: "12px", borderRadius: "8px" }}
                        >
                          Hủy
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <h1
                          style={{
                            fontSize: "22px",
                            fontWeight: 800,
                            margin: "0 0 6px",
                            color: "var(--text-main)",
                          }}
                        >
                          {deck.title}
                        </h1>
                        <button
                          type="button"
                          onClick={() => setIsEditingDeck(true)}
                          title="Sửa tên và mô tả bộ thẻ"
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            padding: "4px",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <EditIcon2D size={15} />
                        </button>
                      </div>

                      {deck.description ? (
                        <p
                          style={{
                            fontSize: "13.5px",
                            color: "var(--text-muted)",
                            margin: "0 0 10px",
                            lineHeight: 1.5,
                            maxWidth: "650px",
                          }}
                        >
                          {deck.description}
                        </p>
                      ) : null}

                      
                    </div>
                  )}
                </div>

                {/* Primary Action Buttons Bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <button className="manage-secondary-button interactive-element"
                    onClick={() => { setActiveTab("tests"); setStartRequested(true); }} type="button"
                    disabled={testBusy || cards.length === 0}>
                    <QuestionIcon2D size={15} /> Kiểm tra
                  </button>

                  <button
                    className="login-primary-button interactive-element"
                    onClick={() => onStartStudy(deck.id)}
                    type="button"
                    disabled={cards.length === 0}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "9px 18px",
                      fontSize: "13px",
                      fontWeight: 700,
                      borderRadius: "10px",
                      opacity: cards.length === 0 ? 0.5 : 1,
                      cursor: cards.length === 0 ? "not-allowed" : "pointer",
                    }}
                    title={cards.length === 0 ? "Chưa có thẻ từ vựng" : "Bắt đầu học thẻ Flashcard"}
                  >
                    <PlayIcon2D size={14} color="#fff" /> Học Flashcard
                  </button>

                  <button
                    className="manage-secondary-button interactive-element"
                    onClick={handleDeleteDeck}
                    type="button"
                    style={{
                      padding: "9px 12px",
                      fontSize: "13px",
                      borderRadius: "10px",
                      color: "var(--state-error)",
                      borderColor: "rgba(239, 68, 68, 0.3)",
                    }}
                    title="Xóa toàn bộ bộ thẻ này"
                  >
                    <TrashIcon2D size={15} />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {!isLoading && deck ? (
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {([["cards", `Thẻ từ vựng (${cards.length})`], ["history", "Lịch sử học"],
                ["tests", "Kiểm tra"]] as const).map(([tab, label]) => (
                <button key={tab} type="button" aria-pressed={activeTab === tab}
                  className={activeTab === tab ? "manage-primary-button" : "manage-secondary-button"}
                  onClick={() => setActiveTab(tab)}>{label}</button>
              ))}
            </div>
            {activeTab === "cards" && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                {isEditingCards ? (
                  <>
                    <button
                      className="manage-secondary-button interactive-element"
                      type="button"
                      onClick={handleCancelEditCards}
                      disabled={isSavingCards}
                      style={{ padding: "8px 14px", fontSize: "13px", borderRadius: "10px" }}
                    >
                      Hủy
                    </button>
                    <button
                      className="manage-primary-button interactive-element"
                      type="button"
                      onClick={() => void handleSaveAllCards()}
                      disabled={isSavingCards}
                      style={{
                        padding: "8px 16px",
                        fontSize: "13px",
                        fontWeight: 700,
                        borderRadius: "10px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "var(--brand-primary)",
                      }}
                    >
                      <CheckIcon2D size={15} /> {isSavingCards ? "Đang lưu..." : "Lưu tất cả thẻ"}
                    </button>
                  </>
                ) : (
                  <>
                    {cards.length > 0 && (
                      <button
                        className="manage-secondary-button interactive-element flashcard-toolbar-button"
                        type="button"
                        onClick={handleStartEditCards}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 14px",
                          fontSize: "13px",
                          borderRadius: "10px",
                        }}
                        title="Chuyển sang chế độ chỉnh sửa tất cả thẻ"
                      >
                        <EditIcon2D size={15} /> 
                      </button>
                    )}
                    <button
                      className="manage-secondary-button interactive-element flashcard-toolbar-button"
                      type="button"
                      onClick={openCsvModal}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 14px",
                        fontSize: "13px",
                        borderRadius: "10px",
                      }}
                      title="Nhập thẻ từ file CSV"
                    >
                      <UploadIcon2D size={15} /> Nhập từ file CSV
                    </button>
                    <button
                      className="manage-primary-button interactive-element"
                      type="button"
                      onClick={() => {
                        setCardError(undefined);
                        setIsCsvModalOpen(false);
                        setIsCardFormOpen(true);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 16px",
                        fontSize: "13px",
                        fontWeight: 700,
                        borderRadius: "10px",
                      }}
                    >
                      <PlusIcon2D size={15} /> Thêm thẻ thủ công
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Cards Notification Banners */}
        {cardsSuccessMessage && (
          <div
            style={{
              padding: "10px 16px",
              borderRadius: "12px",
              marginBottom: "18px",
              background: "rgba(34, 197, 94, 0.15)",
              border: "1px solid rgba(34, 197, 94, 0.35)",
              color: "#4ade80",
              fontSize: "13.5px",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span> {cardsSuccessMessage}</span>
            <button
              type="button"
              onClick={() => setCardsSuccessMessage(undefined)}
              style={{ background: "none", border: "none", color: "#4ade80", cursor: "pointer", padding: "2px" }}
            >
              <CloseIcon2D size={14} />
            </button>
          </div>
        )}

        {cardsErrorMessage && (
          <div
            style={{
              padding: "10px 16px",
              borderRadius: "12px",
              marginBottom: "18px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#f87171",
              fontSize: "13.5px",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>⚠️ {cardsErrorMessage}</span>
            <button
              type="button"
              onClick={() => setCardsErrorMessage(undefined)}
              style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "2px" }}
            >
              <CloseIcon2D size={14} />
            </button>
          </div>
        )}

        {isEditingCards && (
          <div
            style={{
              padding: "12px 18px",
              borderRadius: "12px",
              marginBottom: "18px",
              background: "var(--brand-primary-light)",
              border: "1px solid var(--brand-primary)",
              color: "var(--text-main)",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            ✏️ <strong>Chế độ chỉnh sửa thẻ:</strong> Nhập trực tiếp mặt trước (Tiếng Hàn) và mặt sau (Ý nghĩa) cho từng thẻ bên dưới, sau đó bấm <strong>"Lưu tất cả thẻ"</strong> ở góc trên bên phải.
          </div>
        )}

        {/* CSV Import Success Banner */}
        {csvSuccessMessage ? (
          <div
            style={{
              padding: "10px 16px",
              borderRadius: "12px",
              marginBottom: "18px",
              background: "rgba(34, 197, 94, 0.15)",
              border: "1px solid rgba(34, 197, 94, 0.35)",
              color: "#4ade80",
              fontSize: "13.5px",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{csvSuccessMessage}</span>
            <button
              type="button"
              onClick={() => setCsvSuccessMessage(undefined)}
              style={{
                background: "none",
                border: "none",
                color: "#4ade80",
                cursor: "pointer",
                padding: "2px",
              }}
            >
              <CloseIcon2D size={14} />
            </button>
          </div>
        ) : null}

        {/* Modal / Form: Add Card */}
        {isCardFormOpen && (
          <div
            className="glass-card"
            style={{
              padding: "24px",
              borderRadius: "18px",
              border: "1px solid var(--brand-primary)",
              marginBottom: "24px",
              background: "var(--bg-glass-card)",
              boxShadow: "var(--shadow-glass)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>
                Thêm thẻ từ vựng mới
              </h2>
              <button
                type="button"
                onClick={() => setIsCardFormOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <CloseIcon2D size={16} />
              </button>
            </div>

            {cardError ? (
              <p className="page-status page-status-error" style={{ marginBottom: "12px" }}>
                {cardError}
              </p>
            ) : null}

            <form onSubmit={handleSaveCard}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, marginBottom: "6px" }}>
                    Mặt trước (Từ vựng tiếng Hàn):
                  </label>
                  <input
                    className="glass-input korean-text"
                    value={cardFront}
                    onChange={(e) => setCardFront(e.target.value)}
                    placeholder="Ví dụ: 안녕하세요"
                    required
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", fontSize: "15px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, marginBottom: "6px" }}>
                    Mặt sau (Nghĩa tiếng Việt):
                  </label>
                  <input
                    className="glass-input"
                    value={cardBack}
                    onChange={(e) => setCardBack(e.target.value)}
                    placeholder="Ví dụ: Xin chào"
                    required
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", fontSize: "14px" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="manage-secondary-button interactive-element"
                  onClick={() => setIsCardFormOpen(false)}
                  style={{ padding: "8px 16px", fontSize: "13px", borderRadius: "10px" }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="manage-primary-button interactive-element"
                  disabled={isSavingCard}
                  style={{ padding: "8px 20px", fontSize: "13px", borderRadius: "10px" }}
                >
                  {isSavingCard ? "Đang lưu..." : "Thêm thẻ vào bộ"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal / Form: Import Cards from CSV */}
        {isCsvModalOpen && (
          <div
            className="glass-card"
            style={{
              padding: "24px",
              borderRadius: "18px",
              border: "1px solid var(--brand-primary)",
              marginBottom: "24px",
              background: "var(--bg-glass-card)",
              boxShadow: "var(--shadow-glass)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "14px",
              }}
            >
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 4px 0" }}>
                  Nhập danh sách thẻ từ file CSV
                </h2>
                <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-muted)" }}>
                  File gồm 3 cột <code>ID;Front;Back</code> phân cách bằng dấu chấm phẩy (<code>;</code>). Ví dụ: <code>1;사과;quả táo</code>
                </p>
              </div>
              <button
                type="button"
                onClick={closeCsvModal}
                disabled={isImportingCsv || isTranslatingCsv}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <CloseIcon2D size={16} />
              </button>
            </div>

            {csvError ? (
              <p className="page-status page-status-error" style={{ marginBottom: "12px" }}>
                {csvError}
              </p>
            ) : null}

            {csvNotice ? (
              <p
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#f59e0b",
                  fontSize: "12.5px",
                  marginBottom: "12px",
                }}
              >
                {csvNotice}
              </p>
            ) : null}

            <p className="test-muted">Chỉ bỏ qua dòng trống cả hai mặt. Thẻ thiếu Front hoặc Back sẽ được AI điền phần còn thiếu khi lưu.</p>
            <form onSubmit={handleImportCsvSubmit}>
              <fieldset disabled={isImportingCsv || isTranslatingCsv} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              {/* File Upload Selector */}
              <div
                style={{
                  border: "2px dashed var(--border-glass)",
                  borderRadius: "12px",
                  padding: "20px",
                  textAlign: "center",
                  background: "rgba(255, 255, 255, 0.02)",
                  marginBottom: "16px",
                }}
              >
                <input
                  type="file"
                  id="csv-file-input"
                  accept=".csv,text/csv"
                  onChange={handleCsvFile}
                  style={{ display: "none" }}
                />
                <label
                  htmlFor="csv-file-input"
                  className="manage-secondary-button interactive-element"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 18px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "13.5px",
                    fontWeight: 600,
                  }}
                >
                  <UploadIcon2D size={16} />
                  {csvFileName ? "Chọn file CSV khác" : "Chọn file CSV từ máy tính"}
                </label>
                {csvFileName ? (
                  <p style={{ marginTop: "10px", marginBottom: 0, fontSize: "13px", color: "var(--brand-primary)" }}>
                    Đã tải: <strong>{csvFileName}</strong> ({csvCards.length} thẻ hợp lệ)
                  </p>
                ) : (
                  <p style={{ marginTop: "8px", marginBottom: 0, fontSize: "12px", color: "var(--text-muted)" }}>
                    Hỗ trợ file định dạng CSV có cấu trúc ID;Front;Back
                  </p>
                )}
              </div>

              {/* Preview & Edit Table */}
              {csvCards.length > 0 && (
                <div style={{ marginBottom: "18px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginBottom: "10px",
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                      Xem trước và chỉnh sửa ({csvCards.length} thẻ):
                    </span>

                    {missingSideCount > 0 ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            fontSize: "12px",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: "rgba(245, 158, 11, 0.15)",
                            color: "#f59e0b",
                            fontWeight: 600,
                          }}
                        >
                          {missingSideCount} thẻ thiếu Front hoặc Back
                        </span>
                        <button
                          type="button"
                          className="manage-secondary-button interactive-element"
                          onClick={handleAiCompleteCsv}
                          disabled={isTranslatingCsv || isImportingCsv}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 12px",
                            fontSize: "12px",
                            borderRadius: "8px",
                            color: "var(--brand-primary)",
                            borderColor: "var(--brand-primary)",
                          }}
                        >
                          <LightbulbIcon2D size={13} />
                          {isTranslatingCsv ? "AI đang điền..." : "AI điền phần thiếu"}
                        </button>
                      </div>
                    ) : (
                      <span
                        style={{
                          fontSize: "12px",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          background: "rgba(34, 197, 94, 0.15)",
                          color: "#4ade80",
                          fontWeight: 600,
                        }}
                      >
                        ✓ Đầy đủ từ vựng và nghĩa
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      maxHeight: "320px",
                      overflowY: "auto",
                      border: "1px solid var(--border-glass)",
                      borderRadius: "10px",
                      padding: "8px",
                      background: "rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-glass-subtle)", textAlign: "left" }}>
                          <th style={{ padding: "8px 6px", width: "36px", color: "var(--text-muted)" }}>#</th>
                          <th style={{ padding: "8px 6px", width: "45%", color: "var(--text-muted)" }}>Mặt trước (Tiếng Hàn)</th>
                          <th style={{ padding: "8px 6px", width: "45%", color: "var(--text-muted)" }}>Mặt sau (Tiếng Việt)</th>
                          <th style={{ padding: "8px 6px", width: "40px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvCards.map((card, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                            <td style={{ padding: "6px", color: "var(--text-muted)", fontSize: "12px" }}>{idx + 1}</td>
                            <td style={{ padding: "6px" }}>
                              <input
                                className="glass-input korean-text"
                                value={card.front}
                                onChange={(e) => handleCsvCardChange(idx, "front", e.target.value)}
                                placeholder="Từ tiếng Hàn..."
                                style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", fontSize: "13.5px",
                                  borderColor: !card.front.trim() ? "rgba(245, 158, 11, 0.6)" : undefined }}
                              />
                            </td>
                            <td style={{ padding: "6px" }}>
                              <input
                                className="glass-input"
                                value={card.back}
                                onChange={(e) => handleCsvCardChange(idx, "back", e.target.value)}
                                placeholder="Nghĩa tiếng Việt..."
                                style={{
                                  width: "100%",
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  fontSize: "13px",
                                  borderColor: !card.back.trim() ? "rgba(245, 158, 11, 0.6)" : undefined,
                                }}
                              />
                            </td>
                            <td style={{ padding: "6px", textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleCsvCardRemove(idx)}
                                title="Xóa thẻ này"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--text-muted)",
                                  cursor: "pointer",
                                  padding: "4px",
                                  borderRadius: "4px",
                                }}
                              >
                                <TrashIcon2D size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="manage-secondary-button interactive-element"
                  onClick={closeCsvModal}
                  disabled={isImportingCsv || isTranslatingCsv}
                  style={{ padding: "8px 16px", fontSize: "13px", borderRadius: "10px" }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="manage-primary-button interactive-element"
                  disabled={isImportingCsv || csvCards.length === 0 || isTranslatingCsv}
                  style={{ padding: "8px 20px", fontSize: "13px", borderRadius: "10px" }}
                >
                  {isImportingCsv ? (missingSideCount ? "AI đang điền phần thiếu..." : "Đang lưu...") : `Lưu ${csvCards.length} thẻ vào bộ`}
                </button>
              </div>
              </fieldset>
            </form>
          </div>
        )}

        {!isLoading && deck && activeTab === "tests" && account && (
          <DeckTestPanel key={`${deckId}-${account.id}`} deckId={deckId}
            accessToken={account.accessToken} cardCount={cards.length}
            autoStart={startRequested || startTestOnOpen}
            onAutoStartHandled={() => { setStartRequested(false); onTestStartHandled?.(); }}
            onBusyChange={setTestBusy} />
        )}

        {/* Content Section: Cards Tab */}
        {!isLoading && deck && activeTab === "cards" ? (
          <div>
            {cards.length === 0 ? (
              <div
                className="glass-card"
                style={{
                  textAlign: "center",
                  padding: "48px 20px",
                  borderRadius: "20px",
                  border: "1px solid var(--border-glass)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    padding: "16px",
                    borderRadius: "50%",
                    background: "var(--brand-primary-light)",
                    color: "var(--brand-primary)",
                    marginBottom: "14px",
                  }}
                >
                  <LayersIcon2D size={32} />
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 6px" }}>
                  Chưa có thẻ từ vựng nào
                </h3>
                <p
                  style={{
                    fontSize: "13.5px",
                    color: "var(--text-muted)",
                    maxWidth: "460px",
                    margin: "0 auto 20px",
                    lineHeight: 1.5,
                  }}
                >
                  Bộ Flashcard này chưa có thẻ từ vựng nào. Hãy thêm các từ vựng tiếng Hàn đầu tiên
                  để bắt đầu học.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    className="manage-secondary-button interactive-element"
                    onClick={openCsvModal}
                    type="button"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "10px 18px",
                      fontSize: "13px",
                      fontWeight: 600,
                      borderRadius: "10px",
                    }}
                  >
                    <UploadIcon2D size={15} /> Nhập từ file CSV
                  </button>

                  <button
                    className="manage-primary-button interactive-element"
                    onClick={() => {
                      setCardError(undefined);
                      setIsCsvModalOpen(false);
                      setIsCardFormOpen(true);
                    }}
                    type="button"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "10px 18px",
                      fontSize: "13px",
                      fontWeight: 600,
                      borderRadius: "10px",
                    }}
                  >
                    <PlusIcon2D size={15} /> Thêm thẻ thủ công
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "14px",
                }}
              >
                {cards.map((card, idx) => {
                  const rev = reviewMap.get(card.id) || reviewMap.get(card.front.trim().toLowerCase());
                  const isEditingThisCard = isEditingCards || singleEditingId === card.id;

                  return (
                    <article
                      key={card.id}
                      className="glass-card"
                      style={{
                        padding: "16px 18px",
                        borderRadius: "14px",
                        border: isEditingThisCard ? "1.5px solid var(--brand-primary)" : "1px solid var(--border-glass-subtle)",
                        background: "var(--bg-glass-card)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "12px",
                        boxShadow: isEditingThisCard ? "0 0 16px rgba(129, 140, 248, 0.18)" : undefined,
                        transition: "all 0.2s ease",
                      }}
                    >
                      {isEditingThisCard ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "999px",
                                background: "var(--brand-primary-light)",
                                color: "var(--brand-primary)",
                              }}
                            >
                              #{idx + 1} Đang sửa
                            </span>

                            {singleEditingId === card.id && (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  type="button"
                                  onClick={handleCancelEditSingle}
                                  disabled={isSavingCards}
                                  style={{
                                    padding: "3px 8px",
                                    fontSize: "11px",
                                    background: "transparent",
                                    border: "1px solid var(--border-glass-subtle)",
                                    color: "var(--text-muted)",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                  }}
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleSaveSingleCard(card.id)}
                                  disabled={isSavingCards}
                                  style={{
                                    padding: "3px 10px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    background: "var(--brand-primary)",
                                    border: "none",
                                    color: "#fff",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                  }}
                                >
                                  {isSavingCards ? "..." : "Lưu"}
                                </button>
                              </div>
                            )}
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: "10.5px",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                color: "var(--text-muted)",
                                display: "block",
                                marginBottom: "4px",
                              }}
                            >
                              Mặt trước (Tiếng Hàn) *
                            </label>
                            <input
                              type="text"
                              value={editingDrafts[card.id]?.front ?? card.front}
                              onChange={(e) => handleDraftChange(card.id, "front", e.target.value)}
                              placeholder="Từ tiếng Hàn..."
                              className="korean-text"
                              style={{
                                width: "100%",
                                padding: "7px 10px",
                                borderRadius: "8px",
                                border: "1px solid var(--border-glass)",
                                background: "var(--bg-glass-input)",
                                color: "var(--brand-primary)",
                                fontWeight: 700,
                                fontSize: "15px",
                                outline: "none",
                              }}
                            />
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: "10.5px",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                color: "var(--text-muted)",
                                display: "block",
                                marginBottom: "4px",
                              }}
                            >
                              Mặt sau (Ý nghĩa) *
                            </label>
                            <input
                              type="text"
                              value={editingDrafts[card.id]?.back ?? card.back}
                              onChange={(e) => handleDraftChange(card.id, "back", e.target.value)}
                              placeholder="Nghĩa tiếng Việt..."
                              style={{
                                width: "100%",
                                padding: "7px 10px",
                                borderRadius: "8px",
                                border: "1px solid var(--border-glass)",
                                background: "var(--bg-glass-input)",
                                color: "var(--text-main)",
                                fontSize: "13.5px",
                                outline: "none",
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "8px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span
                                style={{
                                  fontSize: "10.5px",
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: "999px",
                                  background: "rgba(255, 255, 255, 0.06)",
                                  color: "var(--text-muted)",
                                }}
                              >
                                #{idx + 1}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <button
                                type="button"
                                onClick={() => handleStartEditSingle(card)}
                                title="Chỉnh sửa thẻ này"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--text-muted)",
                                  cursor: "pointer",
                                  padding: "4px",
                                  borderRadius: "6px",
                                  opacity: 0.7,
                                  display: "flex",
                                  alignItems: "center",
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = "var(--brand-primary)";
                                  e.currentTarget.style.opacity = "1";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = "var(--text-muted)";
                                  e.currentTarget.style.opacity = "0.7";
                                }}
                              >
                                <EditIcon2D size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleDeleteCard(card.id)}
                                title="Xóa thẻ từ vựng này"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--text-muted)",
                                  cursor: "pointer",
                                  padding: "4px",
                                  borderRadius: "6px",
                                  opacity: 0.7,
                                  display: "flex",
                                  alignItems: "center",
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = "var(--state-error)";
                                  e.currentTarget.style.opacity = "1";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = "var(--text-muted)";
                                  e.currentTarget.style.opacity = "0.7";
                                }}
                              >
                                <TrashIcon2D size={14} />
                              </button>
                            </div>
                          </div>

                          <div style={{ marginBottom: "6px" }}>
                            <div
                              style={{
                                fontSize: "11px",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                color: "var(--text-muted)",
                                marginBottom: "2px",
                              }}
                            >
                              Mặt trước (Tiếng Hàn)
                            </div>
                            <div
                              className="korean-text"
                              style={{
                                fontSize: "18px",
                                fontWeight: 700,
                                color: "var(--brand-primary)",
                              }}
                            >
                              {card.front}
                            </div>
                          </div>

                          <div>
                            <div
                              style={{
                                fontSize: "11px",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                color: "var(--text-muted)",
                                marginBottom: "2px",
                              }}
                            >
                              Mặt sau (Ý nghĩa)
                            </div>
                            <div
                              style={{
                                fontSize: "14.5px",
                                color: "var(--text-main)",
                                fontWeight: 500,
                              }}
                            >
                              {card.back}
                            </div>
                          </div>
                        </div>
                      )}

                      {rev && rev.totalReviews > 0 ? (
                        <div
                          style={{
                            paddingTop: "8px",
                            borderTop: "1px solid var(--border-glass-subtle)",
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>Đúng {rev.correctCount}/{rev.totalReviews} lần</span>
                          <span>Ôn: {formatDateTime(rev.lastReviewedAt)}</span>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {/* Content Section: History Tab */}
        {!isLoading && deck && activeTab === "history" ? (
          <div>
            {deckSessions.length === 0 ? (
              <div
                className="glass-card"
                style={{
                  textAlign: "center",
                  padding: "48px 20px",
                  borderRadius: "20px",
                  border: "1px solid var(--border-glass)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    padding: "16px",
                    borderRadius: "50%",
                    background: "rgba(129, 140, 248, 0.15)",
                    color: "var(--brand-primary)",
                    marginBottom: "14px",
                  }}
                >
                  <ClockIcon2D size={32} />
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 6px" }}>
                  Chưa có lượt ôn tập nào
                </h3>
                <p
                  style={{
                    fontSize: "13.5px",
                    color: "var(--text-muted)",
                    maxWidth: "460px",
                    margin: "0 auto 20px",
                    lineHeight: 1.5,
                  }}
                >
                  Lịch sử các lần ôn Flashcard và làm bài trắc nghiệm của bộ thẻ này sẽ xuất hiện ở đây để bạn theo dõi tiến bộ ghi nhớ.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    className="manage-primary-button interactive-element"
                    onClick={() => onStartStudy(deckId)}
                    type="button"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "10px 18px",
                      fontSize: "13px",
                      fontWeight: 600,
                      borderRadius: "10px",
                    }}
                  >
                    <PlayIcon2D size={15} color="#fff" /> Học Flashcard ngay
                  </button>
                  <button className="manage-secondary-button" type="button" onClick={() => setActiveTab("tests")}>
                    <QuestionIcon2D size={15} /> Kiểm tra
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {deckSessions.map((s) => {
                  const isHigh = s.scorePercentage >= 80;
                  const isMid = s.scorePercentage >= 50;
                  const badgeBg = isHigh
                    ? "var(--state-success-bg)"
                    : isMid
                      ? "var(--state-warning-bg)"
                      : "var(--state-error-bg)";
                  const badgeColor = isHigh
                    ? "var(--state-success)"
                    : isMid
                      ? "var(--state-warning)"
                      : "var(--state-error)";

                  const isMcq = s.sessionType === "mcq";

                  return (
                    <div
                      key={s.id}
                      className="glass-card interactive-element"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "16px 20px",
                        borderRadius: "14px",
                        border: "1px solid var(--border-glass-subtle)",
                        background: "var(--bg-glass-card)",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: isMcq ? "rgba(168, 85, 247, 0.15)" : "rgba(59, 130, 246, 0.15)",
                            color: isMcq ? "#c084fc" : "#60a5fa",
                            flexShrink: 0,
                          }}
                        >
                          {isMcq ? <QuestionIcon2D size={20} /> : <LayersIcon2D size={20} />}
                        </div>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>
                            {isMcq ? "Luyện trắc nghiệm (MCQ)" : "Ôn Flashcard"}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                            {formatDateTime(s.completedAt)} • Thời gian: {formatDuration(s.durationSeconds)}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Kết quả:</div>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>
                            {s.correctCount} / {s.totalCardsOrQuestions} đúng
                          </div>
                        </div>
                        <span
                          style={{
                            padding: "6px 12px",
                            borderRadius: "999px",
                            fontSize: "13px",
                            fontWeight: 800,
                            background: badgeBg,
                            color: badgeColor,
                            border: `1px solid ${badgeColor}40`,
                          }}
                        >
                          {s.scorePercentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
