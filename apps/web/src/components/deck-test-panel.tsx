import { useEffect, useRef, useState } from "react";
import { deckTestsApi, type TestSession, type TestSessionSummary } from "../api/deck-tests-api";
import { clearTestDraft, restoreTestDraft, saveTestDraft } from "../lib/deck-test-draft";
import "../styles/deck-tests.css";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}


function formatDuration(session: Pick<TestSessionSummary, "createdAt" | "completedAt">) {
  if (!session.completedAt) return "—";
  const elapsed = new Date(session.completedAt).getTime() - new Date(session.createdAt).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return "—";
  const totalSeconds = Math.round(elapsed / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours ? `${hours} giờ` : "", minutes ? `${minutes} phút` : "",
    seconds || !totalSeconds ? `${seconds} giây` : ""].filter(Boolean).join(" ");
}

type Props = {
  deckId: string; accessToken: string; cardCount: number;
  autoStart?: boolean; onAutoStartHandled?: () => void; onBusyChange?: (busy: boolean) => void;
};
export function DeckTestPanel({ deckId, accessToken, cardCount, autoStart, onAutoStartHandled, onBusyChange }: Props) {
  const [sessions, setSessions] = useState<TestSessionSummary[]>([]);
  const [selected, setSelected] = useState<TestSession>();
  const [mode, setMode] = useState<"attempt" | "review">("review");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const operationRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    onBusyChange?.(busy || submitting);
    return () => { onBusyChange?.(false); };
  }, [busy, submitting, onBusyChange]);
  useEffect(() => {
    if (!autoStart || operationRef.current) return;
    onAutoStartHandled?.();
    void start();
  }, [autoStart, deckId, accessToken]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSelected(undefined);
    setError("");
    deckTestsApi.list(deckId, accessToken)
      .then((rows) => {
        if (!active) return;
        setSessions((current) => {
          const merged = new Map(rows.map((row) => [row.id, row]));
          for (const row of current) merged.set(row.id, row);
          return [...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        });
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Không tải được lịch sử."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [deckId, accessToken]);

  function updateSession(session: TestSession) {
    setSelected(session);
    setSessions((rows) => [session, ...rows.filter((row) => row.id !== session.id)]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  async function start(sourceSessionId?: string) {
    if (operationRef.current) return;
    operationRef.current = true;
    setBusy(true);
    setCreating(!sourceSessionId);
    setError("");
    try {
      const session = await deckTestsApi.start(deckId, accessToken, sourceSessionId);
      updateSession(session);
      setMode("attempt");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không tạo được phiên kiểm tra.");
    } finally {
      operationRef.current = false;
      setBusy(false);
      setCreating(false);
    }
  }

  async function open(summary: TestSessionSummary) {
    if (operationRef.current) return;
    operationRef.current = true;
    setBusy(true);
    setError("");
    try {
      const session = await deckTestsApi.get(deckId, summary.id, accessToken);
      setSelected(session);
      setMode(session.completedAt ? "review" : "attempt");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không mở được phiên kiểm tra.");
    } finally {
      operationRef.current = false;
      setBusy(false);
      setCreating(false);
    }
  }

  return (
    <section className="deck-tests" aria-label="Kiểm tra và lịch sử làm bài">
      {error && <p role="alert" className="page-status page-status-error">{error}</p>}
      {!selected ? <>
        <div className="test-panel-heading glass-card">
          <div>
            <h2>Kiểm tra kiến thức từ vựng</h2>
          </div>
          <button className="login-primary-button" type="button" disabled={busy || loading || cardCount === 0}
            onClick={() => void start()}>
            {creating ? "Đang tạo đề…" : "Tạo đề"}
          </button>
        </div>
        {creating && <p role="status">AI đang chuẩn bị một câu hỏi cho mỗi từ. Vui lòng giữ trang này mở.</p>}
        {!cardCount && <p>Thêm từ vựng vào bộ để tạo bài kiểm tra đầu tiên.</p>}
        <h3>Lịch sử kiểm tra ({sessions.length})</h3>
        {loading ? <p role="status">Đang tải lịch sử…</p> :
          !sessions.length ? <p className="test-muted">Chưa có phiên kiểm tra nào.</p> :
          <div className="test-history">
            {sessions.map((session) =>
              <button key={session.id} className="test-history-row glass-card" type="button"
                disabled={busy} onClick={() => void open(session)}>
                <span>
                  <strong>{formatDate(session.createdAt)}</strong>
                  <span className="test-row-subtitle">
                    {session.totalQuestions} câu
                    {session.completedAt && <> · Thời gian: {formatDuration(session)}</>}
                  </span>
                </span>
                <span className="test-history-score">
                  {session.completedAt ? <><strong>{session.scorePercentage}%</strong>
                    <span>{session.correctCount}/{session.totalQuestions} đúng</span></> :
                    <><strong>Đang làm</strong><span>Tiếp tục</span></>}
                </span>
              </button>,
            )}
          </div>}
      </> : <>
        <div className="test-panel-heading">
          <button className="manage-secondary-button" type="button" disabled={busy || submitting}
            onClick={() => { setSelected(undefined); setError(""); }}>← Lịch sử kiểm tra</button>
          <span className="test-muted">{formatDate(selected.createdAt)}</span>
        </div>
        {mode === "review" ? <>
          <div className="test-panel-heading glass-card">
            <div><h2>Kết quả: {selected.scorePercentage}%</h2>
              <p>{selected.correctCount}/{selected.totalQuestions} câu đúng · {selected.deckTitle}</p>
              <p className="test-muted">Thời gian làm bài: {formatDuration(selected)}</p></div>
            <button className="login-primary-button" type="button" disabled={busy || !selected.completedAt}
              onClick={() => void start(selected.id)}>{busy ? "Đang mở bài…" : "Làm lại"}</button>
          </div>
          <div className="test-review-list">
            {selected.questions.map((question, index) => {
              const answer = selected.answers[index];
              return <article className="glass-card test-question" key={question.id}>
                <h3>Câu {index + 1}. {question.prompt}</h3>
                <p className="test-muted">{question.word} — {question.translation}</p>
                <div className="test-options">
                  {question.options.map((option, optionIndex) =>
                    <div key={optionIndex} className={`test-option ${optionIndex === question.correctOptionIndex ?
                      "is-correct" : optionIndex === answer ? "is-wrong" : ""}`}>
                      <span>{String.fromCharCode(65 + optionIndex)}. {option}</span>
                      {optionIndex === answer && <strong>Bạn chọn</strong>}
                      {optionIndex === question.correctOptionIndex && <strong>Đáp án đúng</strong>}
                    </div>,
                  )}
                </div>
                {question.explanation && <p>{question.explanation}</p>}
              </article>;
            })}
          </div>
        </> : <TestAttempt key={selected.id} session={selected} accessToken={accessToken}
          onSaved={updateSession} onComplete={() => setMode("review")} onSubmittingChange={setSubmitting} />}
      </>}
    </section>
  );
}

function TestAttempt({ session, accessToken, onSaved, onComplete, onSubmittingChange }: {
  session: TestSession; accessToken: string; onSaved: (session: TestSession) => void;
  onComplete: () => void; onSubmittingChange: (submitting: boolean) => void;
}) {
  const [answers, setAnswers] = useState(() => restoreTestDraft(session));
  const [index, setIndex] = useState(() => {
    const unanswered = answers.findIndex((answer) => answer === null);
    return unanswered < 0 ? session.questions.length - 1 : unanswered;
  });
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [draftFailed, setDraftFailed] = useState(false);
  const answersRef = useRef(answers);
  const acknowledgedRef = useRef(session.answers);
  const requestRef = useRef<Promise<TestSession | null> | null>(null);
  const finalizingRef = useRef(false);
  const mountedRef = useRef(false);
  const sessionRef = useRef(session);
  const callbacks = useRef({ onSaved, onComplete, onSubmittingChange });
  sessionRef.current = session;
  callbacks.current = { onSaved, onComplete, onSubmittingChange };
  const question = session.questions[index];
  const selectedAnswer = answers[index];
  const pendingCount = () => answersRef.current.filter((answer, position) =>
    answer !== null && acknowledgedRef.current[position] === null,
  ).length;

  useEffect(() => {
    mountedRef.current = true;
    const timer = setInterval(() => { void flush(); }, 15_000);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
      callbacks.current.onSubmittingChange(false);
    };
  }, []);

  function sendSnapshot(finalize: boolean): Promise<TestSession | null> {
    const snapshot = [...answersRef.current];
    let success = false;
    if (mountedRef.current) { setSaving(true); setError(""); }
    const request = (async () => {
      try {
        const current = sessionRef.current;
        const progress = finalize
          ? await deckTestsApi.submit(current.flashcardId, current.id, snapshot, accessToken)
          : await deckTestsApi.saveAnswers(current.flashcardId, current.id, snapshot, accessToken);
        const updated: TestSession = { ...current, ...progress };
        acknowledgedRef.current = [...progress.answers];
        success = true;
        if (progress.completedAt) clearTestDraft(current);
        if (mountedRef.current) callbacks.current.onSaved(updated);
        return updated;
      } catch (reason) {
        if (mountedRef.current) setError(reason instanceof Error ? reason.message :
          finalize ? "Chưa nộp được bài. Vui lòng thử lại." : "Chưa đồng bộ được. Bạn vẫn có thể tiếp tục làm bài.");
        return null;
      } finally {
        requestRef.current = null;
        if (mountedRef.current) {
          setSaving(false);
          // Catch up if another five answers were entered while this request was in flight.
          if (success && !finalizingRef.current && pendingCount() >= 5) void flush();
        }
      }
    })();
    requestRef.current = request;
    return request;
  }

  function flush() {
    if (!mountedRef.current || finalizingRef.current || requestRef.current || pendingCount() === 0) return;
    return sendSnapshot(false);
  }

  function choose(optionIndex: number) {
    if (answersRef.current[index] !== null || finalizingRef.current) return;
    const nextAnswers = [...answersRef.current];
    nextAnswers[index] = optionIndex;
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    setDraftFailed(!saveTestDraft(sessionRef.current, nextAnswers));
    if (pendingCount() >= 5) void flush();
  }

  async function finish() {
    if (finalizingRef.current || answersRef.current.some((answer) => answer === null)) return;
    finalizingRef.current = true;
    setSubmitting(true);
    callbacks.current.onSubmittingChange(true);
    setError("");
    try {
      // Final submission is serialized after an existing autosave.
      if (requestRef.current) await requestRef.current;
      const completed = await sendSnapshot(true);
      if (completed && mountedRef.current) callbacks.current.onComplete();
    } finally {
      finalizingRef.current = false;
      if (mountedRef.current) setSubmitting(false);
      callbacks.current.onSubmittingChange(false);
    }
  }

  function next() {
    if (selectedAnswer === null || submitting) return;
    if (index === session.questions.length - 1) { void finish(); return; }
    setIndex(index + 1);
  }

  return <article className="glass-card test-question">
    <p className="test-muted">Câu {index + 1}/{session.totalQuestions}</p>
    <progress max={session.totalQuestions} value={answers.filter((answer) => answer !== null).length}
      aria-label="Tiến độ làm bài" />
    <h2>{question.prompt}</h2>
    <div className="test-options">
      {question.options.map((option, optionIndex) =>
        <button key={optionIndex} type="button" disabled={submitting || selectedAnswer !== null}
          className={`test-option ${selectedAnswer === null ? "" :
            optionIndex === question.correctOptionIndex ? "is-correct" :
              optionIndex === selectedAnswer ? "is-wrong" : ""}`}
          onClick={() => choose(optionIndex)}>
          <span>{String.fromCharCode(65 + optionIndex)}. {option}</span>
          {selectedAnswer === optionIndex && <strong>Bạn chọn</strong>}
          {selectedAnswer !== null && optionIndex === question.correctOptionIndex && <strong>Đáp án đúng</strong>}
        </button>,
      )}
    </div>
    {selectedAnswer !== null && <p role="status">
      {selectedAnswer === question.correctOptionIndex ? "Chính xác!" : "Chưa đúng."}
      {question.explanation && ` ${question.explanation}`}
    </p>}
    {draftFailed && <p role="alert" className="page-status-error">
      Trình duyệt chưa lưu được bản nháp. Hãy giữ trang mở đến khi đồng bộ thành công.
    </p>}
    {error && <div role="alert"><p className="page-status-error">{error}</p>
      {!submitting && index < session.questions.length - 1 &&
        <button type="button" className="manage-secondary-button" disabled={saving}
          onClick={() => void flush()}>Thử đồng bộ lại</button>}
    </div>}
    <div className="test-attempt-actions">
      <button className="login-primary-button" type="button" disabled={selectedAnswer === null || submitting} onClick={next}>
        {submitting ? "Đang nộp bài…" : index === session.questions.length - 1 ? "Nộp bài" : "Câu tiếp theo"}
      </button>
    </div>
  </article>;
}
