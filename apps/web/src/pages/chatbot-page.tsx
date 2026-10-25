import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { aiApi } from "../api/ai-api";
import { ApiError } from "../api/client";
import { addCardsToFlashcard, createFlashcardDeck, type CardItem } from "../api/flashcard-api";
import { AiMessageContent } from "../components/ai-message-content";
import { AppPage, AppSidebar } from "../components/app-sidebar";
import { ArrowRightIcon2D, BotIcon2D, CheckIcon2D, CloseIcon2D, HistoryIcon2D, LightbulbIcon2D, PlusIcon2D, SendIcon2D, TrashIcon2D } from "../components/icons";
import { matchPrompts, QUICK_PROMPTS } from "../lib/ai-prompts";
import type { AiConversation } from "../types/ai";
import type { Account } from "../types/auth";
import "../styles/app.css";

function formatConversationTime(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}


type ChatMessage = {
  id: string;
  sender: "assistant" | "user";
  text: string;
};

type ChatbotPageProps = {
  onNavigate: (page: AppPage) => void;
  userId: number;
  account?: Account;
  onLogout?: () => void;
};

// ── Korean word and meaning extraction ─────────────────────────────────────
const HANGUL_WORD_RE = /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]+/g;

function cleanMeaning(str: string): string {
  return str
    .replace(/^[:\-–—\/\=\s\.\)]+/, "")
    .replace(/^\*\*|\*\*$/g, "")
    // Strip trailing Korean examples in parentheses like (Ví dụ: 사과를 먹어요)
    .replace(/\s*\([^)]*[\uAC00-\uD7A3][^)]*\)/g, "")
    .replace(/[;,\.]+$/, "")
    .trim();
}

export function extractCardsFromTexts(texts: string[]): CardItem[] {
  const map = new Map<string, string>(); // front -> back

  for (const text of texts) {
    const lines = text.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // 1. Markdown table row: | [**]Hangul[**] | Meaning | ...
      const tableMatch = line.match(/^\|?\s*(?:\*\*|\*|`|)?([\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]+)(?:\*\*|\*|`|)?\s*\|\s*([^|]+)/);
      if (tableMatch) {
        const front = tableMatch[1].trim();
        const back = cleanMeaning(tableMatch[2]);
        if (front && back && !back.includes("---")) {
          if (!map.has(front) || !map.get(front)) {
            map.set(front, back);
          }
          continue;
        }
      }

      // 2. Format with separator: e.g. "- **사과** : Quả táo", "1. **바나나**: Quả chuối", "* 사과 - Quả táo"
      const delimMatch = line.match(
        /^(?:(?:\d+[\.\)]|\*|\-|•)\s*)?(?:\*\*|\*|`|)?([\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]+)(?:\*\*|\*|`|)?\s*[:\-–—\/\=]\s*(.+)$/,
      );
      if (delimMatch) {
        const front = delimMatch[1].trim();
        const back = cleanMeaning(delimMatch[2]);
        if (front && back) {
          if (!map.has(front) || !map.get(front)) {
            map.set(front, back);
          }
          continue;
        }
      }

      // 3. Format with parentheses: e.g. "- **사과** (Quả táo)", "사과 (Quả táo)"
      const parenMatch = line.match(
        /^(?:(?:\d+[\.\)]|\*|\-|•)\s*)?(?:\*\*|\*|`|)?([\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]+)(?:\*\*|\*|`|)?\s*\(([^)]+)\)/,
      );
      if (parenMatch) {
        const front = parenMatch[1].trim();
        const back = cleanMeaning(parenMatch[2]);
        if (front && back) {
          if (!map.has(front) || !map.get(front)) {
            map.set(front, back);
          }
          continue;
        }
      }

      // 4. Any standalone Hangul words found in the line (fallback only if word not already mapped)
      const hangulWords = line.match(HANGUL_WORD_RE) ?? [];
      for (const w of hangulWords) {
        if (!map.has(w)) {
          map.set(w, "");
        }
      }
    }
  }

  return Array.from(map.entries()).map(([front, back]) => ({ front, back }));
}

// ── Word-selection modal ───────────────────────────────────────────────────
function WordSelectionModal({
  cards,
  onConfirm,
  onClose,
}: {
  cards: CardItem[];
  onConfirm: (selected: CardItem[]) => void;
  onClose: () => void;
}) {
  const [selectedFronts, setSelectedFronts] = useState<Set<string>>(
    () => new Set(cards.map((c) => c.front)),
  );

  function toggle(front: string) {
    setSelectedFronts((prev) => {
      const next = new Set(prev);
      next.has(front) ? next.delete(front) : next.add(front);
      return next;
    });
  }

  function handleSelectAll() {
    if (selectedFronts.size === cards.length) {
      setSelectedFronts(new Set());
    } else {
      setSelectedFronts(new Set(cards.map((c) => c.front)));
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "var(--bg-glass-card)", backdropFilter: "blur(20px)",
          border: "1px solid var(--border-glass)", borderRadius: "18px",
          padding: "24px", maxWidth: "500px", width: "100%",
          boxShadow: "var(--shadow-glass)",
          display: "flex", flexDirection: "column", gap: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Chọn từ vựng tạo Flashcard</h3>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
              {selectedFronts.size}/{cards.length} từ được chọn
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {cards.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  background: "transparent", border: "1px solid var(--border-glass-subtle)",
                  borderRadius: "6px", fontSize: "11px", color: "var(--text-muted)",
                  padding: "3px 8px", cursor: "pointer",
                }}
              >
                {selectedFronts.size === cards.length ? "Bỏ chọn" : "Chọn tất cả"}
              </button>
            )}
            <button
              type="button" onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}
            >
              <CloseIcon2D size={18} />
            </button>
          </div>
        </div>

        {cards.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "13px", margin: "8px 0" }}>
            Không tìm thấy từ tiếng Hàn nào trong tin nhắn đã chọn.
          </p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "240px", overflowY: "auto", paddingRight: "4px" }}>
            {cards.map((card) => {
              const isOn = selectedFronts.has(card.front);
              return (
                <button
                  key={card.front}
                  type="button"
                  onClick={() => toggle(card.front)}
                  style={{
                    padding: "6px 12px", borderRadius: "999px", fontSize: "13px",
                    fontFamily: "var(--font-korean)",
                    border: `1.5px solid ${isOn ? "var(--brand-primary)" : "var(--border-glass-subtle)"}`,
                    background: isOn ? "var(--brand-primary-light)" : "transparent",
                    color: isOn ? "var(--brand-primary)" : "var(--text-muted)",
                    cursor: "pointer", transition: "all 0.15s ease",
                    display: "flex", alignItems: "center", gap: "6px",
                  }}
                >
                  {isOn && <CheckIcon2D size={12} color="var(--brand-primary)" />}
                  <span style={{ fontWeight: 600 }}>{card.front}</span>
                  {card.back ? (
                    <span style={{ fontSize: "11px", opacity: 0.8, fontFamily: "var(--font-sans)", maxWidth: "110px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      : {card.back}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            type="button" onClick={onClose}
            style={{
              padding: "8px 16px", borderRadius: "8px", fontSize: "13px",
              border: "1px solid var(--border-glass-subtle)", background: "transparent",
              color: "var(--text-muted)", cursor: "pointer",
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={selectedFronts.size === 0}
            onClick={() => onConfirm(cards.filter((c) => selectedFronts.has(c.front)))}
            style={{
              padding: "8px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
              background: selectedFronts.size === 0 ? "var(--border-glass-subtle)" : "var(--brand-primary)",
              border: "none", color: "white", cursor: selectedFronts.size === 0 ? "not-allowed" : "pointer",
              transition: "background 0.15s ease",
            }}
          >
            Tiếp tục ({selectedFronts.size})
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create deck modal ──────────────────────────────────────────────────────
function CreateDeckModal({
  initialCards,
  onCreated,
  onClose,
}: {
  initialCards: CardItem[];
  onCreated: (deckTitle: string) => void;
  onClose: () => void;
}) {
  const [deckTitle, setDeckTitle] = useState("");
  const [cards, setCards] = useState<CardItem[]>(() => initialCards);
  const [isCreating, setIsCreating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string>();

  const missingMeaningCount = cards.filter((c) => !c.back.trim()).length;

  function handleCardChange(index: number, field: "front" | "back", val: string) {
    setCards((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
    if (error) setError(undefined);
  }

  function handleRemoveCard(index: number) {
    setCards((prev) => prev.filter((_, i) => i !== index));
    if (error) setError(undefined);
  }

  async function handleAiTranslate() {
    if (cards.length === 0) return;
    setIsTranslating(true);
    setError(undefined);
    try {
      const prompt = `Dịch nghĩa các từ tiếng Hàn sau sang tiếng Việt: ${cards.map((c) => c.front).join(", ")}`;
      const res = await aiApi.generateFlashcards(prompt);
      if (res && Array.isArray(res.flashcards) && res.flashcards.length > 0) {
        const translationMap = new Map<string, string>();
        for (const item of res.flashcards) {
          if (item.question && item.answer) {
            translationMap.set(item.question.trim().toLowerCase(), item.answer.trim());
          }
        }
        setCards((prev) =>
          prev.map((c, idx) => {
            const match =
              translationMap.get(c.front.trim().toLowerCase()) ??
              (res.flashcards[idx]?.answer ? res.flashcards[idx].answer.trim() : "");
            return {
              ...c,
              back: c.back.trim() ? c.back : (match || c.back),
            };
          }),
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Lỗi dịch AI: ${err.message}`
          : "Không thể tự động điền nghĩa bằng AI. Bạn có thể tự nhập nghĩa bên dưới.",
      );
    } finally {
      setIsTranslating(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const title = deckTitle.trim();
    if (!title) {
      setError("Vui lòng nhập tên bộ Flashcard.");
      return;
    }
    if (cards.length === 0) {
      setError("Bộ thẻ cần có ít nhất một thẻ.");
      return;
    }

    // Required: front and back must be non-empty for all cards
    const emptyBackIdx = cards.findIndex((c) => !c.back.trim());
    if (emptyBackIdx !== -1) {
      setError(
        `Thẻ "${cards[emptyBackIdx].front}" chưa có Mặt sau (nghĩa). Vui lòng nhập nghĩa hoặc bấm "AI điền nghĩa".`
      );
      return;
    }

    const emptyFrontIdx = cards.findIndex((c) => !c.front.trim());
    if (emptyFrontIdx !== -1) {
      setError("Mặt trước (từ tiếng Hàn) không được để trống.");
      return;
    }

    setIsCreating(true);
    setError(undefined);
    try {
      const deck = await createFlashcardDeck({ title });
      const formattedCards = cards.map((c) => ({
        front: c.front.trim(),
        back: c.back.trim(),
      }));
      await addCardsToFlashcard(deck.id, formattedCards);
      onCreated(title);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo flashcard thất bại.");
      setIsCreating(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1001,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "var(--bg-glass-card)", backdropFilter: "blur(20px)",
          border: "1px solid var(--border-glass)", borderRadius: "18px",
          padding: "24px", maxWidth: "520px", width: "100%",
          boxShadow: "var(--shadow-glass)",
          display: "flex", flexDirection: "column", gap: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Tạo bộ Flashcard</h3>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--text-muted)" }}>
              Mặt trước: Từ tiếng Hàn · Mặt sau: Nghĩa tiếng Việt
            </p>
          </div>
          <button
            type="button" onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}
          >
            <CloseIcon2D size={18} />
          </button>
        </div>

        <form onSubmit={(e) => void handleCreate(e)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>
              Tên bộ Flashcard *
            </label>
            <input
              autoFocus
              maxLength={120}
              onChange={(e) => setDeckTitle(e.target.value)}
              placeholder="VD: Từ vựng TOPIK I - mua sắm"
              required
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "9px 12px", borderRadius: "10px", fontSize: "13px",
                border: "1px solid var(--border-glass-subtle)",
                background: "var(--bg-glass-input)", color: "var(--text-main)",
                outline: "none",
              }}
              type="text"
              value={deckTitle}
            />
          </div>

          {/* Cards list header with AI Translate button */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Danh sách thẻ ({cards.length}):
                {missingMeaningCount > 0 ? (
                  <span style={{ color: "var(--state-error)", marginLeft: "4px" }}>
                    ({missingMeaningCount} thẻ chưa có nghĩa)
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => void handleAiTranslate()}
                disabled={isTranslating || cards.length === 0}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 600,
                  background: "var(--brand-primary-light)",
                  border: "1px solid var(--brand-primary)",
                  color: "var(--brand-primary)",
                  cursor: isTranslating || cards.length === 0 ? "wait" : "pointer",
                }}
              >
                <LightbulbIcon2D size={13} color="var(--brand-primary)" />
                {isTranslating ? "AI đang dịch..." : "AI điền nghĩa"}
              </button>
            </div>

            {/* Scrollable list of cards */}
            <div
              style={{
                display: "flex", flexDirection: "column", gap: "8px",
                maxHeight: "240px", overflowY: "auto", paddingRight: "4px",
              }}
            >
              {cards.map((card, idx) => {
                const isBackEmpty = !card.back.trim();
                return (
                  <div
                    key={`${card.front}-${idx}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1.6fr auto",
                      gap: "8px",
                      alignItems: "center",
                      padding: "8px 10px",
                      borderRadius: "10px",
                      background: "var(--bg-glass-input)",
                      border: `1px solid ${isBackEmpty ? "var(--state-error, #e57373)" : "var(--border-glass-subtle)"}`,
                      transition: "border 0.2s ease",
                    }}
                  >
                    {/* Front: Korean word */}
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                        Mặt trước (Từ)
                      </span>
                      <span style={{ fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-korean)", color: "var(--text-main)" }}>
                        {card.front}
                      </span>
                    </div>

                    {/* Back: Vietnamese meaning */}
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "10px", color: isBackEmpty ? "var(--state-error)" : "var(--text-muted)", textTransform: "uppercase" }}>
                        Mặt sau (Nghĩa) *
                      </span>
                      <input
                        type="text"
                        value={card.back}
                        onChange={(e) => handleCardChange(idx, "back", e.target.value)}
                        placeholder="Nghĩa tiếng Việt..."
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          border: "1px solid var(--border-glass-subtle)",
                          background: "transparent",
                          color: "var(--text-main)",
                          outline: "none",
                        }}
                      />
                    </div>

                    {/* Delete card button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveCard(idx)}
                      title="Xóa thẻ này"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <TrashIcon2D size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: "12px", color: "var(--state-error)" }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              type="button" onClick={onClose} disabled={isCreating || isTranslating}
              style={{
                padding: "8px 16px", borderRadius: "8px", fontSize: "13px",
                border: "1px solid var(--border-glass-subtle)", background: "transparent",
                color: "var(--text-muted)", cursor: isCreating || isTranslating ? "not-allowed" : "pointer",
              }}
            >
              Hủy
            </button>
            <button
              type="submit" disabled={isCreating || isTranslating || !deckTitle.trim() || cards.length === 0}
              style={{
                padding: "8px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                background: isCreating || isTranslating || !deckTitle.trim() || cards.length === 0 ? "var(--border-glass-subtle)" : "var(--brand-primary)",
                border: "none", color: "white",
                cursor: isCreating || isTranslating || !deckTitle.trim() || cards.length === 0 ? "not-allowed" : "pointer",
                transition: "background 0.15s ease",
              }}
            >
              {isCreating ? "Đang tạo..." : `Tạo Flashcard (${cards.length})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Success toast ──────────────────────────────────────────────────────────
function SuccessToast({
  message,
  onDismiss,
  onAction,
  actionLabel,
}: {
  message: string;
  onDismiss: () => void;
  onAction?: () => void;
  actionLabel?: string;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      style={{
        position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
        zIndex: 2000, background: "var(--state-success)", color: "#fff",
        padding: "10px 20px", borderRadius: "999px", fontSize: "13px", fontWeight: 600,
        boxShadow: "0 4px 20px rgba(16,185,129,0.4)",
        display: "flex", alignItems: "center", gap: "10px",
        animation: "fadeSlideUp 0.3s ease",
      }}
    >
      <CheckIcon2D size={15} color="#fff" />
      <span>{message}</span>
      {onAction && actionLabel && (
        <button
          type="button"
          onClick={() => {
            onDismiss();
            onAction();
          }}
          style={{
            background: "#fff",
            color: "var(--state-success)",
            border: "none",
            borderRadius: "999px",
            padding: "3px 10px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            marginLeft: "4px",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export function ChatbotPage({ onNavigate, userId, account, onLogout }: ChatbotPageProps) {
  const storageKey = `haru-ai-conversation-${userId}`;
  const initialConversationId = useRef(localStorage.getItem(storageKey));
  const [conversationId, setConversationId] = useState(initialConversationId.current);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(initialConversationId.current));
  const [isSending, setIsSending] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [modelName, setModelName] = useState<string>();
  const messageListRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Flashcard flow
  const [wordModalCards, setWordModalCards] = useState<CardItem[] | null>(null);
  const [deckModalCards, setDeckModalCards] = useState<CardItem[] | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // History box state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const historyBoxRef = useRef<HTMLDivElement>(null);
  const historyBtnRef = useRef<HTMLButtonElement>(null);

  const matchedPrompts = useMemo(() => matchPrompts(message), [message]);
  const showQuickPrompts = message.trim().length === 0;
  const hintPrompts = showQuickPrompts ? QUICK_PROMPTS : matchedPrompts;

  useEffect(() => {
    if (!isHistoryOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        historyBoxRef.current &&
        !historyBoxRef.current.contains(event.target as Node) &&
        historyBtnRef.current &&
        !historyBtnRef.current.contains(event.target as Node)
      ) {
        setIsHistoryOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsHistoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isHistoryOpen]);

  async function handleToggleHistory() {
    const nextOpen = !isHistoryOpen;
    setIsHistoryOpen(nextOpen);
    if (nextOpen) {
      setIsHistoryLoading(true);
      try {
        const list = await aiApi.listConversations(userId);
        setConversations(list);
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        setIsHistoryLoading(false);
      }
    }
  }

  async function handleSelectConversation(selectedId: string) {
    if (selectedId === conversationId) {
      setIsHistoryOpen(false);
      return;
    }
    setIsHistoryOpen(false);
    setIsLoading(true);
    setConversationId(selectedId);
    localStorage.setItem(storageKey, selectedId);
    try {
      const conv = await aiApi.getConversation(userId, selectedId);
      setMessages(
        conv.messages.map((item) => ({
          id: item.id,
          sender: item.role,
          text: item.content,
        })),
      );
      setErrorMessage(undefined);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không tải được hội thoại.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteConversation(targetId: string) {
    try {
      await aiApi.deleteConversation(userId, targetId);
      setConversations((prev) => prev.filter((c) => c.id !== targetId));
      if (conversationId === targetId) {
        setConversationId(null);
        setMessages([]);
        localStorage.removeItem(storageKey);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Không thể xóa cuộc trò chuyện.");
    }
  }

  function applyPromptHint(prompt: string) {
    setMessage(prompt);
    setErrorMessage(undefined);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
      el.focus();
    });
  }

  function toggleSelectionMode() {
    setIsSelecting((prev) => !prev);
    setSelectedMessageIds([]);
    setErrorMessage(undefined);
  }

  function toggleSelectMessage(id: string) {
    if (!isSelecting) return;
    setSelectedMessageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendTextMessage(message);
    }
  }

  function handleInput(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setMessage(event.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }

  // Open the word-selection modal with extracted Korean words and meanings
  function handleOpenWordModal() {
    if (selectedMessageIds.length === 0) {
      setErrorMessage("Hãy chọn ít nhất một tin nhắn của trợ lý.");
      return;
    }
    const selectedTexts = messages
      .filter((m) => selectedMessageIds.includes(m.id) && m.sender === "assistant")
      .map((m) => m.text);
    const cards = extractCardsFromTexts(selectedTexts);
    setWordModalCards(cards);
  }

  useEffect(() => {
    let isMounted = true;
    aiApi
      .health(userId)
      .then(() => { if (isMounted) setBackendStatus("online"); })
      .catch(() => { if (isMounted) setBackendStatus("offline"); });
    return () => { isMounted = false; };
  }, [userId]);

  useEffect(() => {
    const savedConversationId = initialConversationId.current;
    if (!savedConversationId) return;

    let isMounted = true;
    aiApi
      .getConversation(userId, savedConversationId)
      .then((conversation) => {
        if (!isMounted) return;
        setMessages(
          conversation.messages.map((item) => ({
            id: item.id,
            sender: item.role,
            text: item.content,
          })),
        );
      })
      .catch((error) => {
        if (!isMounted) return;
        if (error instanceof ApiError && error.status === 404) {
          localStorage.removeItem(storageKey);
          setConversationId(null);
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "Không tải được hội thoại.");
      })
      .finally(() => { if (isMounted) setIsLoading(false); });

    return () => { isMounted = false; };
  }, [storageKey, userId]);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  async function sendTextMessage(textToSend: string) {
    const text = textToSend.trim();
    if (!text || isSending) return;

    const temporaryId = `pending-${Date.now()}`;
    setMessages((current) => [...current, { id: temporaryId, sender: "user", text }]);
    setMessage("");
    setErrorMessage(undefined);
    setIsSending(true);

    try {
      let nextConversationId = conversationId;
      if (!nextConversationId) {
        const cleanTitle = text.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
        const initialTitle = cleanTitle.length > 50 ? `${cleanTitle.slice(0, 47)}...` : cleanTitle;
        const conversation = await aiApi.createConversation(userId, initialTitle);
        nextConversationId = conversation.id;
        setConversationId(nextConversationId);
        localStorage.setItem(storageKey, nextConversationId);
        setConversations((prev) => [conversation, ...prev.filter((c) => c.id !== conversation.id)]);
      }

      const response = await aiApi.sendMessage(userId, nextConversationId, text);
      setMessages((current) => [
        ...current.filter(({ id }) => id !== temporaryId),
        { id: response.user_message.id, sender: "user", text: response.user_message.content },
        { id: response.assistant_message.id, sender: "assistant", text: response.assistant_message.content },
      ]);
      setModelName(response.model);
      setBackendStatus("online");
    } catch (error) {
      setMessages((current) => current.filter(({ id }) => id !== temporaryId));
      setMessage(text);
      setErrorMessage(error instanceof Error ? error.message : "Không gửi được tin nhắn.");
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendTextMessage(message);
  }

  function startNewChat() {
    setConversationId(null);
    setMessages([]);
    setModelName(undefined);
    setErrorMessage(undefined);
    setIsSelecting(false);
    setSelectedMessageIds([]);
    localStorage.removeItem(storageKey);
  }

  return (
    <div className="app-layout">
      <AppSidebar account={account} activePage="chatbot" onLogout={onLogout} onNavigate={onNavigate} />

      <main className="chatbot-page" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", position: "relative", zIndex: 100 }}>
          <h1 style={{ fontSize: "20px", margin: 0 }}>Trợ Lý AI</h1>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative", zIndex: 100 }}>
  

            {/* History Toggle Button */}
            <button
              ref={historyBtnRef}
              className="manage-secondary-button interactive-element"
              onClick={() => void handleToggleHistory()}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                borderRadius: "8px",
                background: isHistoryOpen ? "var(--brand-primary-light)" : undefined,
                borderColor: isHistoryOpen ? "var(--brand-primary)" : undefined,
                color: isHistoryOpen ? "var(--brand-primary)" : undefined,
              }}
              type="button"
              title="Lịch sử các cuộc trò chuyện"
            >
              <HistoryIcon2D size={14} />
              <span>Lịch sử</span>
            </button>

            {/* New Chat Button */}
            <button
              className="manage-secondary-button interactive-element"
              onClick={startNewChat}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                borderRadius: "8px",
              }}
              type="button"
              title="Bắt đầu cuộc trò chuyện mới"
            >
              <PlusIcon2D size={13} />
              <span>Chat mới</span>
            </button>

            {/* History Box Popover */}
            {isHistoryOpen && (
              <div
                ref={historyBoxRef}
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: "320px",
                  maxHeight: "420px",
                  background: "rgba(15, 23, 42, 0.95)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  border: "1px solid var(--border-glass, rgba(255, 255, 255, 0.2))",
                  borderRadius: "14px",
                  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)",
                  zIndex: 1000,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  animation: "fadeSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {/* Popover Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--border-glass-subtle)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <HistoryIcon2D size={15} color="var(--brand-primary)" />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>
                      Lịch sử trò chuyện
                    </span>
                    {conversations.length > 0 && (
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "1px 6px",
                          borderRadius: "999px",
                          background: "var(--brand-primary-light)",
                          color: "var(--brand-primary)",
                          fontWeight: 700,
                        }}
                      >
                        {conversations.length}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsHistoryOpen(false)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "6px",
                    }}
                    title="Đóng"
                  >
                    <CloseIcon2D size={14} />
                  </button>
                </div>

                {/* Popover List */}
                <div
                  style={{
                    padding: "8px",
                    overflowY: "auto",
                    maxHeight: "300px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  {isHistoryLoading ? (
                    <div style={{ padding: "28px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
                      Đang tải lịch sử...
                    </div>
                  ) : conversations.length === 0 ? (
                    <div style={{ padding: "28px 12px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
                      Chưa có cuộc trò chuyện nào được lưu.
                    </div>
                  ) : (
                    conversations.map((c) => {
                      const isActive = c.id === conversationId;
                      return (
                        <div
                          key={c.id}
                          onClick={() => void handleSelectConversation(c.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 10px",
                            borderRadius: "9px",
                            cursor: "pointer",
                            background: isActive ? "var(--brand-primary-light)" : "transparent",
                            border: `1px solid ${isActive ? "var(--brand-primary)" : "transparent"}`,
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) e.currentTarget.style.background = "var(--bg-glass-input)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1, marginRight: "8px" }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: "12.5px",
                                fontWeight: isActive ? 600 : 500,
                                color: isActive ? "var(--brand-primary)" : "var(--text-main)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={c.title}
                            >
                              {c.title && c.title !== "HARU HARU" ? c.title : "Cuộc hội thoại"}
                            </p>
                            <span style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>
                              {formatConversationTime(c.updated_at || c.created_at)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeleteConversation(c.id);
                            }}
                            title="Xóa cuộc trò chuyện này"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--text-muted)",
                              padding: "4px",
                              borderRadius: "4px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: 0.6,
                              transition: "opacity 0.15s ease, color 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = "1";
                              e.currentTarget.style.color = "var(--state-error, #f87171)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = "0.6";
                              e.currentTarget.style.color = "var(--text-muted)";
                            }}
                          >
                            <TrashIcon2D size={13} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

  
              </div>
            )}
          </div>
        </header>


        <section aria-label="Tin nhắn" className="glass-card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "14px" }}>
          <div aria-live="polite" className="chat-message-list" ref={messageListRef}>
            {isLoading ? <p className="page-status">Đang nạp lịch sử trò chuyện...</p> : null}

            {messages.length === 0 && !isLoading && (
              <div style={{ margin: "auto 0", textAlign: "center", padding: "20px 14px" }}>
                <div style={{ display: "inline-flex", padding: "10px", background: "var(--brand-primary-light)", borderRadius: "50%", color: "var(--brand-primary)", marginBottom: "8px" }}>
                  <BotIcon2D size={28} />
                </div>
                <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 4px" }}>Haru AI Assistant</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", maxWidth: "400px", margin: "0 auto 14px" }}>
                  Hỏi ngữ pháp tiếng Hàn, giải thích câu, hoặc thực hành hội thoại.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "440px", margin: "0 auto" }}>
                  {QUICK_PROMPTS.map((promptText) => (
                    <button
                      key={promptText}
                      className="manage-secondary-button interactive-element"
                      onClick={() => applyPromptHint(promptText)}
                      style={{ textAlign: "left", fontSize: "12px", padding: "7px 10px", minHeight: "auto" }}
                      type="button"
                    >
                      <LightbulbIcon2D size={13} style={{ flexShrink: 0 }} /> {promptText}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((chatMessage) => {
              const isAssistant = chatMessage.sender === "assistant";
              const isSelected = selectedMessageIds.includes(chatMessage.id);
              return (
                <div
                  key={chatMessage.id}
                  onClick={() => { if (isSelecting && isAssistant) toggleSelectMessage(chatMessage.id); }}
                  style={{
                    alignSelf: isAssistant ? "flex-start" : "flex-end",
                    maxWidth: "85%",
                    padding: "10px 14px",
                    borderRadius: "14px",
                    background: isAssistant
                      ? isSelected
                        ? "rgba(129,140,248,0.18)"
                        : "var(--bg-glass-input)"
                      : "var(--brand-primary)",
                    color: isAssistant ? "var(--text-main)" : "white",
                    border: isAssistant
                      ? `1.5px solid ${isSelected ? "var(--brand-primary)" : "var(--border-glass-subtle)"}`
                      : "0",
                    boxShadow: isSelected ? "0 0 0 2px var(--brand-primary)" : "0 2px 6px rgba(0,0,0,0.05)",
                    fontSize: "13.5px",
                    lineHeight: "1.45",
                    display: "flex",
                    gap: "10px",
                    cursor: isSelecting && isAssistant ? "pointer" : "default",
                    transition: "border 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
                  }}
                >
                  {isAssistant ? (
                    <AiMessageContent text={chatMessage.text} />
                  ) : (
                    <p style={{ margin: 0 }}>{chatMessage.text}</p>
                  )}
                  {isSelecting && isAssistant && (
                    <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-start", paddingTop: "2px" }}>
                      <div
                        style={{
                          width: "20px", height: "20px", borderRadius: "50%",
                          border: isSelected ? "none" : "2px solid var(--border-glass-subtle)",
                          background: isSelected ? "var(--brand-primary)" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {isSelected && <CheckIcon2D color="#fff" size={12} />}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {isSending && (
              <div className="chat-typing-indicator" aria-label="Haru AI đang soạn câu trả lời">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            )}
          </div>

          {errorMessage ? (
            <p className="page-status page-status-error" style={{ marginTop: "6px" }}>
              {errorMessage}
            </p>
          ) : null}

          {/* Selection mode banner */}
          {isSelecting && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px", marginTop: "8px", borderRadius: "10px",
              background: "var(--brand-primary-light)", border: "1px solid var(--brand-primary)",
              fontSize: "12px", color: "var(--brand-primary)",
            }}>
              <span>
                {selectedMessageIds.length === 0
                  ? "Nhấn vào tin nhắn của trợ lý để chọn"
                  : `Đã chọn ${selectedMessageIds.length} tin nhắn`}
              </span>
              <button
                type="button"
                disabled={selectedMessageIds.length === 0}
                onClick={handleOpenWordModal}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "5px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                  background: selectedMessageIds.length === 0 ? "transparent" : "var(--brand-primary)",
                  border: `1px solid ${selectedMessageIds.length === 0 ? "var(--brand-primary)" : "transparent"}`,
                  color: selectedMessageIds.length === 0 ? "var(--brand-primary)" : "white",
                  cursor: selectedMessageIds.length === 0 ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Trích từ <ArrowRightIcon2D size={12} color={selectedMessageIds.length === 0 ? "var(--brand-primary)" : "white"} />
              </button>
            </div>
          )}

          <div
            aria-label={showQuickPrompts ? "Gợi ý nhanh" : "Gợi ý khớp chữ"}
            className="chat-prompt-hints"
          >
            {/* "Tạo Flash Card" button */}
            {messages.some((m) => m.sender === "assistant") && (
              <button
                type="button"
                onClick={toggleSelectionMode}
                className="manage-secondary-button interactive-element"
                style={{
                  backgroundColor: isSelecting ? "var(--state-error)" : "#d67575ff",
                  display: "flex", justifyContent: "center", alignItems: "center",
                  textAlign: "left", fontSize: "12px", padding: "7px 10px", minHeight: "auto",
                  color: "#fff",
                }}
              >
                {isSelecting ? (
                  <><CloseIcon2D size={13} color="#fff" /> Thoát chọn</>
                ) : (
                  <>Tạo Flash Card <ArrowRightIcon2D color="#ffffff" size={14} /></>
                )}
              </button>
            )}

            <span className="chat-prompt-hints-label">
              {showQuickPrompts ? "Gợi ý" : "Khớp chữ"}
            </span>
            <div className="chat-prompt-hints-list">
              {hintPrompts.length ? (
                hintPrompts.map((item) => (
                  <button
                    key={item}
                    className="chat-prompt-chip interactive-element"
                    onClick={() => applyPromptHint(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))
              ) : (
                <span className="chat-prompt-hints-empty">Không có form gần giống</span>
              )}
            </div>
          </div>

          <form className="chat-messenger-form" onSubmit={handleSubmit}>
            <textarea
              className="chat-messenger-textarea"
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn tiếng Hàn hoặc nhờ giải thích..."
              ref={textareaRef}
              rows={1}
              value={message}
            />
            {/* Toggle selection mode button */}
            <button
              aria-label="Gửi tin nhắn"
              className="chat-send-plane-btn interactive-element"
              disabled={!message.trim() || isSending || isLoading}
              title="Gửi tin nhắn (Enter)"
              type="submit"
            >
              <SendIcon2D color="#ffffff" size={17} style={{ transform: "translateX(1px)" }} />
            </button>
          </form>
        </section>
      </main>

      {/* Word selection modal */}
      {wordModalCards !== null && (
        <WordSelectionModal
          cards={wordModalCards}
          onClose={() => setWordModalCards(null)}
          onConfirm={(selected) => {
            setWordModalCards(null);
            setDeckModalCards(selected);
          }}
        />
      )}

      {/* Create deck modal */}
      {deckModalCards !== null && (
        <CreateDeckModal
          initialCards={deckModalCards}
          onClose={() => setDeckModalCards(null)}
          onCreated={(title) => {
            const count = deckModalCards.length;
            setDeckModalCards(null);
            setIsSelecting(false);
            setSelectedMessageIds([]);
            setSuccessMessage(`Đã tạo bộ "${title}" với ${count} thẻ!`);
          }}
        />
      )}

      {/* Success toast */}
      {successMessage && (
        <SuccessToast
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
          actionLabel="Xem bộ thẻ →"
          onAction={() => onNavigate("flashcards")}
        />
      )}

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
