// This page displays aggregate learning statistics from Analytics through Gateway.
import { useEffect, useState } from "react";
import {
  fetchAnalyticsDashboard,
  type AnalyticsDashboard,
} from "../api/analytics-api";
import { type AppPage, AppSidebar } from "../components/app-sidebar";
import { BookIcon2D, BrainIcon2D, ClockIcon2D, TrophyIcon2D } from "../components/icons";
import type { Account } from "../types/auth";
import "../styles/app.css";

type DashboardPageProps = {
  onNavigate: (page: AppPage) => void;
  token: string;
  userId: string | number;
};

function formatNextReviewAt(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DashboardPage({ onNavigate, token, userId }: DashboardPageProps) {
  const [stats, setStats] = useState<AnalyticsDashboard>();
  const [error, setError] = useState("");
  const [queueError, setQueueError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let isMounted = true;
    setError("");
    setStats(undefined);

    fetchAnalyticsDashboard(userId, token)
      .then((body) => {
        if (isMounted) setStats(body);
      })
      .catch((reason: unknown) => {
        if (isMounted) {
          setError(reason instanceof Error ? reason.message : "Không tải được thống kê.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token, userId]);

  return (
    <div className="app-layout">
      <AppSidebar account={account} activePage="dashboard" onLogout={onLogout} onNavigate={onNavigate} />

      <main className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p>Theo dõi tiến độ và lịch ôn tập của bạn.</p>
          </div>
        </header>

        {error ? <p className="page-status page-status-error">{error}</p> : null}
        {!error && !stats ? <p className="page-status">Đang tải thống kê...</p> : null}

        {stats ? (
          <>
            <section className="dashboard-totals" aria-label="Tổng quan học tập">
              <span><strong>{stats.totalWords}</strong>Từ đã học</span>
              <span><strong>{stats.dueNow}</strong>Đến hạn ôn</span>
              <span><strong>{stats.learning}</strong>Đang học</span>
              <span><strong>{stats.mastered}</strong>Đã thuộc</span>
              <span><strong>{stats.accuracy}%</strong>Độ chính xác</span>
              <span><strong>{formatNextReviewAt(stats.nextReviewAt)}</strong>Ôn tiếp</span>
            </section>

            {stats.totalWords === 0 ? (
              <section className="dashboard-empty-state">
                <h2>Chưa có dữ liệu học tập</h2>
                <p>Hoàn thành một bài MCQ để Analytics ghi nhận kết quả đúng/sai.</p>
              </section>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
