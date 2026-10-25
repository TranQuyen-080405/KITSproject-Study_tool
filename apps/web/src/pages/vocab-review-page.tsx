import { useEffect, useRef, useState } from "react";
import {
  submitBatchStudySession,
  type BatchReviewItem,
} from "../api/analytics-api";
import { apiRequest } from "../api/client";
import { endpoints } from "../api/endpoints";
import { AppPage, AppSidebar } from "../components/app-sidebar";
import {
  ArrowLeftIcon2D,
  CheckIcon2D,
  CloseIcon2D,
  FlameIcon2D,
  LayersIcon2D,
  RotateIcon2D,
  TrophyIcon2D,
} from "../components/icons";
import type { Account } from "../types/auth";
import "../styles/app.css";

export type DailyReviewCard = {
  cardId: string;
  deckId?: string;
  word: string;
  front?: string;
  translation: string;
  back?: string;
  status?: string;
  easeFactor?: number;
  intervalDays?: number;
};

type VocabReviewPageProps = {
  items?: DailyReviewCard[];
  startIndex?: number;
  token?: string;
  account?: Account;
  onComplete: () => void;
  onNavigate: (page: AppPage) => void;
  onLogout?: () => void;
};

export function VocabReviewPage({
  items,
  startIndex = 0,
  token,
  account,
  onComplete,
  onNavigate,
  onLogout,
}: VocabReviewPageProps) {
  const [cards, setCards] = useState<DailyReviewCard[]>(items || []);
  const [cardIndex, setCardIndex] = useState(startIndex);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(!items || items.length === 0);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isCompleted, setIsCompleted] = useState(false);

  // Analytics Tracking
  const startTimeRef = useRef(Date.now());
  const cardRatingsRef = useRef<Map<string, { item: DailyReviewCard; correct: boolean }>>(new Map());
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [streakResult, setStreakResult] = useState<{ currentStreak: number; longestStreak: number }>();

  const current = cards[cardIndex];

  // Fetch due cards if not passed via props
  useEffect(() => {
    if (items && items.length > 0) {
      setCards(items);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    async function loadDueCards() {
      setIsLoading(true);
      setErrorMessage(undefined);
      try {
        const res = await apiRequest<{ reviews: DailyReviewCard[]; count: number }>(
          endpoints.analytics.reviewsDue(30, "due"),
          { accessToken: token },
        );
        if (!isMounted) return;
        if (res.reviews && res.reviews.length > 0) {
          setCards(res.reviews);
        } else {
          // Fallback to queue if nothing strictly due today
          const queueRes = await apiRequest<{ reviews: DailyReviewCard[]; count: number }>(
            endpoints.analytics.reviewsDue(20, "queue"),
            { accessToken: token },
          );
          if (isMounted) {
            setCards(queueRes.reviews || []);
          }
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : "Không tải được danh sách từ cần ôn.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadDueCards();
    return () => {
      isMounted = false;
    };
  }, [items, account?.id, token]);

  function handleRateCard(correct: boolean) {
    if (!current) return;

    cardRatingsRef.current.set(current.cardId || current.word, {
      item: current,
      correct,
    });

    if (cardIndex < cards.length - 1) {
      setCardIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      void finishSession();
    }
  }

  async function finishSession() {
    setIsCompleted(true);
    setIsSubmittingBatch(true);

    const ratings = Array.from(cardRatingsRef.current.values());
    const correctCount = ratings.filter((r) => r.correct).length;
    const durationSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const userId = account?.id ? String(account.id) : "demo";

    const reviewItems: BatchReviewItem[] = ratings.map(({ item, correct }) => ({
      cardId: item.cardId || item.word,
      deckId: item.deckId,
      word: item.word || item.front || "",
      translation: item.translation || item.back || "",
      correct,
    }));

    try {
      const res = await submitBatchStudySession(
        {
          userId,
          sessionType: "daily_review",
          totalCardsOrQuestions: cards.length,
          correctCount,
          durationSeconds,
          completedAt: new Date().toISOString(),
          reviews: reviewItems,
        },
        token,
      );
      if (res.streak) {
        setStreakResult(res.streak);
      }
    } catch {
      // Offline fallback: non-blocking
    } finally {
      setIsSubmittingBatch(false);
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="app-layout">
        <AppSidebar account={account} activePage="dashboard" onLogout={onLogout} onNavigate={onNavigate} />
        <main className="review-page" style={{ textAlign: "center", padding: "48px 20px" }}>
          <p className="page-status">Đang nạp các từ vựng cần ôn tập hôm nay...</p>
        </main>
      </div>
    );
  }

  // Empty state: All caught up!
  if (cards.length === 0) {
    return (
      <div className="app-layout">
        <AppSidebar account={account} activePage="dashboard" onLogout={onLogout} onNavigate={onNavigate} />
        <main
          style={{
            maxWidth: "600px",
            margin: "40px auto",
            padding: "0 20px",
          }}
        >
          <div
            className="glass-card"
            style={{
              textAlign: "center",
              padding: "48px 24px",
              borderRadius: "24px",
              border: "1px solid var(--border-glass)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                padding: "16px",
                borderRadius: "50%",
                background: "rgba(52, 211, 153, 0.15)",
                color: "var(--state-success)",
                marginBottom: "16px",
              }}
            >
              <TrophyIcon2D size={36} color="var(--state-success)" />
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 8px" }}>
              Tuyệt vời! Không còn từ nào cần ôn hôm nay
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--text-muted)",
                lineHeight: 1.6,
                margin: "0 0 24px",
              }}
            >
              Bạn đã ôn tập xong toàn bộ từ vựng theo chu kỳ SM-2 hôm nay. Trí não của bạn đang củng cố
              các liên kết thần kinh để ghi nhớ lâu dài.
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                className="manage-secondary-button interactive-element"
                onClick={onComplete}
                type="button"
                style={{ padding: "10px 20px", borderRadius: "10px", fontWeight: 600 }}
              >
                Về Bảng thống kê
              </button>
              <button
                className="manage-primary-button interactive-element"
                onClick={() => onNavigate("flashcards")}
                type="button"
                style={{ padding: "10px 20px", borderRadius: "10px", fontWeight: 700 }}
              >
                Học thêm bộ thẻ mới
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Completion State
  if (isCompleted) {
    const ratings = Array.from(cardRatingsRef.current.values());
    const correctCount = ratings.filter((r) => r.correct).length;
    const scorePercent = cards.length > 0 ? Math.round((correctCount / cards.length) * 100) : 100;

    return (
      <div className="app-layout">
        <AppSidebar account={account} activePage="dashboard" onLogout={onLogout} onNavigate={onNavigate} />
        <main
          style={{
            maxWidth: "600px",
            margin: "40px auto",
            padding: "0 20px",
          }}
        >
          <div
            className="glass-card"
            style={{
              textAlign: "center",
              padding: "48px 24px",
              borderRadius: "24px",
              border: "1px solid var(--border-glass)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                padding: "16px",
                borderRadius: "50%",
                background: "rgba(52, 211, 153, 0.15)",
                color: "var(--state-success)",
                marginBottom: "16px",
              }}
            >
              <TrophyIcon2D size={38} color="var(--state-success)" />
            </div>

            <h2 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 8px" }}>
              Hoàn thành buổi ôn tập!
            </h2>

            {/* Streak Badge */}
            {streakResult ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 18px",
                  borderRadius: "999px",
                  background: "rgba(251, 146, 60, 0.15)",
                  color: "#fb923c",
                  border: "1px solid rgba(251, 146, 60, 0.3)",
                  marginBottom: "24px",
                  fontWeight: 800,
                  fontSize: "14.5px",
                }}
              >
                <FlameIcon2D size={18} color="#fb923c" />
                Chuỗi ngày học: {streakResult.currentStreak} ngày liên tiếp!
              </div>
            ) : null}

            {/* Stats Overview */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "28px",
              }}
            >
              <div
                style={{
                  padding: "16px",
                  borderRadius: "14px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--border-glass-subtle)",
                }}
              >
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Đã ghi nhớ
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--state-success)" }}>
                  {correctCount} / {cards.length}
                </div>
              </div>

              <div
                style={{
                  padding: "16px",
                  borderRadius: "14px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--border-glass-subtle)",
                }}
              >
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Độ chính xác
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--brand-primary)" }}>
                  {scorePercent}%
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                className="manage-primary-button interactive-element"
                onClick={onComplete}
                type="button"
                style={{
                  padding: "11px 24px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                Về Bảng thống kê
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const progressPercent = Math.round(((cardIndex + 1) / cards.length) * 100);

  return (
    <div className="app-layout">
      <AppSidebar account={account} activePage="dashboard" onLogout={onLogout} onNavigate={onNavigate} />

      <main
        style={{
          maxWidth: "680px",
          margin: "0 auto",
          padding: "24px 20px 48px",
        }}
      >
        {/* Header Bar */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <button
            className="manage-secondary-button interactive-element"
            onClick={onComplete}
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              fontSize: "13px",
              borderRadius: "8px",
            }}
          >
            <ArrowLeftIcon2D size={14} /> Bảng thống kê
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--text-muted)",
              }}
            >
              {cardIndex + 1} / {cards.length}
            </span>
          </div>
        </header>

        {/* Progress Bar */}
        <div
          style={{
            height: "4px",
            background: "rgba(255, 255, 255, 0.08)",
            borderRadius: "999px",
            overflow: "hidden",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPercent}%`,
              background: "linear-gradient(90deg, var(--brand-primary), #a855f7)",
              borderRadius: "999px",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {errorMessage ? <p className="page-status page-status-error">{errorMessage}</p> : null}

        {/* Interactive Flashcard */}
        <div
          className="glass-card interactive-element"
          onClick={() => setIsFlipped((prev) => !prev)}
          style={{
            minHeight: "300px",
            borderRadius: "20px",
            padding: "36px 28px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "center",
            textAlign: "center",
            cursor: "pointer",
            border: "1px solid var(--border-glass)",
            background: "var(--bg-glass-card)",
            boxShadow: "0 16px 36px rgba(0, 0, 0, 0.25)",
            transition: "all 0.25s ease",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <LayersIcon2D size={13} /> {isFlipped ? "Mặt sau (Ý nghĩa)" : "Mặt trước (Tiếng Hàn)"}
          </div>

          <div style={{ margin: "28px 0" }}>
            {!isFlipped ? (
              <div
                className="korean-text"
                style={{
                  fontSize: "36px",
                  fontWeight: 800,
                  color: "var(--brand-primary)",
                  letterSpacing: "-0.5px",
                }}
              >
                {current?.word || current?.front || "—"}
              </div>
            ) : (
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  lineHeight: 1.4,
                }}
              >
                {current?.translation || current?.back || "—"}
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              opacity: 0.8,
            }}
          >
            <RotateIcon2D size={13} /> Bấm thẻ để lật ({isFlipped ? "xem từ tiếng Hàn" : "xem nghĩa tiếng Việt"})
          </div>
        </div>

        {/* Rating Decision Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <button
            className="manage-secondary-button interactive-element"
            onClick={() => handleRateCard(false)}
            type="button"
            style={{
              padding: "14px 20px",
              fontSize: "14px",
              fontWeight: 700,
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              borderColor: "rgba(239, 68, 68, 0.3)",
              color: "var(--state-error)",
              background: "rgba(239, 68, 68, 0.08)",
            }}
          >
            <CloseIcon2D size={16} /> Chưa nhớ (Học lại)
          </button>

          <button
            className="login-primary-button interactive-element"
            onClick={() => handleRateCard(true)}
            type="button"
            style={{
              padding: "14px 20px",
              fontSize: "14px",
              fontWeight: 700,
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background: "linear-gradient(135deg, #059669, #10b981)",
              border: "none",
            }}
          >
            <CheckIcon2D size={16} color="#fff" /> Đã nhớ (Đúng)
          </button>
        </div>
      </main>
    </div>
  );
}
