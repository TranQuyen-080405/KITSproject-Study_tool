import { useEffect, useState } from "react";
import {
  createFlashcardDeck,
  deleteFlashcardDeck,
  fetchFlashcardDecks,
  type FlashcardDeck,
} from "../api/flashcard-api";
import { AppPage, AppSidebar } from "../components/app-sidebar";
import {
  ArrowRightIcon2D,
  BotIcon2D,
  CloseIcon2D,
  LayersIcon2D,
  PlayIcon2D,
  PlusIcon2D,
  TrashIcon2D,
} from "../components/icons";
import type { Account } from "../types/auth";
import "../styles/app.css";

type FlashcardsPageProps = {
  onNavigate: (page: AppPage) => void;
  onStartStudy: (deckId: string) => void;
  onStartMcq?: (deckId: string) => void;
  onSelectDeck?: (deckId: string) => void;
  account?: Account;
  onLogout?: () => void;
};

export function FlashcardsPage({
  onNavigate,
  onStartStudy,
  onStartMcq,
  onSelectDeck,
  account,
  onLogout,
}: FlashcardsPageProps) {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [deletingId, setDeletingId] = useState<string>();

  // Manual deck creation state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();

  function resetCreateForm() {
    setNewTitle("");
    setNewDescription("");
    setCreateError(undefined);
  }

  function handleOpenCreateModal() {
    resetCreateForm();
    setIsCreateModalOpen(true);
  }

  function handleCloseCreateModal() {
    setIsCreateModalOpen(false);
    resetCreateForm();
  }

  async function handleCreateDeck(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    setCreateError(undefined);
    try {
      const created = await createFlashcardDeck({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
      });
      setDecks((prev) => [created, ...prev]);
      handleCloseCreateModal();
      if (onSelectDeck) {
        onSelectDeck(created.id);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Tạo bộ thẻ thất bại.");
    } finally {
      setIsCreating(false);
    }
  }

  async function loadDecks() {
    setIsLoading(true);
    setErrorMessage(undefined);
    try {
      const data = await fetchFlashcardDecks();
      setDecks(data);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Không tải được danh sách bộ flashcard.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDecks();
  }, []);

  async function handleDeleteDeck(e: React.MouseEvent, deckId: string, title: string) {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc muốn xóa bộ flashcard "${title}" không?`)) {
      return;
    }
    setDeletingId(deckId);
    try {
      await deleteFlashcardDeck(deckId);
      setDecks((prev) => prev.filter((d) => d.id !== deckId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Xóa bộ flashcard thất bại.");
    } finally {
      setDeletingId(undefined);
    }
  }

  return (
    <div className="app-layout">
      <AppSidebar
        account={account}
        activePage="flashcards"
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <main className="lesson-page">
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "20px", margin: "0 0 4px", fontWeight: 700 }}>
              Bộ Sưu Tập Flashcard
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>
              Ôn luyện từ vựng tiếng Hàn theo phương pháp lật thẻ thông minh
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              className="manage-secondary-button interactive-element"
              onClick={handleOpenCreateModal}
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                padding: "8px 16px",
                borderRadius: "10px",
              }}
            >
              <PlusIcon2D size={15} /> Tạo deck mới thủ công
            </button>

            <button
              className="manage-primary-button interactive-element"
              onClick={() => onNavigate("chatbot")}
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                padding: "8px 16px",
                borderRadius: "10px",
              }}
            >
              <BotIcon2D size={16} /> Tạo bộ thẻ với AI
            </button>
          </div>
        </header>

        {/* Modal / Form: Create Deck Manually */}
        {isCreateModalOpen && (
          <div
            className="glass-card"
            style={{
              padding: "24px",
              borderRadius: "18px",
              border: "1px solid var(--brand-primary)",
              marginBottom: "20px",
              background: "var(--bg-glass-card)",
              boxShadow: "var(--shadow-glass)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>
                Tạo bộ Flashcard mới
              </h2>
              <button
                type="button"
                onClick={handleCloseCreateModal}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <CloseIcon2D size={16} />
              </button>
            </div>

            {createError ? (
              <p className="page-status page-status-error" style={{ marginBottom: "12px" }}>
                {createError}
              </p>
            ) : null}

            <form onSubmit={handleCreateDeck}>
              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    marginBottom: "6px",
                  }}
                >
                  Tên bộ Flashcard *
                </label>
                <input
                  className="glass-input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Từ vựng tiếng Hàn thông dụng"
                  required
                  autoFocus
                  style={{
                    width: "100%",
                    fontSize: "14px",
                    padding: "9px 12px",
                    borderRadius: "8px",
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    marginBottom: "6px",
                  }}
                >
                  Mô tả (tùy chọn)
                </label>
                <textarea
                  className="glass-input"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Mô tả mục tiêu của bộ thẻ này..."
                  rows={2}
                  style={{
                    width: "100%",
                    fontSize: "13px",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    resize: "vertical",
                  }}
                />
              </div>

                <p style={{ margin: "8px 0 16px", fontSize: "12px", color: "var(--text-muted)" }}>
                  💡 Sau khi tạo, bạn có thể thêm thẻ từ vựng thủ công hoặc tải lên từ file CSV.
                </p>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  className="manage-secondary-button interactive-element"
                  type="button"
                  onClick={handleCloseCreateModal}
                  style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "13px" }}
                >
                  Hủy
                </button>
                <button
                  className="manage-primary-button interactive-element"
                  type="submit"
                  disabled={isCreating || !newTitle.trim()}
                  style={{ padding: "8px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 700 }}
                >
                  {isCreating ? "Đang tạo..." : "Tạo bộ thẻ"}
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? <p className="page-status">Đang tải các bộ thẻ...</p> : null}
        {errorMessage ? (
          <p className="page-status page-status-error">{errorMessage}</p>
        ) : null}

        {!isLoading && !errorMessage && decks.length === 0 ? (
          <div
            className="glass-card"
            style={{
              textAlign: "center",
              padding: "48px 24px",
              maxWidth: "520px",
              margin: "32px auto",
              borderRadius: "20px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                padding: "16px",
                borderRadius: "999px",
                background: "var(--brand-primary-light)",
                color: "var(--brand-primary)",
                marginBottom: "16px",
              }}
            >
              <LayersIcon2D size={32} />
            </div>
            <h2 style={{ fontSize: "18px", margin: "0 0 8px" }}>
              Chưa có bộ Flashcard nào
            </h2>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "13.5px",
                lineHeight: "1.6",
                marginBottom: "20px",
              }}
            >
              Bạn có thể tạo bộ thẻ mới thủ công hoặc nhờ <strong>Trợ lý AI</strong> tạo danh sách từ vựng tự động!
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
              <button
                className="manage-secondary-button interactive-element"
                onClick={handleOpenCreateModal}
                type="button"
                style={{ padding: "10px 20px", fontSize: "13.5px" }}
              >
                <PlusIcon2D size={15} /> Tạo deck mới thủ công
              </button>
              <button
                className="login-primary-button interactive-element"
                onClick={() => onNavigate("chatbot")}
                type="button"
                style={{ padding: "10px 20px", fontSize: "13.5px" }}
              >
                <BotIcon2D size={16} /> Mở Trợ lý AI tạo thẻ
              </button>
            </div>
          </div>
        ) : null}

        {!isLoading && decks.length > 0 && (
          <section
            aria-label="Danh sách bộ Flashcard"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
              gap: "16px",
              marginTop: "8px",
            }}
          >
            {decks.map((deck) => {
              const cardCount = deck.cardCount ?? (deck.cards ? deck.cards.length : 0);
              const formattedDate = new Date(deck.createdAt).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });

              return (
                <article
                  key={deck.id}
                  className="interactive-element"
                  onClick={() => {
                    if (onSelectDeck) {
                      onSelectDeck(deck.id);
                    } else {
                      onStartStudy(deck.id);
                    }
                  }}
                  style={{
                    background: "var(--bg-glass-card)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid var(--border-glass)",
                    borderRadius: "18px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "var(--shadow-glass)",
                    transition: "transform 0.2s ease, border-color 0.2s ease",
                    minHeight: "180px",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.borderColor = "var(--brand-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "var(--border-glass)";
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: "999px",
                          background: "var(--brand-primary-light)",
                          color: "var(--brand-primary)",
                          border: "1px solid var(--brand-primary)",
                        }}
                      >
                        {cardCount} thẻ từ vựng
                      </span>

                      <button
                        type="button"
                        onClick={(e) => void handleDeleteDeck(e, deck.id, deck.title)}
                        disabled={deletingId === deck.id}
                        title="Xóa bộ flashcard này"
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          padding: "4px",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          opacity: 0.7,
                          transition: "opacity 0.15s ease, color 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "1";
                          e.currentTarget.style.color = "var(--state-error)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "0.7";
                          e.currentTarget.style.color = "var(--text-muted)";
                        }}
                      >
                        <TrashIcon2D size={15} />
                      </button>
                    </div>

                    <h2
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        margin: "0 0 6px",
                        color: "var(--text-main)",
                        lineHeight: 1.3,
                      }}
                    >
                      {deck.title}
                    </h2>

                    {deck.description ? (
                      <p
                        style={{
                          fontSize: "12.5px",
                          color: "var(--text-muted)",
                          margin: 0,
                          lineHeight: 1.4,
                        }}
                      >
                        {deck.description}
                      </p>
                    ) : (
                      <p
                        style={{
                          fontSize: "11.5px",
                          color: "var(--text-muted)",
                          margin: 0,
                          opacity: 0.7,
                        }}
                      >
                        Tạo ngày {formattedDate}
                      </p>
                    )}
                  </div>

                  <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
                    <button
                      className="login-primary-button interactive-element"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartStudy(deck.id);
                      }}
                      type="button"
                      disabled={cardCount === 0}
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        fontSize: "13px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        borderRadius: "10px",
                        cursor: cardCount === 0 ? "not-allowed" : "pointer",
                        opacity: cardCount === 0 ? 0.6 : 1,
                      }}
                    >
                      <PlayIcon2D size={13} color="#fff" /> Bắt đầu học
                    </button>

                    {onStartMcq && (
                      <button
                        className="manage-secondary-button interactive-element"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartMcq(deck.id);
                        }}
                        type="button"
                        title="Tạo đề AI và bắt đầu kiểm tra từ vựng"
                        disabled={cardCount === 0}
                        style={{
                          padding: "9px 14px",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          borderRadius: "10px",
                        }}
                      >
                        Kiểm tra
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
