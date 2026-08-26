import { useEffect, useState } from "react";
import { analyticsApi, type AnalyticsDashboardData, type ReviewRecord } from "../api/analytics-api";
import { ApiError } from "../api/client";
import { formatWaitRemaining, isReviewDue } from "../lib/review-time";
import { type AppPage, AppSidebar } from "../components/app-sidebar";
import { BookIcon2D, BrainIcon2D, ClockIcon2D, TrophyIcon2D } from "../components/icons";
import type { Account } from "../types/auth";
import "../styles/app.css";

type DashboardPageProps = {
  onNavigate: (page: AppPage) => void;
  onStartReview: (items: ReviewRecord[], startIndex: number) => void;
  token: string;
  account?: Account;
  onLogout?: () => void;
};

export function DashboardPage({ onNavigate, onStartReview, token, account, onLogout }: DashboardPageProps) {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ReviewRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [queueError, setQueueError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const userId = account?.id ?? 1;

    async function loadStats() {
      setIsLoading(true);
      setError("");
      setQueueError("");
      try {
        const [statsRes, queueRes] = await Promise.allSettled([
          analyticsApi.getDashboard(userId, token),
          analyticsApi.getReviewQueue(userId, token, 50),
        ]);

        if (!isMounted) return;

        if (statsRes.status === "fulfilled") {
          setData(statsRes.value);
          if (statsRes.value.reviews?.length) {
            setReviewQueue(statsRes.value.reviews);
          }
        } else {
          const reason = statsRes.reason;
          const message =
            reason instanceof ApiError && reason.status === 503
              ? "Dịch vụ Analytics chưa chạy — hãy khởi động lại run.cmd."
              : reason instanceof Error
                ? reason.message
                : "Không tải được thống kê Analytics.";
          setError(message);
          setData(null);
        }

        if (queueRes.status === "fulfilled") {
          if (queueRes.value.reviews?.length) {
            setReviewQueue(queueRes.value.reviews);
          } else if (statsRes.status === "fulfilled" && (statsRes.value.reviews?.length ?? 0) === 0 && statsRes.value.totalWords > 0) {
            setQueueError("Hàng đợi chưa cập nhật — hãy khởi động lại run.cmd để nạp analytics mới.");
          }
        } else if (statsRes.status === "fulfilled" && (statsRes.value.reviews?.length ?? 0) === 0 && statsRes.value.totalWords > 0) {
          const reason = queueRes.reason;
          setQueueError(
            reason instanceof ApiError && reason.status === 503
              ? "Không tải được hàng đợi — Analytics chưa chạy. Khởi động lại run.cmd."
              : reason instanceof Error
                ? reason.message
                : "Không tải được hàng đợi ôn tập.",
          );
        }
      } catch (reason) {
        if (isMounted) {
          setError(reason instanceof Error ? reason.message : "Không tải được dữ liệu bảng thống kê.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadStats();
    return () => {
      isMounted = false;
    };
  }, [token, account]);

  return (
    <div className="app-layout">
      <AppSidebar account={account} activePage="dashboard" onLogout={onLogout} onNavigate={onNavigate} />

      <main className="dashboard-page">
        <header style={{ marginBottom: "12px" }}>
          <h1 style={{ fontSize: "20px", margin: 0 }}>Bảng thống kê</h1>
        </header>

        {isLoading ? <p className="page-status">Đang nạp chỉ số phân tích...</p> : null}
        {error ? <p className="page-status page-status-error">{error}</p> : null}

        {data ? (
          <>
            <section aria-label="Thống kê tổng quan" className="dashboard-stats-grid">
              <article className="stat-card interactive-element">
                <span>
                  <BookIcon2D size={15} /> Tổng từ đã học
                </span>
                <strong>{data.totalWords}</strong>
              </article>

              <article className="stat-card interactive-element">
                <span>
                  <ClockIcon2D size={15} /> Cần ôn tập ngay
                </span>
                <strong style={{ color: data.dueNow > 0 ? "var(--state-error)" : "var(--text-main)" }}>
                  {data.dueNow}
                </strong>
              </article>

              <article className="stat-card interactive-element">
                <span>
                  <BrainIcon2D size={15} /> Đang học ghi nhớ
                </span>
                <strong style={{ color: "var(--state-warning)" }}>{data.learning}</strong>
              </article>

              <article className="stat-card interactive-element">
                <span>
                  <TrophyIcon2D size={15} /> Thành thục
                </span>
                <strong style={{ color: "var(--state-success)" }}>{data.mastered}</strong>
              </article>
            </section>

            <section aria-label="Tỷ lệ ghi nhớ" className="glass-card" style={{ marginBottom: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>Tỷ lệ chính xác trung bình</h2>
                <strong style={{ fontSize: "20px", color: "var(--brand-primary)" }}>{data.accuracy}%</strong>
              </div>
              <div style={{ height: "6px", background: "var(--border-glass-subtle)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, Math.max(0, data.accuracy))}%`,
                  background: "linear-gradient(90deg, var(--brand-primary), #8b5cf6)",
                  borderRadius: "var(--radius-full)",
                  transition: "width 0.3s ease"
                }} />
              </div>
            </section>

            <section aria-label="Hàng đợi ôn tập" className="glass-card">
              <h2 style={{ margin: "0 0 10px", fontSize: "15px", fontWeight: 600 }}>
                Hàng đợi ôn tập ({reviewQueue.length})
              </h2>
              {queueError ? <p className="page-status page-status-error" style={{ margin: "0 0 10px" }}>{queueError}</p> : null}

              {reviewQueue.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "13.5px", margin: 0 }}>
                  Chưa có từ vựng trong hàng đợi. Hoàn thành bài học MCQ để bổ sung từ vào lịch ôn Spaced Repetition.
                </p>
              ) : (
                <ul className="review-queue-list">
                  {reviewQueue.map((item, index) => {
                    const due = isReviewDue(item.nextReviewAt, now);
                    const waitLabel = formatWaitRemaining(item.nextReviewAt, now);

                    return (
                      <li key={item.vocabularyId} className="review-queue-item">
                        <div className="review-queue-main">
                          <strong className="review-queue-word">{item.word ?? "Từ vựng"}</strong>
                          <span className="review-queue-translation">{item.translation ?? ""}</span>
                        </div>
                        <div className="review-queue-meta">
                          <span className={`review-queue-wait${due ? " review-queue-wait-due" : ""}`}>
                            {waitLabel}
                          </span>
                          <button
                            className="manage-primary-button interactive-element review-queue-study"
                            onClick={() => onStartReview(reviewQueue, index)}
                            type="button"
                          >
                            Ôn ngay
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
