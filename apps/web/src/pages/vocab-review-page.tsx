import { useEffect, useRef, useState } from "react";
import { submitBatchStudySession, type BatchReviewItem } from "../api/analytics-api";
import { apiRequest } from "../api/client";
import { endpoints } from "../api/endpoints";
import { AppPage, AppSidebar } from "../components/app-sidebar";
import { ArrowLeftIcon2D, CheckIcon2D, FlameIcon2D, TrophyIcon2D } from "../components/icons";
import { buildReviewQuiz, type ReviewQuizQuestion } from "../lib/review-quiz";
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
  extras?: DailyReviewCard[];
  token?: string;
  account?: Account;
  onComplete: () => void;
  onNavigate: (page: AppPage) => void;
  onLogout?: () => void;
};

function toQuizWord(card: DailyReviewCard) {
  return {
    cardId: card.cardId || card.word,
    deckId: card.deckId,
    word: card.word || card.front || "",
    translation: card.translation || card.back,
  };
}

export function VocabReviewPage({
  items,
  extras,
  token,
  account,
  onComplete,
  onNavigate,
  onLogout,
}: VocabReviewPageProps) {
  const [questions, setQuestions] = useState<ReviewQuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number>();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [reloadVersion, setReloadVersion] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [streakResult, setStreakResult] = useState<{ currentStreak: number; longestStreak: number }>();
  const startTimeRef = useRef(Date.now());
  const answersRef = useRef<Map<string, { question: ReviewQuizQuestion; correct: boolean }>>(new Map());

  useEffect(() => {
    let isMounted = true;

    async function loadQuiz() {
      setIsLoading(true);
      setErrorMessage(undefined);
      setChoice(undefined);
      setIndex(0);
      setIsCompleted(false);
      answersRef.current = new Map();
      startTimeRef.current = Date.now();

      try {
        const source = items && items.length > 0
          ? items
          : (await apiRequest<{ reviews: DailyReviewCard[] }>(
              endpoints.analytics.reviewsDue(30, "due"),
              { accessToken: token },
            )).reviews ?? [];
        if (!isMounted) return;

        const quiz = buildReviewQuiz(source.map(toQuizWord), (extras ?? []).map(toQuizWord));
        setQuestions(quiz);
        if (source.length > 0 && quiz.length === 0) {
          setErrorMessage("Các từ này chưa có nghĩa tiếng Việt, nên chưa tạo được câu hỏi.");
        }
      } catch (error) {
        if (isMounted) {
          setQuestions([]);
          setErrorMessage(error instanceof Error ? error.message : "Không tải được lượt luyện.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadQuiz();
    return () => {
      isMounted = false;
    };
  }, [items, extras, token, account?.id, reloadVersion]);

  const current = questions[index];

  function chooseOption(optionIndex: number) {
    if (!current || choice !== undefined) return;
    const correct = optionIndex === current.correctIndex;
    answersRef.current.set(current.cardId, { question: current, correct });
    setChoice(optionIndex);
  }

  function goNext() {
    if (choice === undefined) {
      setErrorMessage("Hãy chọn một đáp án trước khi sang câu tiếp.");
      return;
    }
    setErrorMessage(undefined);
    if (index < questions.length - 1) {
      setIndex((value) => value + 1);
      setChoice(undefined);
      return;
    }
    void finishSession();
  }

  async function finishSession() {
    setIsCompleted(true);
    setIsSubmittingBatch(true);
    const ratings = Array.from(answersRef.current.values());
    const reviewItems: BatchReviewItem[] = ratings.map(({ question, correct }) => ({
      cardId: question.cardId,
      deckId: question.deckId,
      word: question.word,
      translation: question.translation,
      correct,
    }));

    try {
      const result = await submitBatchStudySession(
        {
          userId: account?.id ? String(account.id) : "demo",
          sessionType: "daily_review",
          totalCardsOrQuestions: questions.length,
          correctCount: ratings.filter((item) => item.correct).length,
          durationSeconds: Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)),
          completedAt: new Date().toISOString(),
          reviews: reviewItems,
        },
        token,
      );
      if (result.streak) setStreakResult(result.streak);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Đã xong lượt luyện nhưng chưa lưu được: ${error.message}`
          : "Đã xong lượt luyện nhưng chưa lưu được kết quả.",
      );
    } finally {
      setIsSubmittingBatch(false);
    }
  }

  if (isLoading) {
    return (
      <div className="app-layout">
        <AppSidebar account={account} activePage="schedule" onLogout={onLogout} onNavigate={onNavigate} />
        <main className="review-quiz-page">
          <p className="page-status">Đang soạn câu hỏi cho các từ đến lượt...</p>
        </main>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="app-layout">
        <AppSidebar account={account} activePage="schedule" onLogout={onLogout} onNavigate={onNavigate} />
        <main className="review-quiz-page">
          <section className="glass-card review-quiz-panel">
            <h2>{errorMessage ? "Chưa vào được lượt luyện" : "Chưa có từ đến lượt"}</h2>
            <p>
              {errorMessage
                ?? "Khi chuông reo, quay lại đây để luyện các từ vừa đến hạn."}
            </p>
            <div className="review-quiz-actions">
              {errorMessage ? (
                <button className="manage-primary-button" onClick={() => setReloadVersion((value) => value + 1)} type="button">
                  Thử lại
                </button>
              ) : null}
              <button className="manage-secondary-button" onClick={onComplete} type="button">
                Về bảng thống kê
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (isCompleted) {
    const ratings = Array.from(answersRef.current.values());
    const correctCount = ratings.filter((item) => item.correct).length;
    const scorePercent = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="app-layout">
        <AppSidebar account={account} activePage="schedule" onLogout={onLogout} onNavigate={onNavigate} />
        <main className="review-quiz-page">
          <section className="glass-card review-quiz-panel">
            <TrophyIcon2D size={36} color="var(--state-success)" />
            <h2>Xong lượt luyện</h2>
            {isSubmittingBatch ? <p className="page-status">Đang lưu kết quả...</p> : null}
            {errorMessage ? <p className="page-status page-status-error">{errorMessage}</p> : null}
            {streakResult ? (
              <p className="review-quiz-streak">
                <FlameIcon2D size={16} color="#fb923c" />
                {streakResult.currentStreak} ngày học liên tiếp
              </p>
            ) : null}
            <p>
              Đúng {correctCount}/{questions.length} câu · {scorePercent}%
            </p>
            <button className="manage-primary-button" onClick={onComplete} type="button">
              Về bảng thống kê
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <AppSidebar account={account} activePage="schedule" onLogout={onLogout} onNavigate={onNavigate} />
      <main className="review-quiz-page">
        <header className="review-quiz-header">
          <button className="manage-secondary-button" onClick={onComplete} type="button">
            <ArrowLeftIcon2D size={14} /> Bảng thống kê
          </button>
          <span>Câu {index + 1}/{questions.length}</span>
        </header>

        <div className="review-quiz-progress" aria-hidden="true">
          <span style={{ width: `${Math.round(((index + 1) / questions.length) * 100)}%` }} />
        </div>

        {errorMessage ? <p className="page-status page-status-error">{errorMessage}</p> : null}

        <section className="glass-card review-quiz-question">
          <p>Chọn nghĩa đúng</p>
          <h2 className="korean-text">{current.word}</h2>
          <div className="review-quiz-options">
            {current.options.map((option, optionIndex) => {
              const picked = choice === optionIndex;
              const reveal = choice !== undefined;
              const isRight = optionIndex === current.correctIndex;
              const state = reveal && isRight ? "is-correct" : reveal && picked ? "is-wrong" : "";
              return (
                <button
                  className={`review-quiz-option ${state}`}
                  disabled={choice !== undefined}
                  key={`${current.cardId}-${option}`}
                  onClick={() => chooseOption(optionIndex)}
                  type="button"
                >
                  {option}
                  {reveal && isRight ? <CheckIcon2D size={16} /> : null}
                </button>
              );
            })}
          </div>
        </section>

        <button className="manage-primary-button review-quiz-next" onClick={goNext} type="button">
          {index === questions.length - 1 ? "Nộp bài" : "Câu tiếp"}
        </button>
      </main>
    </div>
  );
}
