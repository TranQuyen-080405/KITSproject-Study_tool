// This page loads MCQ content for a selected lesson through the API Gateway.
import { useEffect, useState } from "react";
import {
  checkLessonAnswer,
  fetchLessonDetail,
  type PublicLessonDetail,
} from "../api/lessons-api";
import { type AppPage } from "../components/app-sidebar";
import "../styles/app.css";

type McqPageProps = {
  lessonId: string;
  onNavigate: (page: AppPage) => void;
  onComplete: (correctCount: number, totalCount: number) => void;
};

export function McqPage({ lessonId, onNavigate, onComplete }: McqPageProps) {
  const [lesson, setLesson] = useState<PublicLessonDetail>();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string>();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    async function loadLesson() {
      setIsLoading(true);
      setErrorMessage(undefined);
      setQuestionIndex(0);
      setSelectedAnswerId(undefined);
      setAnswers({});

      try {
        const nextLesson = await fetchLessonDetail(lessonId);
        if (isMounted) {
          setLesson(nextLesson);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Không tải được bài trắc nghiệm.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadLesson();

    return () => {
      isMounted = false;
    };
  }, [lessonId]);

  const currentQuestion = lesson?.lessonQuestions[questionIndex];
  const questionCount = lesson?.lessonQuestions.length ?? 0;
  const isLastQuestion = questionIndex >= questionCount - 1;

  async function handleNextQuestion() {
    if (!selectedAnswerId || !lesson) {
      return;
    }
    const nextAnswers = { ...answers, [currentQuestion!.questionId]: selectedAnswerId };
    setAnswers(nextAnswers);
    if (!isLastQuestion) {
      setQuestionIndex((currentIndex) => currentIndex + 1);
      setSelectedAnswerId(undefined);
      return;
    }
    setIsSubmitting(true);
    try {
      const results = await Promise.all(
        lesson.lessonQuestions.map((question) =>
          checkLessonAnswer(
            question.questionId,
            Number(nextAnswers[question.questionId]),
          ),
        ),
      );
      onComplete(
        results.filter(({ correct }) => correct).length,
        lesson.lessonQuestions.length,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể chấm kết quả.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mcq-page">
      <header className="mcq-page-header">
        <button
          className="back-button"
          onClick={() => onNavigate("lessons")}
          type="button"
        >
          ← Quay lại bài học
        </button>
        <p className="eyebrow">{(lesson?.lessonTitle ?? "Bài học").toUpperCase()}</p>
        <p className="question-count">
          {currentQuestion
            ? `Câu hỏi ${questionIndex + 1} / ${questionCount}`
            : "Đang tải câu hỏi"}
        </p>
      </header>

      {isLoading ? <p className="page-status">Đang tải câu hỏi...</p> : null}
      {errorMessage ? <p className="page-status page-status-error">{errorMessage}</p> : null}

      {currentQuestion ? (
        <>
          <section aria-labelledby="mcq-question" className="mcq-card">
            <p className="question-label">CHỌN ĐÁP ÁN ĐÚNG</p>
            <h1 id="mcq-question">{currentQuestion.questionText}</h1>

            <div className="answer-list">
              {currentQuestion.answerOptions.map((answer, index) => {
                const isSelected = answer.answerId === selectedAnswerId;

                return (
                  <button
                    aria-pressed={isSelected}
                    className={`answer-option${isSelected ? " answer-option-selected" : ""}`}
                    key={answer.answerId}
                    onClick={() => setSelectedAnswerId(answer.answerId)}
                    type="button"
                  >
                    <span className="answer-letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                    {answer.answerText}
                  </button>
                );
              })}
            </div>
          </section>

          <button
            className="next-question-button"
            disabled={!selectedAnswerId || isSubmitting}
            onClick={handleNextQuestion}
            type="button"
          >
            {isSubmitting ? "Đang chấm..." : isLastQuestion ? "Xem kết quả" : "Câu tiếp theo"}
          </button>
        </>
      ) : null}
    </main>
  );
}
