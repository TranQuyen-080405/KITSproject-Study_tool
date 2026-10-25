import { useEffect, useState } from "react";
import {
  fetchAnalyticsDashboard,
  type AnalyticsDashboard,
} from "../api/analytics-api";
import { type AppPage, AppSidebar } from "../components/app-sidebar";
import {
  BookIcon2D,
  BrainIcon2D,
  ClockIcon2D,
  FlameIcon2D,
  PlayIcon2D,
  QuestionIcon2D,
  TrophyIcon2D,
  ZapIcon2D,
} from "../components/icons";
import type { Account } from "../types/auth";
import "../styles/app.css";

type DashboardPageProps = {
  onNavigate: (page: AppPage) => void;
  token: string;
  account?: Account;
  onLogout?: () => void;
};

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

export function DashboardPage({
  onNavigate,
  token,
  account,
  onLogout,
}: DashboardPageProps) {
  const [stats, setStats] = useState<AnalyticsDashboard>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError("");

    fetchAnalyticsDashboard(token)
      .then((body) => {
        if (isMounted) setStats(body);
      })
      .catch((reason: unknown) => {
        if (isMounted) {
          setError(
            reason instanceof Error ? reason.message : "Không tải được thống kê.",
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // 14 days activity list (minimalist Apple Fitness style)
  const last14Days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    const dayName = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()];
    const dateLabel = `${d.getDate()}/${d.getMonth() + 1}`;
    const count = stats?.activityByDate?.[key] || 0;
    return { key, dayName, dateLabel, count };
  });

  const activeDaysCount = last14Days.filter((d) => d.count > 0).length;

  return (
    <div className="app-layout">
      <AppSidebar
        account={account}
        activePage="dashboard"
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <main className="dashboard-page">
        <header>
          <div>
            <h1 style={{ fontSize: "20px", margin: "0 0 4px", fontWeight: 800 }}>
              Bảng thống kê
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "13.5px", margin: 0 }}>
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {stats && stats.dueNow > 0 ? (
              <button
                className="login-primary-button interactive-element"
                onClick={() => onNavigate("review")}
                type="button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "9px 16px",
                  fontSize: "13px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #f97316, #ef4444)",
                  border: "none",
                }}
              >
                <PlayIcon2D size={15} color="#fff" /> Ôn ngay ({stats.dueNow} từ)
              </button>
            ) : null}

            <button
              className="manage-primary-button interactive-element"
              onClick={() => onNavigate("flashcards")}
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                fontSize: "13px",
                fontWeight: 700,
                borderRadius: "10px",
              }}
            >
              <BookIcon2D size={14} color="#fff" /> Bộ thẻ Flashcard
            </button>
          </div>
        </header>

        {isLoading ? <p className="page-status">Đang nạp chỉ số phân tích...</p> : null}
        {error ? <p className="page-status page-status-error">{error}</p> : null}

        {stats && !isLoading ? (
          <>
            {/* Overview Metric Cards (Fluid Grid) */}
            <section aria-label="Thống kê tổng quan" className="dashboard-stats-grid">
              <article className="stat-card interactive-element">
                <span>
                  <FlameIcon2D size={15} color="#fb923c" /> Chuỗi ngày
                </span>
                <strong>{stats.streakDays ?? 0} ngày</strong>
              </article>

              <article className="stat-card interactive-element">
                <span>
                  <BookIcon2D size={15} color="#818cf8" /> Tổng từ đã học
                </span>
                <strong>{stats.totalWords}</strong>
              </article>

              <article
                className="stat-card interactive-element"
                onClick={() => stats.dueNow > 0 && onNavigate("review")}
                style={{ cursor: stats.dueNow > 0 ? "pointer" : "default" }}
              >
                <span>
                  <ClockIcon2D
                    size={15}
                    color={stats.dueNow > 0 ? "var(--state-error)" : "#34d399"}
                  />{" "}
                  Cần ôn ngay {stats.dueNow > 0 ? "➔" : ""}
                </span>
                <strong
                  style={{
                    color: stats.dueNow > 0 ? "var(--state-error)" : "inherit",
                  }}
                >
                  {stats.dueNow}
                </strong>
              </article>



            </section>

            {/* Activity & Retention Panel */}
            <section aria-label="Mức độ chuyên cần" className="glass-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div>
                  <h2 style={{ margin: "0 0 3px", fontSize: "15px", fontWeight: 700 }}>
                    Chuyên cần học tập
                  </h2>
                  <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-muted)" }}>
                    14 ngày gần nhất • Lần ôn tiếp theo: {formatDateTime(stats.nextReviewAt)}
                  </p>
                </div>

                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: "var(--radius-full)",
                    background: "rgba(129, 140, 248, 0.15)",
                    color: "var(--brand-primary)",
                    border: "1px solid rgba(129, 140, 248, 0.3)",
                  }}
                >
                  {activeDaysCount}/14 ngày hoạt động
                </span>
              </div>

              {/* Minimalist Activity Bar Tracks */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(14, 1fr)",
                  gap: "6px",
                  marginBottom: "16px",
                }}
              >
                {last14Days.map((item) => {
                  let fillPercent = 0;
                  if (item.count >= 3) fillPercent = 100;
                  else if (item.count === 2) fillPercent = 65;
                  else if (item.count === 1) fillPercent = 35;

                  return (
                    <div
                      key={item.key}
                      title={`${item.key}: ${item.count} lượt học`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "46px",
                          borderRadius: "8px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid var(--border-glass-subtle)",
                          display: "flex",
                          alignItems: "flex-end",
                          padding: "2px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: `${fillPercent}%`,
                            borderRadius: "5px",
                            background:
                              fillPercent > 0
                                ? "linear-gradient(180deg, #818cf8, #6366f1)"
                                : "transparent",
                            transition: "height 0.3s ease",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: "10.5px",
                          color: "var(--text-muted)",
                          fontWeight: 600,
                        }}
                      >
                        {item.dateLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Accuracy Bar inside Retention Panel */}
              <div
                style={{
                  paddingTop: "12px",
                  borderTop: "1px solid var(--border-glass-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                    Độ chính xác trung bình
                  </span>
                  <strong style={{ fontSize: "16px", color: "var(--brand-primary)" }}>
                    {stats.accuracy}%
                  </strong>
                </div>
                <div
                  style={{
                    height: "6px",
                    background: "rgba(255, 255, 255, 0.08)",
                    borderRadius: "var(--radius-full)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, Math.max(0, stats.accuracy))}%`,
                      background: "linear-gradient(90deg, var(--brand-primary), #a855f7)",
                      borderRadius: "var(--radius-full)",
                      transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  />
                </div>
              </div>
            </section>

            {/* Bottom Two-Column Panels */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                gap: "16px",
              }}
            >

              {/* Panel 2: Struggling Words (Leeches) */}
              <section className="glass-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "14px",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "15px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                    }}
                  >
                    <FlameIcon2D size={16} color="var(--state-error)" />
                    Từ vựng cần củng cố
                  </h2>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {stats.strugglingWords?.length ?? 0} từ
                  </span>
                </div>

                {!stats.strugglingWords || stats.strugglingWords.length === 0 ? (
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "13.5px",
                      margin: 0,
                      padding: "16px 0",
                      textAlign: "center",
                    }}
                  >
                    Hiện không có từ chưa thuộc hoặc đến hạn ôn. Hãy tiếp tục phát huy!
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {stats.strugglingWords.map((w) => (
                      <div
                        key={w.cardId}
                        className="interactive-element"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "11px 14px",
                          borderRadius: "var(--radius-md)",
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid var(--border-glass-subtle)",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0, marginRight: "10px" }}>
                          <span
                            style={{
                              fontSize: "14.5px",
                              fontWeight: 800,
                              color: "var(--text-main)",
                            }}
                          >
                            {w.word}
                          </span>
                          {w.translation ? (
                            <span
                              style={{
                                fontSize: "12.5px",
                                color: "var(--text-muted)",
                                marginLeft: "10px",
                              }}
                            >
                              {w.translation}
                            </span>
                          ) : null}
                        </div>
                        <span style={{ fontSize: "12px", flexShrink: 0, color: w.dueNow ? "var(--state-error)" : "var(--text-muted)" }}>
                          {w.dueNow ? "Đến hạn ôn" : "Chưa thuộc"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
