import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { aiApi } from "../api/ai-api";
import { ApiError } from "../api/client";
import { AiMessageContent } from "../components/ai-message-content";
import { AppPage, AppSidebar } from "../components/app-sidebar";
import { BotIcon2D, LightbulbIcon2D, PlusIcon2D, SendIcon2D } from "../components/icons";
import { matchPrompts, QUICK_PROMPTS } from "../lib/ai-prompts";
import type { Account } from "../types/auth";
import "../styles/app.css";

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

export function ChatbotPage({ onNavigate, userId, account, onLogout }: ChatbotPageProps) {
  const storageKey = `haru-ai-conversation-${userId}`;
  const initialConversationId = useRef(localStorage.getItem(storageKey));
  const [conversationId, setConversationId] = useState(initialConversationId.current);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(initialConversationId.current));
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">(
    "checking",
  );
  const [modelName, setModelName] = useState<string>();
  const messageListRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const matchedPrompts = useMemo(() => matchPrompts(message), [message]);
  const showQuickPrompts = message.trim().length === 0;
  const hintPrompts = showQuickPrompts ? QUICK_PROMPTS : matchedPrompts;

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

  useEffect(() => {
    let isMounted = true;
    aiApi
      .health(userId)
      .then(() => {
        if (isMounted) setBackendStatus("online");
      })
      .catch(() => {
        if (isMounted) setBackendStatus("offline");
      });
    return () => {
      isMounted = false;
    };
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
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [storageKey, userId]);

  useEffect(() => {
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: "smooth",
    });
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
        const conversation = await aiApi.createConversation(userId);
        nextConversationId = conversation.id;
        setConversationId(nextConversationId);
        localStorage.setItem(storageKey, nextConversationId);
      }

      const response = await aiApi.sendMessage(userId, nextConversationId, text);
      setMessages((current) => [
        ...current.filter(({ id }) => id !== temporaryId),
        {
          id: response.user_message.id,
          sender: "user",
          text: response.user_message.content,
        },
        {
          id: response.assistant_message.id,
          sender: "assistant",
          text: response.assistant_message.content,
        },
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

  async function startNewChat() {
    const previousConversationId = conversationId;
    setConversationId(null);
    setMessages([]);
    setModelName(undefined);
    setErrorMessage(undefined);
    localStorage.removeItem(storageKey);
    if (previousConversationId) {
      try {
        await aiApi.deleteConversation(userId, previousConversationId);
      } catch {
        // Cleaning up remote chat session fails silently if gateway is offline
      }
    }
  }

  return (
    <div className="app-layout">
      <AppSidebar account={account} activePage="chatbot" onLogout={onLogout} onNavigate={onNavigate} />

      <main className="chatbot-page" style={{ height: "100%", display: "flex", flexDirection: "column", paddingBottom: "16px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h1 style={{ fontSize: "20px", margin: 0 }}>Trợ Lý AI</h1>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: backendStatus === "online" ? "var(--state-success)" : "var(--state-error)" }} />
              {backendStatus === "online" ? (modelName ?? "AI Online") : "AI Offline"}
            </span>

            <button className="manage-secondary-button interactive-element" onClick={() => void startNewChat()} style={{ padding: "5px 10px", fontSize: "12px" }} type="button">
              <PlusIcon2D size={13} /> Chat mới
            </button>
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
              return (
                <div
                  key={chatMessage.id}
                  style={{
                    alignSelf: isAssistant ? "flex-start" : "flex-end",
                    maxWidth: "85%",
                    padding: "10px 14px",
                    borderRadius: "14px",
                    background: isAssistant ? "var(--bg-glass-input)" : "var(--brand-primary)",
                    color: isAssistant ? "var(--text-main)" : "white",
                    border: isAssistant ? "1px solid var(--border-glass-subtle)" : "0",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                    fontSize: "13.5px",
                    lineHeight: "1.45"
                  }}
                >
                  {isAssistant ? (
                    <AiMessageContent text={chatMessage.text} />
                  ) : (
                    <p style={{ margin: 0 }}>{chatMessage.text}</p>
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

          <div
            aria-label={showQuickPrompts ? "Gợi ý nhanh" : "Gợi ý khớp chữ"}
            className="chat-prompt-hints"
          >
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
    </div>
  );
}
