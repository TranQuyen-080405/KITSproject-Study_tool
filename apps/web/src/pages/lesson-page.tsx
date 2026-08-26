import { useEffect, useState } from "react";
import { fetchLessonSummaries, type PublicLessonSummary } from "../api/lessons-api";
import { AppPage, AppSidebar } from "../components/app-sidebar";
import { ArrowRightIcon2D, BookIcon2D, PlusIcon2D } from "../components/icons";
import type { Account } from "../types/auth";
import "../styles/app.css";

type LessonPageProps = {
  onNavigate: (page: AppPage) => void;
  onSelectLesson: (lessonId: string) => void;
  account?: Account;
  onLogout?: () => void;
};

export function LessonPage({ onNavigate, onSelectLesson, account, onLogout }: LessonPageProps) {
  const [lessons, setLessons] = useState<PublicLessonSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    async function loadLessons() {
      setIsLoading(true);
      setErrorMessage(undefined);

      try {
        const nextLessons = await fetchLessonSummaries();
        if (isMounted) {
          setLessons(nextLessons);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Không tải được danh sách bài học.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadLessons();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="app-layout">
      <AppSidebar account={account} activePage="lessons" onLogout={onLogout} onNavigate={onNavigate} />

      <main className="lesson-page">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h1 style={{ fontSize: "20px", margin: 0 }}>Bài Học Tiếng Hàn</h1>
          <button
            className="manage-secondary-button interactive-element"
            onClick={() => onNavigate("manage-content")}
            type="button"
          >
            <PlusIcon2D size={14} /> Quản lý bài học
          </button>
        </header>

        {isLoading ? <p className="page-status">Đang nạp bài học...</p> : null}
        {errorMessage ? <p className="page-status page-status-error">{errorMessage}</p> : null}

        {!isLoading && !errorMessage && lessons.length === 0 ? (
          <div className="glass-card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <h2 style={{ fontSize: "18px", margin: "0 0 6px" }}>Chưa có bài học nào</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "13.5px" }}>
              Hãy tạo bài học mới, nhập từ vựng và câu hỏi trắc nghiệm trong trang Quản lý.
            </p>
            <div style={{ marginTop: "14px" }}>
              <button
                className="manage-primary-button interactive-element"
                onClick={() => onNavigate("manage-content")}
                type="button"
              >
                <PlusIcon2D size={16} /> Tạo bài học đầu tiên
              </button>
            </div>
          </div>
        ) : null}

        <section aria-label="Danh sách bài học" className="lesson-grid">
          {lessons.map((lesson) => (
            <article className="lesson-card interactive-element" key={lesson.lessonId}>
              <div>
                <h2>{lesson.lessonTitle}</h2>
                <p>{lesson.lessonDescription}</p>
              </div>

              <div className="lesson-card-meta">
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <BookIcon2D size={14} /> {lesson.vocabularyCount} từ vựng
                </span>
                <span>• {lesson.questionCount} câu hỏi</span>
              </div>

              <button
                className="lesson-start-button interactive-element"
                onClick={() => onSelectLesson(lesson.lessonId)}
                type="button"
              >
                <span>Bắt đầu học</span>
                <ArrowRightIcon2D size={14} />
              </button>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
