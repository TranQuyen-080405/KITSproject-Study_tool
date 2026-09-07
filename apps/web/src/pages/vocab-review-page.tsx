import { useState } from "react";
import { analyticsApi, type ReviewRecord } from "../api/analytics-api";
import { AppPage, AppSidebar } from "../components/app-sidebar";
import { ArrowLeftIcon2D } from "../components/icons";
import type { Account } from "../types/auth";
import "../styles/app.css";

type VocabReviewPageProps = {
  items: ReviewRecord[];
  startIndex?: number;
  token: string;
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
  const session = items.slice(startIndex);
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const current = session[cardIndex];

  async function handleAnswer(correct: boolean) {
    if (!current || !account || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(undefined);

    try {
      await analyticsApi.recordReview(
        {
          userId: String(account.id),
          vocabularyId: current.vocabularyId,
          correct,
          word: current.word,
          translation: current.translation,
        },
        token,
      );

      if (cardIndex >= session.length - 1) {
        onComplete();
        return;
      }

      setCardIndex((index) => index + 1);
      setRevealed(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không lưu được kết quả ôn tập.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (session.length === 0) {
    return (
      <div className="app-layout">
        <AppSidebar account={account} activePage="dashboard" onLogout={onLogout} onNavigate={onNavigate} />
        <main className="review-page">
          <p className="page-status">Không có từ vựng trong hàng đợi.</p>
          <button className="manage-secondary-button interactive-element" onClick={onComplete} type="button">
            Quay lại Bảng thống kê
          </button>
        </main>
      </div>
    );
  }

  const progressPercent = Math.round(((cardIndex + 1) / session.length) * 100);

  return (
    <div className="app-layout">
      <AppSidebar account={account} activePage="dashboard" onLogout={onLogout} onNavigate={onNavigate} />

      <main className="review-page">
        <header className="review-header">
          <button
            className="manage-secondary-button interactive-element"
            onClick={onComplete}
            type="button"
          >
            <ArrowLeftIcon2D size={14} /> Bảng thống kê
          </button>
          <span className="review-progress-label">
            {cardIndex + 1} / {session.length}
          </span>
        </header>

        <div className="review-progress-track" aria-hidden="true">
          <div className="review-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        {errorMessage ? <p className="page-status page-status-error">{errorMessage}</p> : null}

        <section aria-labelledby="review-word" className="review-flashcard glass-card">
          <p className="eyebrow">ÔN TỪ VỰNG</p>
          <h1 id="review-word" className="review-word">{current.word ?? "Từ vựng"}</h1>

          {revealed ? (
            <p className="review-meaning">{current.translation ?? "—"}</p>
          ) : (
            <button
              className="manage-secondary-button interactive-element review-reveal-button"
              onClick={() => setRevealed(true)}
              type="button"
            >
              Hiện nghĩa
            </button>
          )}

          <div className="review-answer-actions">
            <button
              className="manage-secondary-button interactive-element review-answer-wrong"
              disabled={!revealed || isSubmitting}
              onClick={() => void handleAnswer(false)}
              type="button"
            >
              Chưa nhớ
            </button>
            <button
              className="login-primary-button interactive-element review-answer-correct"
              disabled={!revealed || isSubmitting}
              onClick={() => void handleAnswer(true)}
              type="button"
            >
              {isSubmitting ? "Đang lưu..." : "Nhớ rồi"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
