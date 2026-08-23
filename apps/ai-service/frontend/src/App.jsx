import { useCallback, useEffect, useMemo, useState } from "react";

import { api, health } from "./api.js";

const PAGE_SIZE = 20;

function formatDate(value) {
  return new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export default function App() {
  const [userId, setUserId] = useState("user-001");
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [title, setTitle] = useState("");
  const [input, setInput] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Sẵn sàng");
  const [error, setError] = useState("");
  const [modelInfo, setModelInfo] = useState("REST API");

  const request = useCallback((path, options) => api(path, userId, options), [userId]);

  const loadConversations = useCallback(async () => {
    try {
      setError("");
      const data = await request("/conversations");
      setConversations(data);
      return data;
    } catch (requestError) {
      setError(requestError.message);
      return [];
    }
  }, [request]);

  const loadMessages = useCallback(async (conversationId, targetPage = page) => {
    if (!conversationId) return;
    try {
      setError("");
      const data = await request(`/conversations/${conversationId}/messages?page=${targetPage}&limit=${PAGE_SIZE}`);
      setMessages(data);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [page, request]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  async function selectConversation(conversation) {
    try {
      setError("");
      const detail = await request(`/conversations/${conversation.id}`);
      setActive(detail);
      setPage(1);
      await loadMessages(conversation.id, 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function createConversation(event) {
    event.preventDefault();
    try {
      setLoading(true);
      const created = await request("/conversations", { method: "POST", body: JSON.stringify({ title: title.trim() || null }) });
      setTitle("");
      await loadConversations();
      await selectConversation(created);
      setStatus("Đã tạo conversation mới");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!active || !input.trim()) return;
    try {
      setLoading(true);
      setError("");
      setStatus("AI đang trả lời...");
      const result = await request(`/conversations/${active.id}/messages`, { method: "POST", body: JSON.stringify({ content: input.trim() }) });
      setInput("");
      setModelInfo(`${result.provider} · ${result.model}`);
      await loadMessages(active.id, 1);
      await loadConversations();
      setStatus("Đã nhận phản hồi");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("Gửi message thất bại");
    } finally {
      setLoading(false);
    }
  }

  async function deleteConversation() {
    if (!active || !window.confirm(`Xóa “${active.title}”?`)) return;
    try {
      setLoading(true);
      await request(`/conversations/${active.id}`, { method: "DELETE" });
      setActive(null);
      setMessages([]);
      await loadConversations();
      setStatus("Đã xóa conversation");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkHealth() {
    try {
      const result = await health();
      setStatus(result.status === "ok" ? "Backend đang hoạt động" : "Backend trả trạng thái không hợp lệ");
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const canNextPage = messages.length === PAGE_SIZE;
  const conversationName = active?.title || "Chọn một conversation";
  const allMessages = useMemo(() => messages, [messages]);

  return <div className="layout">
    <aside className="sidebar">
      <div className="brand"><span>✦</span><div><strong>Study AI</strong><small>Chatbot workspace</small></div></div>
      <label className="field-label" htmlFor="user-id">USER ID</label>
      <input id="user-id" value={userId} onChange={(event) => setUserId(event.target.value)} onBlur={() => { setActive(null); setMessages([]); loadConversations(); }} />
      <form className="create-form" onSubmit={createConversation}>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tên conversation mới" maxLength="120" />
        <button disabled={loading}>＋ Tạo mới</button>
      </form>
      <div className="sidebar-heading">CONVERSATIONS <span>{conversations.length}</span></div>
      <nav className="conversation-list">
        {conversations.map((conversation) => <button key={conversation.id} className={active?.id === conversation.id ? "conversation active" : "conversation"} onClick={() => selectConversation(conversation)}>
          <span>☷</span><em>{conversation.title}</em>
        </button>)}
        {!conversations.length && <p className="muted">Chưa có conversation.</p>}
      </nav>
      <button className="health" onClick={checkHealth}>● Kiểm tra backend</button>
    </aside>

    <main className="chat">
      <header><div><small>AI CHAT</small><h1>{conversationName}</h1></div><div className="header-actions"><button className="delete" onClick={deleteConversation} disabled={!active || loading}>⌫ Xóa</button><span className="badge">{modelInfo}</span></div></header>
      {error && <div className="error">{error}</div>}
      <section className="messages">
        {!active && <div className="empty"><b>✦</b><h2>Bắt đầu cuộc trò chuyện</h2><p>Tạo hoặc chọn conversation ở thanh bên.</p></div>}
        {active && !allMessages.length && <div className="empty"><b>✦</b><h2>Chưa có tin nhắn</h2><p>Gửi tin nhắn đầu tiên cho AI.</p></div>}
        {allMessages.map((message) => <article className={`message ${message.role}`} key={message.id}><div className="avatar">{message.role === "user" ? "U" : "AI"}</div><div><p>{message.content}</p><time>{message.role === "user" ? "Bạn" : "Assistant"} · {formatDate(message.created_at)}</time></div></article>)}
      </section>
      {active && <div className="pagination"><button disabled={page === 1 || loading} onClick={() => { const next = page - 1; setPage(next); loadMessages(active.id, next); }}>← Trước</button><span>Trang {page}</span><button disabled={!canNextPage || loading} onClick={() => { const next = page + 1; setPage(next); loadMessages(active.id, next); }}>Sau →</button></div>}
      <form className="composer" onSubmit={sendMessage}><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} placeholder={active ? "Nhập tin nhắn..." : "Chọn conversation để bắt đầu..."} disabled={!active || loading} /><button disabled={!active || loading || !input.trim()}>{loading ? "Đang gửi..." : "Gửi ↗"}</button></form>
      <footer>{status}</footer>
    </main>
  </div>;
}
