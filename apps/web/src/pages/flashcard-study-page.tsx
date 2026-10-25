import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchFlashcardDeck,
  type FlashcardCard,
  type FlashcardDeck,
} from "../api/flashcard-api";
import { submitBatchStudySession } from "../api/analytics-api";
import { AppPage, AppSidebar } from "../components/app-sidebar";
import {
  ArrowLeftIcon2D,
  ArrowRightIcon2D,
  CheckIcon2D,
  CloseIcon2D,
  RotateIcon2D,
  ShuffleIcon2D,
  TrophyIcon2D,
} from "../components/icons";
import type { Account } from "../types/auth";
import "../styles/app.css";

type FlashcardStudyPageProps = {
  deckId: string;
  onNavigate: (page: AppPage) => void;
  onBackToDecks: () => void;
  account?: Account;
  onLogout?: () => void;
};

export function FlashcardStudyPage({
  deckId,
  onNavigate,
  onBackToDecks,
  account,
  onLogout,
}: FlashcardStudyPageProps) {
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [cards, setCards] = useState<FlashcardCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFrontKorean, setIsFrontKorean] = useState(true);

  // Analytics session tracking
  const startTimeRef = useRef(Date.now());
  const cardRatingsRef = useRef<Map<string, boolean>>(new Map());
  const [sessionSynced, setSessionSynced] = useState(false);
  const [streakResult, setStreakResult] = useState<{ currentStreak: number; longestStreak: number }>();

  // Storage key for marked/starred cards in this deck
  const markedStorageKey = `haru-marked-cards-${deckId}`;
  const [markedCardIds, setMarkedCardIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(markedStorageKey);
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  // Filter mode: "all" or "marked"
  const [filterMode, setFilterMode] = useState<"all" | "marked">("all");

  useEffect(() => {
    let isMounted = true;
    async function loadDeckData() {
      setIsLoading(true);
      setErrorMessage(undefined);
      try {
        const detail = await fetchFlashcardDeck(deckId);
        if (!isMounted) return;
        setDeck(detail);
        setCards(detail.cards || []);
        setCurrentIndex(0);
        setIsFlipped(false);
        setIsCompleted(false);
      } catch (err) {
        if (isMounted) {
          setErrorMessage(
            err instanceof Error ? err.message : "Không tải được bộ thẻ flashcard.",
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadDeckData();
    return () => {
      isMounted = false;
    };
  }, [deckId]);

  // Persist marked cards to localStorage
  function saveMarkedIds(nextSet: Set<string>) {
    setMarkedCardIds(nextSet);
    try {
      localStorage.setItem(markedStorageKey, JSON.stringify([...nextSet]));
    } catch {
      // ignore storage quota
    }
  }

  function toggleMarkCard(cardId: string) {
    const next = new Set(markedCardIds);
    if (next.has(cardId)) {
      next.delete(cardId);
    } else {
      next.add(cardId);
    }
    saveMarkedIds(next);
  }

  // Active list based on filter
  const activeCards = useMemo(() => {
    if (filterMode === "marked") {
      return cards.filter((c) => markedCardIds.has(c.id));
    }
    return cards;
  }, [cards, filterMode, markedCardIds]);

  const currentCard = activeCards[currentIndex];

  function handleFlip() {
    setIsFlipped((prev) => !prev);
  }

  function handleNext() {
    if (currentIndex < activeCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      setIsCompleted(true);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  }

  function handleShuffle() {
    if (cards.length <= 1) return;
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
  }

  function handleRestart(onlyMarked = false) {
    if (onlyMarked) {
      setFilterMode("marked");
    } else {
      setFilterMode("all");
    }
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
    setSessionSynced(false);
    setStreakResult(undefined);
    cardRatingsRef.current.clear();
    startTimeRef.current = Date.now();
  }

  // Quick rating helpers: "Chưa nhớ" (mark + next) & "Đã thuộc" (unmark + next)
  function handleNotRemembered() {
    if (!currentCard) return;
    cardRatingsRef.current.set(currentCard.id, false);
    if (!markedCardIds.has(currentCard.id)) {
      const next = new Set(markedCardIds);
      next.add(currentCard.id);
      saveMarkedIds(next);
    }
    handleNext();
  }

  function handleRemembered() {
    if (!currentCard) return;
    cardRatingsRef.current.set(currentCard.id, true);
    if (markedCardIds.has(currentCard.id)) {
      const next = new Set(markedCardIds);
      next.delete(currentCard.id);
      saveMarkedIds(next);
    }
    handleNext();
  }

  // Auto-submit batch session to analytics on completion
  useEffect(() => {
    if (!isCompleted || sessionSynced || activeCards.length === 0 || !account?.id) return;
    setSessionSynced(true);

    const durationSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const reviews = activeCards.map((c) => ({
      cardId: c.id,
      deckId,
      word: c.front,
      translation: c.back,
      correct: cardRatingsRef.current.get(c.id) ?? !markedCardIds.has(c.id),
    }));
    const correctCount = reviews.filter((r) => r.correct).length;

    submitBatchStudySession(
      {
        userId: account.id,
        deckId,
        deckTitle: deck?.title,
        sessionType: "deck_study",
        totalCardsOrQuestions: activeCards.length,
        correctCount,
        durationSeconds,
        reviews,
      },
      account.accessToken,
    )
      .then((res) => {
        if (res?.streak) {
          setStreakResult(res.streak);
        }
      })
      .catch((err) => {
        console.warn("Không thể lưu kết quả học vào Analytics:", err);
      });
  }, [isCompleted, sessionSynced, activeCards, deck, deckId, account, markedCardIds]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown") {
        e.preventDefault();
        handleFlip();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "m" || e.key === "M") {
        if (currentCard) {
          e.preventDefault();
          toggleMarkCard(currentCard.id);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentCard, currentIndex, activeCards.length, isFlipped]);

  const progressPercent = activeCards.length > 0
    ? Math.round(((currentIndex + (isCompleted ? 1 : 0)) / activeCards.length) * 100)
    : 0;

  return (
    <div className="app-layout">
      <AppSidebar
        account={account}
        activePage="flashcards"
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <main className="review-page" style={{ maxWidth: "720px", margin: "0 auto", padding: "16px 20px" }}>
        {/* Top Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              className="manage-secondary-button interactive-element"
              onClick={onBackToDecks}
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                borderRadius: "8px",
              }}
            >
              <ArrowLeftIcon2D size={13} /> Danh sách
            </button>
            <h1 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>
              {deck?.title ?? "Học Flashcard"}
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Filter Toggle */}
            <div
              style={{
                display: "flex",
                background: "var(--bg-glass-input)",
                borderRadius: "8px",
                padding: "2px",
                border: "1px solid var(--border-glass-subtle)",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setFilterMode("all");
                  setCurrentIndex(0);
                  setIsFlipped(false);
                  setIsCompleted(false);
                }}
                style={{
                  background: filterMode === "all" ? "var(--brand-primary)" : "transparent",
                  color: filterMode === "all" ? "#fff" : "var(--text-muted)",
                  border: "none",
                  padding: "4px 10px",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Tất cả ({cards.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode("marked");
                  setCurrentIndex(0);
                  setIsFlipped(false);
                  setIsCompleted(false);
                }}
                style={{
                  background: filterMode === "marked" ? "var(--brand-primary)" : "transparent",
                  color: filterMode === "marked" ? "#fff" : "var(--text-muted)",
                  border: "none",
                  padding: "4px 10px",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Đã đánh dấu ({cards.filter((c) => markedCardIds.has(c.id)).length})
              </button>
            </div>

            {/* Direction toggle */}
            <button
              className="manage-secondary-button interactive-element"
              onClick={() => {
                setIsFrontKorean((prev) => !prev);
                setIsFlipped(false);
              }}
              title="Đổi chiều câu hỏi (Hàn ↔ Việt)"
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "8px",
              }}
            >
              <RotateIcon2D size={13} />
              <span>{isFrontKorean ? "Hàn → Việt" : "Việt → Hàn"}</span>
            </button>

            {/* Shuffle */}
            <button
              className="manage-secondary-button interactive-element"
              onClick={handleShuffle}
              title="Xáo trộn thứ tự thẻ"
              type="button"
              style={{ padding: "6px 10px", borderRadius: "8px" }}
            >
              <ShuffleIcon2D size={14} />
            </button>
          </div>
        </header>

        {/* Progress bar */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "var(--text-muted)",
              marginBottom: "6px",
            }}
          >
            <span>Tiến độ học</span>
            <span>
              {activeCards.length > 0
                ? `${Math.min(currentIndex + 1, activeCards.length)} / ${activeCards.length}`
                : "0 / 0"}
            </span>
          </div>
          <div
            style={{
              height: "6px",
              width: "100%",
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPercent}%`,
                background: "var(--brand-primary)",
                transition: "width 0.25s ease",
              }}
            />
          </div>
        </div>

        {isLoading ? <p className="page-status">Đang nạp thẻ...</p> : null}
        {errorMessage ? <p className="page-status page-status-error">{errorMessage}</p> : null}

        {/* Empty filter message */}
        {!isLoading && !errorMessage && activeCards.length === 0 && (
          <div
            className="glass-card"
            style={{ textAlign: "center", padding: "40px 20px", borderRadius: "18px" }}
          >
            <p style={{ margin: "0 0 12px", color: "var(--text-muted)", fontSize: "14px" }}>
              {filterMode === "marked"
                ? "Chưa có thẻ nào được đánh dấu sao trong bộ này."
                : "Bộ thẻ này hiện chưa có từ vựng nào."}
            </p>
            {filterMode === "marked" && (
              <button
                className="manage-secondary-button interactive-element"
                onClick={() => setFilterMode("all")}
                type="button"
              >
                Xem tất cả thẻ ({cards.length})
              </button>
            )}
          </div>
        )}

        {/* Completion Screen */}
        {!isLoading && isCompleted && (
          <div
            className="glass-card"
            style={{
              textAlign: "center",
              padding: "48px 24px",
              borderRadius: "24px",
              boxShadow: "var(--shadow-glass)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                padding: "20px",
                borderRadius: "999px",
                background: "var(--state-success-bg)",
                color: "var(--state-success)",
                marginBottom: "16px",
              }}
            >
              <TrophyIcon2D size={44} />
            </div>

            <h2 style={{ fontSize: "22px", margin: "0 0 8px", fontWeight: 700 }}>
              Hoàn thành xuất sắc!
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: "0 0 16px" }}>
              Bạn đã lướt qua tất cả {activeCards.length} thẻ trong lượt học này.
            </p>

            {streakResult && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 18px",
                  borderRadius: "999px",
                  background: "rgba(249, 115, 22, 0.15)",
                  border: "1px solid rgba(249, 115, 22, 0.4)",
                  color: "#fb923c",
                  fontWeight: 700,
                  fontSize: "13.5px",
                  marginBottom: "20px",
                }}
              >
                🔥 Chuỗi học liên tục: {streakResult.currentStreak} ngày!
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "20px",
                marginBottom: "28px",
              }}
            >
              <div
                style={{
                  background: "var(--bg-glass-input)",
                  padding: "12px 20px",
                  borderRadius: "14px",
                  border: "1px solid var(--border-glass-subtle)",
                }}
              >
                <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--brand-primary)" }}>
                  {activeCards.length}
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>Thẻ đã xem</div>
              </div>

              <div
                style={{
                  background: "var(--bg-glass-input)",
                  padding: "12px 20px",
                  borderRadius: "14px",
                  border: "1px solid var(--border-glass-subtle)",
                }}
              >
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#f59e0b" }}>
                  {cards.filter((c) => markedCardIds.has(c.id)).length}
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>Cần ôn lại (Mark)</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
              <button
                className="manage-secondary-button interactive-element"
                onClick={() => handleRestart(false)}
                type="button"
                style={{ padding: "10px 20px" }}
              >
                Học lại từ đầu
              </button>

              {cards.some((c) => markedCardIds.has(c.id)) && (
                <button
                  className="login-primary-button interactive-element"
                  onClick={() => handleRestart(true)}
                  type="button"
                  style={{ padding: "10px 20px" }}
                >
                  Chỉ ôn thẻ đã đánh dấu ({cards.filter((c) => markedCardIds.has(c.id)).length})
                </button>
              )}

              <button
                className="manage-secondary-button interactive-element"
                onClick={onBackToDecks}
                type="button"
                style={{ padding: "10px 20px" }}
              >
                Về danh sách bộ thẻ
              </button>
            </div>
          </div>
        )}

        {/* 3D Flip Flashcard */}
        {!isLoading && !isCompleted && currentCard && (
          <div>
            <div
              style={{
                perspective: "1200px",
                width: "100%",
                height: "360px",
                cursor: "pointer",
                marginBottom: "20px",
              }}
              onClick={handleFlip}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  textAlign: "center",
                  transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                  transformStyle: "preserve-3d",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* ── CARD FRONT ── */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    opacity: isFlipped ? 0 : 1,
                    visibility: isFlipped ? "hidden" : "visible",
                    pointerEvents: isFlipped ? "none" : "auto",
                    zIndex: isFlipped ? 1 : 2,
                    transition: "opacity 0.25s ease, visibility 0.25s ease",
                    background: "var(--bg-glass-card)",
                    backdropFilter: "blur(24px)",
                    border: "1.5px solid var(--border-glass)",
                    borderRadius: "24px",
                    padding: "28px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "var(--shadow-glass)",
                  }}
                >
                  {/* Front Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--brand-primary)",
                        background: "var(--brand-primary-light)",
                        padding: "4px 10px",
                        borderRadius: "999px",
                        border: "1px solid var(--brand-primary)",
                      }}
                    >
                      {isFrontKorean ? "Mặt trước · Tiếng Hàn" : "Mặt trước · Nghĩa tiếng Việt"}
                    </span>

                    {/* Mark Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMarkCard(currentCard.id);
                      }}
                      title={markedCardIds.has(currentCard.id) ? "Bỏ đánh dấu" : "Đánh dấu thẻ này (Phím M)"}
                      style={{
                        background: markedCardIds.has(currentCard.id)
                          ? "rgba(239, 68, 68, 0.2)"
                          : "rgba(255, 255, 255, 0.08)",
                        border: `1px solid ${
                          markedCardIds.has(currentCard.id)
                            ? "rgba(239, 68, 68, 0.5)"
                            : "var(--border-glass-subtle)"
                        }`,
                        color: markedCardIds.has(currentCard.id) ? "#f87171" : "var(--text-muted)",
                        cursor: "pointer",
                        padding: "4px 12px",
                        borderRadius: "999px",
                        fontSize: "11px",
                        fontWeight: 600,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {markedCardIds.has(currentCard.id) ? "Đã đánh dấu" : "Đánh dấu"}
                    </button>
                  </div>

                  {/* Front Main Content */}
                  <div style={{ margin: "auto 0" }}>
                    <h2
                      style={{
                        fontSize: isFrontKorean ? "38px" : "28px",
                        fontWeight: 700,
                        margin: 0,
                        fontFamily: isFrontKorean ? "var(--font-korean)" : "inherit",
                        color: "var(--text-main)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {isFrontKorean ? currentCard.front : currentCard.back}
                    </h2>

                    {currentCard.hint && (
                      <p
                        style={{
                          margin: "12px 0 0",
                          fontSize: "13px",
                          color: "var(--text-muted)",
                          fontStyle: "italic",
                        }}
                      >
                        Gợi ý: {currentCard.hint}
                      </p>
                    )}
                  </div>

                  {/* Front Footer */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      opacity: 0.8,
                    }}
                  >
                    <RotateIcon2D size={13} />
                    <span>Nhấp vào thẻ hoặc phím Space để lật</span>
                  </div>
                </div>

                {/* ── CARD BACK ── */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    opacity: isFlipped ? 1 : 0,
                    visibility: isFlipped ? "visible" : "hidden",
                    pointerEvents: isFlipped ? "auto" : "none",
                    zIndex: isFlipped ? 2 : 1,
                    transition: "opacity 0.25s ease, visibility 0.25s ease",
                    background: "rgba(15, 23, 42, 0.88)",
                    backdropFilter: "blur(24px)",
                    border: "1.5px solid var(--brand-primary)",
                    borderRadius: "24px",
                    padding: "28px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 20px 40px -10px rgba(129, 140, 248, 0.25)",
                  }}
                >
                  {/* Back Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#10b981",
                          background: "rgba(16, 185, 129, 0.2)",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          border: "1px solid #10b981",
                        }}
                      >
                        {isFrontKorean ? "Mặt sau · Nghĩa tiếng Việt" : "Mặt sau · Tiếng Hàn"}
                      </span>
                      <span
                        style={{
                          fontSize: "13px",
                          fontFamily: "var(--font-korean)",
                          color: "var(--text-muted)",
                          fontWeight: 600,
                        }}
                      >
                        ({isFrontKorean ? currentCard.front : currentCard.back})
                      </span>
                    </div>

                    {/* Mark Button on Back */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMarkCard(currentCard.id);
                      }}
                      title={markedCardIds.has(currentCard.id) ? "Bỏ đánh dấu" : "Đánh dấu thẻ này (Phím M)"}
                      style={{
                        background: markedCardIds.has(currentCard.id)
                          ? "rgba(239, 68, 68, 0.2)"
                          : "rgba(255, 255, 255, 0.08)",
                        border: `1px solid ${
                          markedCardIds.has(currentCard.id)
                            ? "rgba(239, 68, 68, 0.5)"
                            : "var(--border-glass-subtle)"
                        }`,
                        color: markedCardIds.has(currentCard.id) ? "#f87171" : "var(--text-muted)",
                        cursor: "pointer",
                        padding: "4px 12px",
                        borderRadius: "999px",
                        fontSize: "11px",
                        fontWeight: 600,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {markedCardIds.has(currentCard.id) ? "Đã đánh dấu" : "Đánh dấu"}
                    </button>
                  </div>

                  {/* Back Main Content */}
                  <div style={{ margin: "auto 0" }}>
                    <h2
                      style={{
                        fontSize: isFrontKorean ? "28px" : "38px",
                        fontWeight: 700,
                        margin: 0,
                        fontFamily: isFrontKorean ? "inherit" : "var(--font-korean)",
                        color: "#fff",
                        lineHeight: 1.4,
                      }}
                    >
                      {isFrontKorean ? currentCard.back : currentCard.front}
                    </h2>
                  </div>

                  {/* Back Footer */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      opacity: 0.8,
                    }}
                  >
                    <RotateIcon2D size={13} />
                    <span>Nhấp vào thẻ để quay lại mặt trước</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Controls */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                alignItems: "center",
              }}
            >
              {/* Quick Knowledge Actions (Chưa nhớ / Đã thuộc) */}
              <div style={{ display: "flex", gap: "12px", width: "100%", maxWidth: "420px" }}>
                <button
                  type="button"
                  onClick={handleNotRemembered}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: "12px",
                    fontSize: "13px",
                    fontWeight: 600,
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#f87171",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"; }}
                >
                  <CloseIcon2D size={13} color="#f87171" /> Chưa nhớ
                </button>

                <button
                  type="button"
                  onClick={handleRemembered}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: "12px",
                    fontSize: "13px",
                    fontWeight: 600,
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    color: "#34d399",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(16, 185, 129, 0.25)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(16, 185, 129, 0.15)"; }}
                >
                  <CheckIcon2D size={14} color="#34d399" /> Đã thuộc
                </button>
              </div>

              {/* Prev / Flip / Next bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  marginTop: "4px",
                }}
              >
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="manage-secondary-button interactive-element"
                  style={{
                    padding: "8px 14px",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "13px",
                    opacity: currentIndex === 0 ? 0.4 : 1,
                    cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  <ArrowLeftIcon2D size={14} /> Trước
                </button>

                <button
                  type="button"
                  onClick={handleFlip}
                  className="manage-secondary-button interactive-element"
                  style={{
                    padding: "8px 18px",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    background: "var(--brand-primary-light)",
                    border: "1px solid var(--brand-primary)",
                    color: "var(--brand-primary)",
                  }}
                >
                  <RotateIcon2D size={14} /> Lật thẻ
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="login-primary-button interactive-element"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "13px",
                  }}
                >
                  {currentIndex === activeCards.length - 1 ? "Hoàn thành" : "Tiếp theo"}
                  <ArrowRightIcon2D size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
