// This page displays word correctness statistics from Analytics through Gateway.
import { useEffect, useState } from "react";
import { type AppPage, AppSidebar } from "../components/app-sidebar";
import "../styles/app.css";

type WordStatistic = { wordId: string; wordText: string; correctCount: number; wrongCount: number };
type DashboardPageProps = { onNavigate: (page: AppPage) => void; token: string };

export function DashboardPage({ onNavigate, token }: DashboardPageProps) {
  const [words, setWords] = useState<WordStatistic[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/word-correctness", { headers: { authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Không tải được thống kê.");
        return response.json() as Promise<{ words: WordStatistic[] }>;
      })
      .then((body) => setWords(body.words))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Có lỗi xảy ra."));
  }, [token]);

  const highestCount = Math.max(1, ...words.flatMap((word) => [word.correctCount, word.wrongCount]));
  const totalCorrect = words.reduce((total, word) => total + word.correctCount, 0);
  const totalWrong = words.reduce((total, word) => total + word.wrongCount, 0);

  return (
    <div className="app-layout">
      <AppSidebar activePage="dashboard" onNavigate={onNavigate} />
      <main className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
          </div>
        </header>
        {error ? <p className="page-status page-status-error">{error}</p> : null}
        {!error && words.length === 0 ? (
          <section className="dashboard-empty-state">
            <h2>Chưa có dữ liệu học tập</h2>
            <p>Hoàn thành một bài MCQ để xem số lần đúng và sai theo từng từ.</p>
          </section>
        ) : null}
        {words.length > 0 ? <section className="word-chart" aria-label="Biểu đồ số lần đúng và sai">
          <header className="word-chart-header">
            <h2>Từ vựng đã luyện tập</h2>
            <div className="chart-legend" aria-label="Chú thích biểu đồ">
              <span><i className="legend-dot legend-dot-correct" />Đúng</span>
              <span><i className="legend-dot legend-dot-wrong" />Sai</span>
            </div>
          </header>
          {words.map((word) => (
            <article className="word-chart-row" key={word.wordId}>
              <strong className="word-chart-title">{word.wordText}</strong>
              <div className="bar-group">
                <div className="bar-line">
                  <span>Đúng</span>
                  <progress className="bar-correct" max={highestCount} value={word.correctCount} />
                  <strong>{word.correctCount}</strong>
                </div>
                <div className="bar-line">
                  <span>Sai</span>
                  <progress className="bar-wrong" max={highestCount} value={word.wrongCount} />
                  <strong>{word.wrongCount}</strong>
                </div>
              </div>
            </article>
          ))}
        </section> : null}
      </main>
    </div>
  );
}
