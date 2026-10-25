import { useEffect, useRef, useState } from "react";
import { submitBatchStudySession } from "../api/analytics-api";
import {
  checkLessonAnswer,
  fetchLessonDetail,
  fetchLessonVocabularies,
  type ContentVocabulary,
  type PublicLessonDetail,
} from "../api/lessons-api";

import { inferVocabularyFromQuestion } from "../lib/infer-vocabulary";
import { AppPage, AppSidebar } from "../components/app-sidebar";
import { ArrowLeftIcon2D, ArrowRightIcon2D, ClockIcon2D } from "../components/icons";
import type { Account } from "../types/auth";
import "../styles/app.css";

type McqPageProps = {
  lessonId: string;
  userId: string | number;
  accessToken: string;
  onNavigate: (page: AppPage) => void;
  onComplete: (correctCount: number, totalCount: number, reviewsRecorded: number, reviewsSyncFailed?: number) => void;
  account?: Account;
  onLogout?: () => void;
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function McqPage({
  lessonId,
  userId,
  accessToken,
  onNavigate,
  onComplete,
  account,
  onLogout,
}: McqPageProps) {
  const [lesson, setLesson] = useState<PublicLessonDetail>();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number>();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [vocabById, setVocabById] = useState<Record<string, { word: string; meaning: string }>>({});
  const [vocabularies, setVocabularies] = useState<ContentVocabulary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();

  // Timer & latency tracking
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const questionStartTimeRef = useRef<number>(Date.now());
  const latenciesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    sessionStartTimeRef.current = Date.now();
    questionStartTimeRef.current = Date.now();
    latenciesRef.current = {};
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

    // Record latency for this question
    const timeSpent = Date.now() - questionStartTimeRef.current;
    latenciesRef.current[currentQuestion.questionId] = timeSpent;
    questionStartTimeRef.current = Date.now();

    const nextAnswers = { ...answers, [currentQuestion.questionId]: selectedAnswerIndex };
    setAnswers(nextAnswers);

    if (!isLastQuestion) {
      setQuestionIndex((currentIndex) => currentIndex + 1);
      setSelectedAnswerIndex(undefined);
      return;
    }

    setIsSubmitting(true);
    const totalDurationSeconds = Math.max(1, Math.round((Date.now() - sessionStartTimeRef.current) / 1000));

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
          const responseTimeMs = latenciesRef.current[question.questionId];
          const matchedVocab = fallbackVocabularyId ? vocabById[fallbackVocabularyId] : undefined;
          return {
            ...result,
            vocabularyId: fallbackVocabularyId,
            responseTimeMs,
            word: matchedVocab?.word,
            translation: matchedVocab?.meaning,
          };
        }),
      );

      const correctCount = results.filter(({ correct }) => correct).length;

      // Submit batch study session and reviews to Analytics
      const batchReviews = results
        .map((r) => ({
          cardId: r.masteryCandidateVocabularyId || r.vocabularyId || "",
          deckId: lessonId,
          word: r.word || "",
          translation: r.translation,
          correct: r.correct,
          responseTimeMs: r.responseTimeMs,
        }))
        .filter((r) => Boolean(r.cardId));

      void submitBatchStudySession(
        {
          userId,
          deckId: lessonId,
          deckTitle: lesson.lessonTitle,
          sessionType: "mcq",
          totalCardsOrQuestions: lesson.lessonQuestions.length,
          correctCount,
          durationSeconds: totalDurationSeconds,
          reviews: batchReviews,
        },
        accessToken,
      ).catch((error: unknown) => {
        console.warn("Không thể lưu kết quả trắc nghiệm vào Analytics.", error);
      });

      onComplete(
        correctCount,
        lesson.lessonQuestions.length,
        results.length,
        0,
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
        <header className="mcq-header-bar" style={{ marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <button
            className="manage-secondary-button interactive-element"
            onClick={() => onNavigate("flashcards")}
            type="button"
          >
            <ArrowLeftIcon2D size={14} /> Quay lại
          </button>

          <div style={{ flex: 1, margin: "0 14px", minWidth: "180px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", fontWeight: 700, marginBottom: "4px" }}>
              <span style={{ color: "var(--brand-primary)" }}>{(lesson?.lessonTitle ?? "BÀI HỌC").toUpperCase()}</span>
              <span>{progressPercent}%</span>
            </div>
            <div style={{ height: "5px", background: "var(--border-glass-subtle)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPercent}%`, background: "linear-gradient(90deg, var(--brand-primary), #8b5cf6)", transition: "width 0.3s ease" }} />
            </div>
          </div>

          {/* Live Timer */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              background: "var(--bg-glass-input)",
              borderRadius: "8px",
              border: "1px solid var(--border-glass-subtle)",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--brand-primary)",
            }}
          >
            <ClockIcon2D size={13} />
            <span>{formatTime(elapsedSeconds)}</span>
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

              <div className="mcq-options-grid" style={{ marginTop: "16px" }}>
                {currentQuestion.answerOptions.map((option, idx) => {
                  const isSelected = selectedAnswerIndex === idx;
                  return (
                    <button
                      key={option.answerId}
                      className={`mcq-option-button interactive-element ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedAnswerIndex(idx)}
                      type="button"
                    >
                      <span className="mcq-option-number">{String.fromCharCode(65 + idx)}</span>
                      <span className="mcq-option-text">{option.answerText}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                className="login-primary-button interactive-element"
                disabled={selectedAnswerIndex === undefined || isSubmitting}
                onClick={() => void handleNextQuestion()}
                type="button"
              >
                <span>{isSubmitting ? "Đang nộp..." : isLastQuestion ? "Nộp bài" : "Câu tiếp theo"}</span>
                <ArrowRightIcon2D size={16} />
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
