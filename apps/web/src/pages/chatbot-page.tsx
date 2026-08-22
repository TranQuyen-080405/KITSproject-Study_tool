// This page provides a local chat UI until the AI Service is connected.
import { FormEvent, useState } from "react";
import { AppPage, AppSidebar } from "../components/app-sidebar";
import "../styles/app.css";

type ChatMessage = {
  id: number;
  sender: "assistant" | "user";
  text: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    sender: "assistant",
    text: "Xin chào! Hãy gửi một câu hỏi về tiếng Hàn.",
  },
];

type ChatbotPageProps = {
  onNavigate: (page: AppPage) => void;
};

export function ChatbotPage({ onNavigate }: ChatbotPageProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [message, setMessage] = useState("");
  const [chatbotName, setChatbotName] = useState("Chatbot trò chuyện");
  const [draftChatbotName, setDraftChatbotName] = useState(chatbotName);
  const [isEditingName, setIsEditingName] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();

    if (!text) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: Date.now(), sender: "user", text },
    ]);
    setMessage("");
  }

  function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draftChatbotName.trim();

    if (!name) {
      return;
    }

    setChatbotName(name);
    setIsEditingName(false);
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

            {isEditingName ? (
              <form className="chatbot-name-form" onSubmit={handleNameSubmit}>
                <label className="sr-only" htmlFor="chatbot-name">
                  Tên chatbot
                </label>
                <input
                  autoFocus
                  id="chatbot-name"
                  onChange={(event) => setDraftChatbotName(event.target.value)}
                  value={draftChatbotName}
                />
                <button type="submit">Lưu</button>
                <button onClick={() => {setDraftChatbotName(chatbotName);
                                        setIsEditingName(false);}}
                                        type="button"> Hủy
                </button>
              </form>
            ) : (
              <button
                aria-label="Đổi tên chatbot"
                className="chatbot-name-button"
                onClick={() => setIsEditingName(true)}
                type="button"
              >
                <h1>{chatbotName}</h1>
              </button>
            )}
          </div>
        </header>

        <section aria-label="Tin nhắn" className="chat-panel">
          <div className="message-list">
            {messages.map((chatMessage) => (
              <p
                className={`message message-${chatMessage.sender}`}
                key={chatMessage.id}
              >
                {chatMessage.text}
              </p>
            ))}
          </div>

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
            <button disabled={!message.trim()} type="submit">
              Gửi
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
