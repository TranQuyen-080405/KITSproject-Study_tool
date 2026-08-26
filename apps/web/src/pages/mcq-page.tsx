import { useEffect, useState } from "react";
import {
  checkLessonAnswer,
  fetchLessonDetail,
  fetchLessonVocabularies,
  type ContentVocabulary,
  type PublicLessonDetail,
} from "../api/lessons-api";
import { analyticsApi } from "../api/analytics-api";
import { inferVocabularyFromQuestion } from "../lib/infer-vocabulary";
import { AppPage, AppSidebar } from "../components/app-sidebar";
import { ArrowLeftIcon2D, ArrowRightIcon2D } from "../components/icons";
import type { Account } from "../types/auth";
import "../styles/app.css";

type McqPageProps = {
  lessonId: string;
  account?: Account;
  onNavigate: (page: AppPage) => void;
  onComplete: (correctCount: number, totalCount: number, reviewsRecorded: number, reviewsSyncFailed?: number) => void;
  onLogout?: () => void;
};

export function McqPage({ lessonId, account, onNavigate, onComplete, onLogout }: McqPageProps) {
  const [lesson, setLesson] = useState<PublicLessonDetail>();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number>();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [vocabById, setVocabById] = useState<Record<string, { word: string; meaning: string }>>({});
  const [vocabularies, setVocabularies] = useState<ContentVocabulary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    async function loadLesson() {
      setIsLoading(true);
      setErrorMessage(undefined);
      setQuestionIndex(0);
      setSelectedAnswerIndex(undefined);
      setAnswers({});
      setVocabById({});
      setVocabularies([]);

      try {
        const [nextLesson, loadedVocabularies] = await Promise.all([
          fetchLessonDetail(lessonId),
          fetchLessonVocabularies(lessonId),
        ]);
        if (isMounted) {
          setLesson(nextLesson);
          setVocabularies(loadedVocabularies);
          setVocabById(
            Object.fromEntries(loadedVocabularies.map((item) => [item.id, { word: item.word, meaning: item.meaning }])),
          );
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
  const progressPercent = questionCount > 0 ? Math.round(((questionIndex + 1) / questionCount) * 100) : 0;

  async function handleNextQuestion() {
    if (selectedAnswerIndex === undefined || !lesson || !currentQuestion) {
      return;
    }
    const nextAnswers = { ...answers, [currentQuestion.questionId]: selectedAnswerIndex };
    setAnswers(nextAnswers);

    if (!isLastQuestion) {
      setQuestionIndex((currentIndex) => currentIndex + 1);
      setSelectedAnswerIndex(undefined);
      return;
    }

    setIsSubmitting(true);
    try {
      const results = await Promise.all(
        lesson.lessonQuestions.map(async (question) => {
          const selectedIdx = nextAnswers[question.questionId] ?? 0;
          const result = await checkLessonAnswer(question.questionId, selectedIdx);
          const fallbackVocabularyId =
            result.vocabularyId ??
            inferVocabularyFromQuestion(
              question.questionText,
              question.answerOptions.map((option) => option.answerText),
              vocabularies,
            );
          return { ...result, vocabularyId: fallbackVocabularyId };
        }),
      );

      let reviewsRecorded = 0;
      let reviewsSyncFailed = 0;

      if (account) {
        const reviewOutcomes = await Promise.allSettled(
          results.flatMap((result) => {
            if (!result.vocabularyId) {
              return [];
            }

            const vocab = vocabById[result.vocabularyId];
            return analyticsApi.recordReview(
              {
                userId: String(account.id),
                vocabularyId: result.vocabularyId,
                correct: result.correct,
                word: vocab?.word,
                translation: vocab?.meaning,
              },
              account.accessToken,
            );
          }),
        );

        reviewsRecorded = reviewOutcomes.filter((outcome) => outcome.status === "fulfilled").length;
        reviewsSyncFailed = reviewOutcomes.filter((outcome) => outcome.status === "rejected").length;
      }

      onComplete(
        results.filter(({ correct }) => correct).length,
        lesson.lessonQuestions.length,
        reviewsRecorded,
        reviewsSyncFailed > 0 ? reviewsSyncFailed : undefined,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể chấm kết quả bài làm.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="app-layout">
      <AppSidebar account={account} activePage="mcq" onLogout={onLogout} onNavigate={onNavigate} />

      <main className="mcq-page">
        <header className="mcq-header-bar" style={{ marginBottom: "14px" }}>
          <button
            className="manage-secondary-button interactive-element"
            onClick={() => onNavigate("lessons")}
            type="button"
          >
            <ArrowLeftIcon2D size={14} /> Quay lại
          </button>

          <div style={{ flex: 1, margin: "0 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", fontWeight: 700, marginBottom: "4px" }}>
              <span style={{ color: "var(--brand-primary)" }}>{(lesson?.lessonTitle ?? "BÀI HỌC").toUpperCase()}</span>
              <span>{progressPercent}%</span>
            </div>
            <div style={{ height: "5px", background: "var(--border-glass-subtle)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPercent}%`, background: "linear-gradient(90deg, var(--brand-primary), #8b5cf6)", transition: "width 0.3s ease" }} />
            </div>
          </div>

          <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--text-muted)" }}>
            {currentQuestion ? `${questionIndex + 1} / ${questionCount}` : "..."}
          </span>
        </header>

        {isLoading ? <p className="page-status">Đang nạp câu hỏi trắc nghiệm...</p> : null}
        {errorMessage ? <p className="page-status page-status-error">{errorMessage}</p> : null}

        {currentQuestion ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <section aria-labelledby="mcq-question" className="mcq-card">
              <p className="eyebrow">CHỌN ĐÁP ÁN ĐÚNG</p>
              <h1 id="mcq-question" style={{ fontSize: "20px", margin: "6px 0 0" }}>{currentQuestion.questionText}</h1>

              <div className="answer-list">
                {currentQuestion.answerOptions.map((answer, index) => {
                  const isSelected = selectedAnswerIndex === index;

                  return (
                    <button
                      aria-pressed={isSelected}
                      className={`answer-option interactive-element${isSelected ? " answer-option-selected" : ""}`}
                      key={answer.answerId}
                      onClick={() => setSelectedAnswerIndex(index)}
                      type="button"
                    >
                      <span className="answer-letter">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span>{answer.answerText}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <button
              className="login-primary-button interactive-element"
              disabled={selectedAnswerIndex === undefined || isSubmitting}
              onClick={() => void handleNextQuestion()}
              style={{ width: "100%", minHeight: "44px", fontSize: "14px" }}
              type="button"
            >
              {isSubmitting ? (
                "Đang nộp bài..."
              ) : isLastQuestion ? (
                <span>Xem kết quả bài làm</span>
              ) : (
                <>
                  <span>Câu tiếp theo</span>
                  <ArrowRightIcon2D size={14} />
                </>
              )}
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
