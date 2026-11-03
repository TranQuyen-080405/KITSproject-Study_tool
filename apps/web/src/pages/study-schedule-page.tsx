import { useEffect, useState } from "react";
import {
  fetchAnalyticsDashboard,
  type StrugglingWord,
} from "../api/analytics-api";
import { type AppPage, AppSidebar } from "../components/app-sidebar";
import { PlayIcon2D } from "../components/icons";
import { formatWaitRemaining, isReviewDue } from "../lib/review-time";
import type { Account } from "../types/auth";
import "../styles/app.css";

type StudySchedulePageProps = {
  onNavigate: (page: AppPage) => void;
  token: string;
  account?: Account;
  onLogout?: () => void;
  onStartReview: (items: StrugglingWord[], extras?: StrugglingWord[]) => void;
};

export function StudySchedulePage({
  onNavigate,
  token,
  account,
  onLogout,
  onStartReview,
}: StudySchedulePageProps) {
  const [words, setWords] = useState<StrugglingWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");
    fetchAnalyticsDashboard(token)
      .then((body) => {
        if (active) setWords(body.strugglingWords ?? []);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Không tải được lịch học.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const dueWords = words.filter((word) => isReviewDue(word.nextReviewAt, now));
  const waitingWords = words.filter((word) => !isReviewDue(word.nextReviewAt, now));

  function startReview() {
    if (dueWords.length === 0) {
      setError("Chưa có từ đến lượt.");
      return;
    }
    if (dueWords.every((word) => !(word.translation ?? "").trim())) {
      setError("Các từ này chưa có nghĩa, nên chưa tạo được câu hỏi.");
      return;
    }
    setError("");
    onStartReview(dueWords, waitingWords);
  }

  return (
    <div className="app-layout">
      <AppSidebar account={account} activePage="schedule" onLogout={onLogout} onNavigate={onNavigate} />
      <main className="dashboard-page">
        <header>
          <h1 style={{ fontSize: "20px", margin: 0, fontWeight: 800 }}>Lịch học</h1>
          {dueWords.length > 0 ? (
            <button className="manage-primary-button" onClick={startReview} type="button">
              <PlayIcon2D size={14} /> Luyện
            </button>
          ) : null}
        </header>

        {isLoading ? <p className="page-status">Đang tải lịch học...</p> : null}
        {error ? <p className="page-status page-status-error">{error}</p> : null}

        {!isLoading && words.length === 0 && !error ? (
          <p className="page-status">Chưa có từ trong lịch.</p>
        ) : null}

        {!isLoading && words.length > 0 ? (
          <div className="dashboard-split">
            <section className="glass-card reinforcement-group" aria-label="Đến lượt">
              <div className="reinforcement-group-heading">
                <strong>Đến lượt</strong>
                <span>{dueWords.length}</span>
              </div>
              {dueWords.length === 0 ? <p className="reinforcement-more">Chưa có.</p> : null}
              <div className="reinforcement-list">
                {dueWords.map((word) => (
                  <div className="reinforcement-row reinforcement-row-due" key={word.cardId}>
                    <strong className="korean-text">{word.word}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-card reinforcement-group" aria-label="Đang chờ">
              <div className="reinforcement-group-heading">
                <strong>Đang chờ</strong>
                <span>{waitingWords.length}</span>
              </div>
              {waitingWords.length === 0 ? <p className="reinforcement-more">Không có.</p> : null}
              <div className="reinforcement-list">
                {waitingWords.map((word) => (
                  <div className="reinforcement-row" key={word.cardId}>
                    <strong className="korean-text">{word.word}</strong>
                    <span>{formatWaitRemaining(word.nextReviewAt, now)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
