import { FormEvent, useEffect, useRef, useState } from "react";
import { aiApi } from "../api/ai-api";
import { ApiError } from "../api/client";
import { AiMessageContent } from "../components/ai-message-content";
import { AppPage, AppSidebar } from "../components/app-sidebar";
import "../styles/app.css";

type ChatMessage = {
  id: string;
  sender: "assistant" | "user";
  text: string;
};

type ChatbotPageProps = {
  onNavigate: (page: AppPage) => void;
  userId: number;
};

export function ChatbotPage({ onNavigate, userId }: ChatbotPageProps) {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
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
        // The local new-chat action still succeeds if cleanup is unavailable.
      }
    }
  }

  return (
    <div className="app-layout">
      <AppSidebar activePage="chatbot" onNavigate={onNavigate} />

      <main className="chatbot-page">
        <header className="chatbot-page-header">
          <div className="chatbot-identity">
            <div aria-label="Avatar chatbot" className="chatbot-avatar" role="img">
              H
            </div>
            <div className="chatbot-title">
              <h1>HARU HARU</h1>
              <p>
                {backendStatus === "checking"
                  ? "Đang kết nối..."
                  : backendStatus === "online"
                    ? modelName ?? "AI đã sẵn sàng"
                    : "AI đang ngoại tuyến"}
              </p>
            </div>
            <button className="new-chat-button" onClick={() => void startNewChat()} type="button">
              Cuộc trò chuyện mới
            </button>
          </div>
        </header>

        <section aria-label="Tin nhắn" className="chat-panel">
          <div aria-live="polite" className="message-list" ref={messageListRef}>
            {isLoading ? <p className="chat-status">Đang tải hội thoại...</p> : null}
            {messages.map((chatMessage) => (
              <div
                className={`message message-${chatMessage.sender}`}
                key={chatMessage.id}
              >
                {chatMessage.sender === "assistant" ? (
                  <AiMessageContent text={chatMessage.text} />
                ) : (
                  <p>{chatMessage.text}</p>
                )}
              </div>
            ))}
            {isSending ? <p className="chat-status">HARU HARU đang trả lời...</p> : null}
          </div>

          {errorMessage ? (
            <p className="chat-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <form className="chat-composer" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="chat-message">
              Tin nhắn
            </label>
            <input
              id="chat-message"
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Nhập tin nhắn..."
              value={message}
            />
            <button disabled={!message.trim() || isSending || isLoading} type="submit">
              {isSending ? "Đang gửi" : "Gửi"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
