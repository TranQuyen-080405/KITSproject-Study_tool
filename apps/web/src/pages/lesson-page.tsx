// This page displays the lesson catalogue loaded through the API Gateway.
import { useEffect, useState } from "react";
import { fetchLessonSummaries, type PublicLessonSummary } from "../api/lessons-api";
import { AppPage, AppSidebar } from "../components/app-sidebar";
import "../styles/app.css";

type LessonPageProps = {
  onNavigate: (page: AppPage) => void;
  onSelectLesson: (lessonId: string) => void;
};

export function LessonPage({ onNavigate, onSelectLesson }: LessonPageProps) {
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
      <AppSidebar activePage="lessons" onNavigate={onNavigate} />

      <main className="lesson-page">
        <header className="lesson-page-header">
          <h1>Bài học tiếng Hàn</h1>
        </header>

        {isLoading ? <p className="page-status">Đang tải bài học...</p> : null}
        {errorMessage ? <p className="page-status page-status-error">{errorMessage}</p> : null}

        {!isLoading && !errorMessage && lessons.length === 0 ? (
          <p className="page-status">Chưa có bài học nào.</p>
        ) : null}

        <section aria-label="Danh sách bài học" className="lesson-list">
          {lessons.map((lesson) => (
            <button
              className="lesson-row"
              key={lesson.lessonId}
              onClick={() => onSelectLesson(lesson.lessonId)}
              type="button"
            >
              <span className="lesson-row-copy">
                <span className="lesson-row-title">{lesson.lessonTitle}</span>
                <span className="lesson-row-description">{lesson.lessonDescription}</span>
                <span className="lesson-row-meta">
                  {lesson.vocabularyCount} từ vựng · {lesson.questionCount} câu hỏi
                </span>
              </span>
              <span aria-hidden="true" className="lesson-row-arrow">
                →
              </span>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}
