import { useEffect, useMemo, useRef, useState } from "react";
import { AiMessageContent } from "./AiMessageContent.jsx";
import { api, health } from "./api.js";

/** Default chips above the composer (always visible). */
const QUICK_PROMPTS = [
  "안녕하세요! 오늘 기분이 어때요?",
  "“먹다” nghĩa là gì?",
  "저는 한국어를 공부해요 đúng không?",
];

/** Larger bank for typeahead match while typing. */
const PROMPT_BANK = [
  ...QUICK_PROMPTS,
  "오늘 뭐 했어요?",
  "저는 오늘 학교에 갔어요.",
  "주말에 뭐 하고 싶어요?",
  "저는 한국 음식을 좋아해요. 특히 김치찌개를 좋아해요.",
  "공부하다 dùng như thế nào?",
  "안녕하세요 nghĩa là gì? Có dùng với bạn bè được không?",
  "“맛있다” và “맛있어요” khác nhau như thế nào?",
  "이 문장 고쳐 주세요: 나는 어제 영화 봐요.",
  "Từ 가다 chia hiện tại lịch sự thế nào?",
  "Giải thích trợ từ 은/는 và 이/가.",
  "Hãy sửa câu này và giải thích bằng tiếng Việt.",
  "Luyện hội thoại gọi món ăn ở nhà hàng.",
  "Dịch sang tiếng Hàn: Hôm nay tôi đi học.",
  "Phát âm ㄹ cuối âm khác nhau thế nào?",
  "Cho ví dụ câu với 고 싶어요.",
];

function formatTime(value) {
  return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchPrompts(query, bank, limit = 5) {
  const q = normalize(query);
  if (q.length < 1) return [];

  const scored = bank
    .map((prompt) => {
      const n = normalize(prompt);
      if (!n || n === q) return null;

      let score = 0;
      if (n.includes(q)) score += 40;
      if (n.startsWith(q)) score += 25;
      if (q.includes(n.slice(0, Math.min(8, n.length)))) score += 10;

      const qTokens = q.split(" ").filter(Boolean);
      const hits = qTokens.filter((token) => token.length > 1 && n.includes(token)).length;
      score += hits * 8;

      // Prefer similar length ("form prompt cỡ bản").
      const lengthGap = Math.abs(prompt.length - query.trim().length);
      score += Math.max(0, 18 - lengthGap);

      if (score <= 0) return null;
      return { prompt, score, lengthGap };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.lengthGap - b.lengthGap);

  const seen = new Set();
  const out = [];
  for (const item of scored) {
    if (seen.has(item.prompt)) continue;
    seen.add(item.prompt);
    out.push(item.prompt);
    if (out.length >= limit) break;
  }
  return out;
}

export default function App() {
  const [userId, setUserId] = useState("tester");
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [backendOk, setBackendOk] = useState(null);
  const [modelInfo, setModelInfo] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const matchedPrompts = useMemo(() => matchPrompts(input, PROMPT_BANK), [input]);
  const showQuick = input.trim().length === 0;
  const hintPrompts = showQuick ? QUICK_PROMPTS : matchedPrompts;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    health(userId)
      .then((result) => setBackendOk(result.status === "ok"))
      .catch(() => setBackendOk(false));
  }, [userId]);

  async function ensureConversation() {
    if (conversationId) return conversationId;
    const created = await api("/conversations", userId, {
      method: "POST",
      body: JSON.stringify({ title: `Chat ${new Date().toLocaleString("vi-VN")}` }),
    });
    setConversationId(created.id);
    return created.id;
  }

  async function refreshMessages(id) {
    const detail = await api(`/conversations/${id}`, userId);
    setMessages(detail.messages || []);
  }

  function startNewChat() {
    setConversationId(null);
    setMessages([]);
    setError("");
    setModelInfo("");
    setInput("");
    inputRef.current?.focus();
  }

  async function sendText(text) {
    const content = text.trim();
    if (!content || loading) return;

    setLoading(true);
    setError("");
    setInput("");

    const optimistic = {
      id: `local-${Date.now()}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);

    try {
      const id = await ensureConversation();
      const result = await api(`/conversations/${id}/messages`, userId, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setModelInfo(`${result.provider} · ${result.model}`);
      await refreshMessages(id);
    } catch (requestError) {
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
      setError(requestError.message);
      setInput(content);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function applyHint(prompt) {
    setInput(prompt);
    inputRef.current?.focus();
  }

  function sendMessage(event) {
    event.preventDefault();
    void sendText(input);
  }

  return (
    <div className="shell">
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />

      <div className="frame">
        <header className="topbar">
          <div className="brand">
            <div className="mark" aria-hidden="true">한</div>
            <div>
              <p className="eyebrow">KITS AI</p>
              <h1>Trợ lý học tiếng Hàn</h1>
            </div>
          </div>

          <div className="topbar-right">
            <span className={`pill ${backendOk === false ? "pill-bad" : backendOk ? "pill-ok" : ""}`}>
              {backendOk === null ? "Đang kiểm tra…" : backendOk ? "API sẵn sàng" : "API lỗi"}
            </span>
            {modelInfo ? <span className="pill muted">{modelInfo}</span> : null}
            <label className="user-field">
              <span>User</span>
              <input
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                aria-label="User ID"
              />
            </label>
            <button className="btn-quiet" onClick={startNewChat} type="button">
              Chat mới
            </button>
          </div>
        </header>

        {error ? (
          <div className="alert" role="alert">
            <strong>Không gửi được</strong>
            <span>{error}</span>
          </div>
        ) : null}

        <main className="thread" aria-live="polite">
          {messages.map((message) => (
            <article className={`row ${message.role}`} key={message.id}>
              <div className="avatar" aria-hidden="true">
                {message.role === "user" ? "Bạn" : "AI"}
              </div>
              <div className="bubble">
                {message.role === "assistant" ? (
                  <AiMessageContent text={message.content} />
                ) : (
                  <p className="plain">{message.content}</p>
                )}
                <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
              </div>
            </article>
          ))}

          {loading ? (
            <div className="row assistant">
              <div className="avatar" aria-hidden="true">AI</div>
              <div className="bubble typing" aria-label="AI đang soạn">
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </main>

        <div className="dock">
          <div className="prompt-hints" aria-label={showQuick ? "Gợi ý nhanh" : "Gợi ý khớp chữ"}>
            <span className="prompt-hints-label">{showQuick ? "Gợi ý" : "Khớp chữ"}</span>
            <div className="prompt-hints-list">
              {hintPrompts.length ? (
                hintPrompts.map((item) => (
                  <button key={item} className="chip" onClick={() => applyHint(item)} type="button">
                    {item}
                  </button>
                ))
              ) : (
                <span className="prompt-hints-empty">Không có form gần giống</span>
              )}
            </div>
          </div>

          <form className="composer" onSubmit={sendMessage}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Nhập tiếng Hàn hoặc hỏi bằng tiếng Việt…"
              disabled={loading}
              rows={1}
            />
            <button
              className="btn-send"
              disabled={loading || !input.trim()}
              type="submit"
              aria-label={loading ? "Đang gửi" : "Gửi"}
              title={loading ? "Đang gửi" : "Gửi"}
            >
              {loading ? (
                <span className="btn-send-spinner" aria-hidden="true" />
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24" className="send-icon">
                  <path
                    d="M3.4 20.6 21 12 3.4 3.4l-.1 6.7L14 12l-10.7 1.9.1 6.7Z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
