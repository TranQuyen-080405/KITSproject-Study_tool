import { useEffect, useState } from "react";
import {
  fetchAnalyticsDashboard,
  type AnalyticsDashboard,
  type StudySession,
} from "../api/analytics-api";
import { type AppPage, AppSidebar } from "../components/app-sidebar";
import {
  BookIcon2D,
  ClockIcon2D,
  FlameIcon2D,
} from "../components/icons";
import { buildContributionWeeks } from "../lib/contribution-grid";
import type { Account } from "../types/auth";
import "../styles/app.css";

type DashboardPageProps = {
  onNavigate: (page: AppPage) => void;
  token: string;
  account?: Account;
  onLogout?: () => void;
};

function formatResponseTime(ms: number | undefined): string {
  if (!ms || ms <= 0) return "Chưa có";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1).replace(".", ",")} giây`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} giây`;
  return `${Math.round(seconds / 60)} phút`;
}

function sessionTitle(session: StudySession): string {
  if (session.deckTitle?.trim()) return session.deckTitle.trim();
  if (session.sessionType === "daily_review") return "Ôn trong ngày";
  if (session.sessionType === "mcq") return "Trắc nghiệm";
  if (session.sessionType === "flashcard") return "Lật thẻ";
  return "Học bộ thẻ";
}

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
            reason instanceof Error ? reason.message : "Không tải được bảng thống kê. Thử lại sau.",
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

  const contributionWeeks = buildContributionWeeks(stats?.activityByDate);
  const activeDaysCount = contributionWeeks
    .flatMap((week) => week.cells)
    .filter((cell) => !cell.future && cell.count > 0).length;

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
          </div>

          <div className="dashboard-header-actions">
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

        {isLoading ? <p className="page-status">Đang tải bảng thống kê...</p> : null}
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
                onClick={() => onNavigate("schedule")}
                style={{ cursor: "pointer" }}
              >
                <span>
                  <ClockIcon2D
                    size={15}
                    color={(stats.dueNow ?? 0) > 0 ? "var(--state-error)" : "#34d399"}
                  />{" "}
                  Đến lượt {(stats.dueNow ?? 0) > 0 ? "➔" : ""}
                </span>
                <strong
                  style={{
                    color: (stats.dueNow ?? 0) > 0 ? "var(--state-error)" : "inherit",
                  }}
                >
                  {stats.dueNow ?? 0}
                </strong>
              </article>



            </section>

            <section aria-label="Tiến độ học" className="glass-card">
              <h2 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700 }}>Tiến độ</h2>
              <dl className="dashboard-facts">
                <div>
                  <dt>Đã thuộc</dt>
                  <dd>{stats.mastered}</dd>
                </div>
                <div>
                  <dt>Đang học</dt>
                  <dd>{stats.learning}</dd>
                </div>
                <div>
                  <dt>Chuỗi dài nhất</dt>
                  <dd>{stats.longestStreak ?? stats.streakDays ?? 0} ngày</dd>
                </div>
                <div>
                  <dt>Số buổi</dt>
                  <dd>{stats.totalSessions ?? 0}</dd>
                </div>
                <div>
                  <dt>Tốc độ trả lời</dt>
                  <dd>{formatResponseTime(stats.averageResponseTimeMs)}</dd>
                </div>
              </dl>
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
                    12 tháng gần nhất • Lần ôn tiếp theo: {formatDateTime(stats.nextReviewAt)}
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
                  {activeDaysCount} ngày có học
                </span>
              </div>

              <div className="contrib" aria-label="Lịch chuyên cần 12 tháng">
                <div className="contrib-scroll">
                  <div className="contrib-chart">
                    <div className="contrib-months" aria-hidden="true">
                      {contributionWeeks.map((week, index) => (
                        <span key={`${week.cells[0]?.key ?? index}-month`}>{week.monthLabel}</span>
                      ))}
                    </div>
                    <div className="contrib-body">
                      <div className="contrib-dow" aria-hidden="true">
                        <span /><span>T2</span><span /><span>T4</span><span /><span>T6</span><span />
                      </div>
                      <div className="contrib-weeks">
                        {contributionWeeks.flatMap((week) => week.cells).map((cell) => (
                          <span
                            className="contrib-cell"
                            data-future={cell.future ? "true" : undefined}
                            data-level={cell.future ? undefined : cell.level}
                            key={cell.key}
                            title={cell.future ? undefined : `${cell.key.slice(8, 10)}/${cell.key.slice(5, 7)}/${cell.key.slice(0, 4)}: ${cell.count} lượt`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
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
                {(stats.totalAnswers ?? 0) > 0 ? (
                  <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                    Đúng {stats.correctAnswers ?? 0} / {stats.totalAnswers} lượt
                  </span>
                ) : null}
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

            <div className="dashboard-split">
              <section aria-label="Buổi học gần đây" className="glass-card">
                <h2 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700 }}>Buổi học gần đây</h2>
                {(stats.recentSessions ?? []).length === 0 ? (
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13.5px" }}>Chưa có buổi học.</p>
                ) : (
                  <ul className="dashboard-sessions">
                    {(stats.recentSessions ?? []).slice(0, 8).map((session) => (
                      <li className="dashboard-session" key={session.id}>
                        <div>
                          <strong>{sessionTitle(session)}</strong>
                          <span>{formatDateTime(session.completedAt)}</span>
                        </div>
                        <span>
                          {session.correctCount}/{session.totalCardsOrQuestions} đúng · {formatDuration(session.durationSeconds)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-label="Từ đã học" className="glass-card">
                <h2 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700 }}>
                  Từ đã học
                  <span style={{ marginLeft: "8px", color: "var(--text-muted)", fontWeight: 600 }}>{stats.learnedWords?.length ?? stats.totalWords}</span>
                </h2>
                {(stats.learnedWords ?? []).length === 0 ? (
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13.5px" }}>Chưa có từ nào.</p>
                ) : (
                  <ul className="dashboard-words">
                    {(stats.learnedWords ?? []).map((word, index) => (
                      <li className="dashboard-word" key={`${word.word}-${word.translation ?? ""}-${index}`}>
                        <strong className="korean-text">{word.word}</strong>
                        {word.translation ? <span>{word.translation}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

          </>
        ) : null}
      </main>
    </div>
  );
}
