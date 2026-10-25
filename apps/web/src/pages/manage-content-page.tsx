import { FormEvent, useEffect, useRef, useState } from "react";
import {
  addLessonVocabularies,
  createLesson,
  deleteLesson,
  fetchLessonSummaries,
  fetchLessonVocabularies,
  updateLesson,
  type ContentVocabulary,
  type PublicLessonSummary,
} from "../api/lessons-api";
import { AppPage, AppSidebar } from "../components/app-sidebar";
import { ArrowLeftIcon2D, BookIcon2D, CheckIcon2D, PlusIcon2D, TrashIcon2D } from "../components/icons";
import type { Account } from "../types/auth";
import "../styles/app.css";

type ManageContentPageProps = {
  onNavigate: (page: AppPage) => void;
  account?: Account;
  onLogout?: () => void;
  initialLessonId?: string;
};


export function ManageContentPage({
  onNavigate,
  account,
  onLogout,
  initialLessonId,
}: ManageContentPageProps) {
  const [lessons, setLessons] = useState<PublicLessonSummary[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>();
  const [vocabulary, setVocabulary] = useState<ContentVocabulary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const [lessonName, setLessonName] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");

  const [vocabWord, setVocabWord] = useState("");
  const [vocabMeaning, setVocabMeaning] = useState("");
  const vocabWordInputRef = useRef<HTMLInputElement>(null);

  const selectedLesson = lessons.find((lesson) => lesson.lessonId === selectedLessonId);

  async function loadLessons(preferredLessonId?: string) {
    setIsLoading(true);
    setErrorMessage(undefined);
    try {
      const nextLessons = await fetchLessonSummaries();
      setLessons(nextLessons);
      const nextSelected =
        preferredLessonId && nextLessons.some((lesson) => lesson.lessonId === preferredLessonId)
          ? preferredLessonId
          : nextLessons[0]?.lessonId;
      setSelectedLessonId(nextSelected);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không tải được danh sách bài học.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadLessons(initialLessonId);
  }, [initialLessonId]);

  useEffect(() => {
    if (!selectedLessonId) {
      setVocabulary([]);
      return;
    }

    const lessonId = selectedLessonId;
    let isMounted = true;
    async function loadDetail() {
      setErrorMessage(undefined);
      try {
        const nextVocabulary = await fetchLessonVocabularies(lessonId);
        if (!isMounted) return;
        setVocabulary(nextVocabulary);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Không tải được chi tiết bài học.",
          );
        }
      }
    }

    void loadDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedLessonId]);

  useEffect(() => {
    if (!selectedLessonId) return;
    const lesson = lessons.find((item) => item.lessonId === selectedLessonId);
    if (!lesson) return;
    setLessonName(lesson.lessonTitle);
    setLessonDescription(lesson.lessonDescription);
  }, [selectedLessonId, lessons]);

  function selectLesson(lessonId: string) {
    setSelectedLessonId(lessonId);
    setStatusMessage(undefined);
    setErrorMessage(undefined);
  }

  function startCreateLesson() {
    setSelectedLessonId(undefined);
    setLessonName("");
    setLessonDescription("");
    setVocabulary([]);
    setStatusMessage(undefined);
    setErrorMessage(undefined);
  }

  async function handleCreateLesson(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(undefined);
    setStatusMessage(undefined);
    try {
      const lesson = await createLesson({
        name: lessonName,
        description: lessonDescription,
      });
      setStatusMessage(`Đã tạo thành công bài học “${lesson.lessonTitle}”.`);
      await loadLessons(lesson.lessonId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể tạo bài học.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateLesson(event: FormEvent) {
    event.preventDefault();
    if (!selectedLessonId) return;
    setIsSaving(true);
    setErrorMessage(undefined);
    setStatusMessage(undefined);
    try {
      const lesson = await updateLesson(selectedLessonId, {
        name: lessonName,
        description: lessonDescription,
      });
      setStatusMessage(`Đã cập nhật bài học “${lesson.lessonTitle}”.`);
      await loadLessons(selectedLessonId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể cập nhật bài học.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteLesson() {
    if (!selectedLessonId || !selectedLesson) return;
    if (!window.confirm(`XÓA BÀI HỌC: “${selectedLesson.lessonTitle}”?\n\nTất cả từ vựng và câu hỏi trắc nghiệm liên quan sẽ bị xóa vĩnh viễn.`)) {
      return;
    }
    setIsSaving(true);
    setErrorMessage(undefined);
    setStatusMessage(undefined);
    try {
      await deleteLesson(selectedLessonId);
      setStatusMessage("Đã xóa bài học.");
      await loadLessons();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể xóa bài học.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddVocabulary(event: FormEvent) {
    event.preventDefault();
    if (!selectedLessonId || !vocabWord.trim() || !vocabMeaning.trim()) return;
    setIsSaving(true);
    setErrorMessage(undefined);
    setStatusMessage(undefined);
    try {
      const created = await addLessonVocabularies(selectedLessonId, [
        { word: vocabWord.trim(), meaning: vocabMeaning.trim() },
      ]);
      setVocabulary((current) => [...current, ...created]);
      setVocabWord("");
      setVocabMeaning("");
      setStatusMessage("Đã thêm từ vựng mới.");
      vocabWordInputRef.current?.focus();
      await loadLessons(selectedLessonId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thêm được từ vựng.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="app-layout">
      <AppSidebar account={account} activePage="manage-content" onLogout={onLogout} onNavigate={onNavigate} />

      <main className="manage-page">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h1 style={{ fontSize: "20px", margin: 0 }}>Soạn Bài</h1>
          <button
            className="manage-secondary-button interactive-element"
            onClick={() => onNavigate("lessons")}
            style={{ whiteSpace: "nowrap" }}
            type="button"
          >
            <ArrowLeftIcon2D size={14} /> Về danh sách bài học
          </button>
        </header>

        {isLoading ? <p className="page-status">Đang nạp dữ liệu bài học...</p> : null}
        {statusMessage ? <p className="page-status page-status-success">{statusMessage}</p> : null}
        {errorMessage ? <p className="page-status page-status-error">{errorMessage}</p> : null}

        <div className="manage-layout">
          {/* Cột trái: Danh sách bài học */}
          <section aria-label="Danh sách bài học" className="glass-card manage-column" style={{ padding: "14px" }}>
            <div className="manage-column-header">
              <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, whiteSpace: "nowrap" }}>Danh sách bài học</h2>
              <button
                className="manage-primary-button interactive-element"
                onClick={startCreateLesson}
                style={{ padding: "5px 10px", fontSize: "11.5px", whiteSpace: "nowrap" }}
                type="button"
              >
                <PlusIcon2D size={12} /> Bài mới
              </button>
            </div>

            <div className="manage-column-body">
              <ul className="manage-lesson-list">
                {lessons.map((lesson) => {
                  const isActive = lesson.lessonId === selectedLessonId;
                  return (
                    <li key={lesson.lessonId}>
                      <button
                        className={`manage-lesson-item interactive-element${isActive ? " manage-lesson-item-active" : ""}`}
                        onClick={() => selectLesson(lesson.lessonId)}
                        type="button"
                      >
                        <strong style={{ fontSize: "13.5px", color: isActive ? "var(--brand-primary)" : "var(--text-main)", wordBreak: "keep-all" }}>
                          {lesson.lessonTitle}
                        </strong>
                        <span style={{ fontSize: "11.5px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                          {lesson.vocabularyCount} từ
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {lessons.length === 0 && !isLoading && (
                <p style={{ color: "var(--text-muted)", fontSize: "12.5px", margin: 0 }}>
                  Chưa có bài học nào. Nhấn "+ Bài mới" để khởi tạo.
                </p>
              )}
            </div>
          </section>

          {/* Cột phải: Workspace Chi tiết Bài học & Từ vựng & Câu hỏi */}
          <section aria-label="Chi tiết bài học" className="glass-card manage-column" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="manage-column-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <form
              onSubmit={selectedLessonId ? handleUpdateLesson : handleCreateLesson}
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                {selectedLessonId ? "Cấu hình Bài học" : "Tạo bài học mới"}
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                  Tên bài học
                  <input
                    maxLength={120}
                    onChange={(e) => setLessonName(e.target.value)}
                    placeholder="Từ vựng TOPIK I - Bài 1"
                    required
                    value={lessonName}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                  Mô tả bài học
                  <input
                    maxLength={1000}
                    onChange={(e) => setLessonDescription(e.target.value)}
                    placeholder="Mô tả chủ đề bài học..."
                    required
                    value={lessonDescription}
                  />
                </label>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="manage-primary-button interactive-element"
                  disabled={isSaving}
                  style={{ padding: "7px 14px", fontSize: "12.5px", whiteSpace: "nowrap" }}
                  type="submit"
                >
                  {selectedLessonId ? "Lưu thông tin" : "Tạo bài học"}
                </button>

                {selectedLessonId && (
                  <button
                    className="manage-danger-button interactive-element"
                    disabled={isSaving}
                    onClick={() => void handleDeleteLesson()}
                    style={{ padding: "7px 14px", fontSize: "12.5px", whiteSpace: "nowrap" }}
                    type="button"
                  >
                    <TrashIcon2D size={13} /> Xóa bài học
                  </button>
                )}
              </div>
            </form>

            {selectedLessonId && (
              <>
                {/* Tab 1: Từ vựng Fast Entry */}
                {selectedLessonId && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <form onSubmit={handleAddVocabulary} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <h3 style={{ margin: 0, fontSize: "13.5px", fontWeight: 700 }}>Thêm từ vựng</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <input
                          maxLength={120}
                          onChange={(e) => setVocabWord(e.target.value)}
                          placeholder="Từ tiếng Hàn"
                          ref={vocabWordInputRef}
                          required
                          value={vocabWord}
                        />
                        <input
                          maxLength={500}
                          onChange={(e) => setVocabMeaning(e.target.value)}
                          placeholder="Nghĩa tiếng Việt"
                          required
                          value={vocabMeaning}
                        />
                      </div>
                      <button
                        className="manage-primary-button interactive-element"
                        disabled={isSaving || !vocabWord.trim() || !vocabMeaning.trim()}
                        style={{ alignSelf: "flex-start", padding: "7px 14px", fontSize: "12.5px", whiteSpace: "nowrap" }}
                        type="submit"
                      >
                        <PlusIcon2D size={13} /> Thêm từ
                      </button>
                    </form>

                    <div>
                      <h3 style={{ margin: "0 0 6px", fontSize: "13.5px", fontWeight: 700 }}>Danh sách từ vựng</h3>
                      {vocabulary.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "12.5px", margin: 0 }}>
                          Chưa có từ vựng nào trong bài học này.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {vocabulary.map((item) => (
                            <div
                              key={item.id}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "5px 10px",
                                background: "var(--bg-glass-input)",
                                border: "1px solid var(--border-glass-subtle)",
                                borderRadius: "var(--radius-md)",
                                fontSize: "12.5px",
                                whiteSpace: "nowrap"
                              }}
                            >
                              <strong style={{ color: "var(--brand-primary)" }}>{item.word}</strong>
                              <span style={{ color: "var(--text-muted)" }}>{item.meaning}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </>
            )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
