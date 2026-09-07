import { AppPage, AppSidebar } from "../components/app-sidebar";
import { BookIcon2D, ChartIcon2D, RefreshIcon2D } from "../components/icons";
import type { Account } from "../types/auth";
import "../styles/app.css";

type ResultPageProps = {
  correctCount: number;
  totalCount: number;
  reviewsRecorded?: number;
  reviewsSyncFailed?: number;
  onRetry: () => void;
  onExit: () => void;
  onNavigate?: (page: AppPage) => void;
  account?: Account;
  onLogout?: () => void;
};

export function ResultPage({
  correctCount,
  totalCount,
  reviewsRecorded = 0,
  reviewsSyncFailed = 0,
  onRetry,
  onExit,
  onNavigate,
  account,
  onLogout,
}: ResultPageProps) {
  const accuracy = totalCount ? Math.round((correctCount / totalCount) * 100) : 0;
  const isPassed = accuracy >= 70;

  return (
    <div className="app-layout">
      <AppSidebar account={account} activePage="result" onLogout={onLogout} onNavigate={onNavigate ?? onExit} />

      <main className="login-page">
        <section aria-labelledby="result-title" className="login-card" style={{ textAlign: "center" }}>
          <p className="eyebrow">KẾT QUẢ BÀI HỌC</p>

          <div style={{
            fontSize: "38px",
            fontWeight: 800,
            margin: "8px 0",
            color: isPassed ? "var(--state-success)" : "var(--state-warning)",
          }}>
            {accuracy}%
          </div>

          <h1 id="result-title" style={{ margin: "0", fontSize: "18px", fontWeight: 700 }}>
            {isPassed ? "Xuất sắc! Vượt qua bài học" : "Hãy luyện tập thêm để nhớ lâu hơn"}
          </h1>

          <p style={{ margin: "6px 0 14px", color: "var(--text-muted)", fontSize: "13.5px" }}>
            Trả lời đúng <strong>{correctCount}</strong> / {totalCount} câu hỏi trắc nghiệm.
          </p>

          {reviewsRecorded > 0 ? (
            <p style={{ margin: "0 0 8px", color: "var(--state-success)", fontSize: "13px", fontWeight: 600 }}>
              Đã lưu {reviewsRecorded} từ vào tiến độ ôn tập
            </p>
          ) : null}

          {reviewsSyncFailed > 0 ? (
            <p style={{ margin: "0 0 14px", color: "var(--state-warning)", fontSize: "12.5px" }}>
              Không lưu được {reviewsSyncFailed} từ — tiến độ có thể chưa cập nhật trên Bảng thống kê.
            </p>
          ) : null}

          <div style={{ display: "flex", gap: "10px", width: "100%", flexWrap: "wrap" }}>
            <button
              className="manage-secondary-button interactive-element"
              onClick={onRetry}
              style={{ flex: 1, minHeight: "40px", justifyContent: "center" }}
              type="button"
            >
              <RefreshIcon2D size={14} />
              <span>Luyện lại</span>
            </button>
            <button
              className="login-primary-button interactive-element"
              onClick={onExit}
              style={{ flex: 1, minHeight: "40px", justifyContent: "center" }}
              type="button"
            >
              <BookIcon2D size={14} />
              <span>Bài học</span>
            </button>
            {onNavigate ? (
              <button
                className="login-primary-button interactive-element"
                onClick={() => onNavigate("dashboard")}
                style={{ flex: 1, minHeight: "40px", justifyContent: "center" }}
                type="button"
              >
                <ChartIcon2D size={14} />
                <span>Bảng thống kê</span>
              </button>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
