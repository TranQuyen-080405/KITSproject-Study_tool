import { useEffect, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8001/api/v1";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

async function api(path, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(data?.error?.message || "Không thể kết nối đến máy chủ");
    error.code = data?.error?.code;
    throw error;
  }
  return data;
}

function Field({ label, hint, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

function App() {
  const [view, setView] = useState("login");
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kits_user")) || null; } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => setNotice(null), [view]);

  async function submit(action) {
    setLoading(true);
    setNotice(null);
    try {
      await action();
    } catch (error) {
      setNotice({ type: "error", text: error.message, code: error.code });
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try { await api("/auth/logout", {}); } catch { /* local session is still cleared */ }
    localStorage.removeItem("kits_user");
    localStorage.removeItem("kits_access_token");
    setUser(null);
    setView("login");
  }

  if (user) {
    return (
      <main className="page">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <section className="welcome-card">
          <div className="logo">한</div>
          <p className="eyebrow">KITS KOREAN</p>
          <h1>안녕하세요!</h1>
          <p className="welcome-name">Xin chào, <strong>{user.displayName}</strong></p>
          <p className="welcome-copy">Sẵn sàng học thêm một vài flashcard tiếng Hàn hôm nay nhé.</p>
          <button className="primary" onClick={logout}>Đăng xuất</button>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="auth-card">
        <header>
          <div className="logo">한</div>
          <p className="eyebrow">KITS KOREAN</p>
          <h1>{titles[view].title}</h1>
          <p>{titles[view].subtitle}</p>
        </header>

        {view === "login" && <LoginForm loading={loading} submit={submit} setUser={setUser} go={setView} setNotice={setNotice} />}
        {view === "register" && <RegisterForm loading={loading} submit={submit} go={setView} setNotice={setNotice} />}
        {view === "verify" && <VerifyForm loading={loading} submit={submit} go={setView} setNotice={setNotice} />}
        {view === "forgot" && <ForgotForm loading={loading} submit={submit} go={setView} setNotice={setNotice} />}
        {view === "reset" && <ResetForm loading={loading} submit={submit} go={setView} setNotice={setNotice} />}

        {notice && (
          <div className={`notice ${notice.type}`}>
            <span>{notice.type === "success" ? "✓" : "!"}</span>
            <div><strong>{notice.text}</strong>{notice.code && <small>{notice.code}</small>}</div>
          </div>
        )}

        <footer>
          {view === "login" ? <p>Chưa có tài khoản? <button onClick={() => setView("register")}>Đăng ký</button></p> : <button className="back" onClick={() => setView("login")}>← Quay lại đăng nhập</button>}
        </footer>
      </section>
    </main>
  );
}

const titles = {
  login: { title: "Chào mừng trở lại", subtitle: "Đăng nhập để tiếp tục hành trình học tiếng Hàn." },
  register: { title: "Tạo tài khoản", subtitle: "Bắt đầu học từ vựng với flashcard mỗi ngày." },
  verify: { title: "Xác minh email", subtitle: "Nhập mã 6 chữ số đã được gửi đến email của bạn." },
  forgot: { title: "Quên mật khẩu?", subtitle: "Nhập email để nhận mã khôi phục tài khoản." },
  reset: { title: "Đặt mật khẩu mới", subtitle: "Nhập mã trong email và chọn mật khẩu mới." },
};

function LoginForm({ loading, submit, setUser, go, setNotice }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const googleButton = useRef(null);

  function saveSession(data) {
    localStorage.setItem("kits_access_token", data.accessToken);
    localStorage.setItem("kits_user", JSON.stringify(data.user));
    setUser(data.user);
  }

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    let attempts = 0;
    const render = () => {
      if (cancelled || !googleButton.current) return;
      if (!window.google?.accounts?.id) {
        if (attempts++ < 50) window.setTimeout(render, 100);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: ({ credential }) => submit(async () => {
          const data = await api("/auth/google", { idToken: credential });
          saveSession(data);
        }),
      });
      googleButton.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButton.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: 362,
        locale: "vi",
      });
    };
    render();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <form onSubmit={(event) => { event.preventDefault(); submit(async () => {
        const data = await api("/auth/login", { username, password });
        saveSession(data);
      }); }}>
        <Field label="Tên tài khoản" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nhập username" autoComplete="username" required />
        <Field label="Mật khẩu" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập mật khẩu" autoComplete="current-password" required />
        <button className="text-action forgot-link" type="button" onClick={() => { setNotice(null); go("forgot"); }}>Quên mật khẩu?</button>
        <Submit loading={loading}>Đăng nhập</Submit>
      </form>
      <div className="divider"><span>hoặc</span></div>
      {GOOGLE_CLIENT_ID ? (
        <div className="google-button" ref={googleButton} aria-label="Tiếp tục với Google" />
      ) : (
        <button className="google-placeholder" type="button" onClick={() => setNotice({ type: "error", text: "Google Login chưa được cấu hình. Hãy thêm GOOGLE_CLIENT_ID vào file .env rồi build lại frontend." })}>
          <GoogleIcon />
          Tiếp tục với Google
        </button>
      )}
    </>
  );
}

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.55l3.34-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.78.5 3.82 1.49l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.95 5.45l3.34 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>;
}

function RegisterForm({ loading, submit, go, setNotice }) {
  const [form, setForm] = useState({ username: "", displayName: "", email: "", password: "" });
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  return (
    <form onSubmit={(event) => { event.preventDefault(); submit(async () => {
      await api("/auth/register", form);
      sessionStorage.setItem("kits_pending_email", form.email);
      go("verify");
      setNotice({ type: "success", text: "Đăng ký thành công. Hãy kiểm tra email để lấy mã." });
    }); }}>
      <div className="field-row">
        <Field label="Tên tài khoản" value={form.username} onChange={update("username")} placeholder="Ví dụ: minji" required />
        <Field label="Tên hiển thị" value={form.displayName} onChange={update("displayName")} placeholder="Tên của bạn" required />
      </div>
      <Field label="Email" type="email" value={form.email} onChange={update("email")} placeholder="you@gmail.com" autoComplete="email" required />
      <Field label="Mật khẩu" type="password" value={form.password} onChange={update("password")} placeholder="Tối thiểu 8 ký tự" minLength="8" autoComplete="new-password" required />
      <Submit loading={loading}>Đăng ký</Submit>
    </form>
  );
}

function VerifyForm({ loading, submit, go, setNotice }) {
  const [email, setEmail] = useState(() => sessionStorage.getItem("kits_pending_email") || "");
  const [code, setCode] = useState("");
  return (
    <form onSubmit={(event) => { event.preventDefault(); submit(async () => {
      const data = await api("/auth/verify-email", { email, code });
      go("login");
      setNotice({ type: "success", text: `${data.message}. Bạn có thể đăng nhập.` });
    }); }}>
      <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" required />
      <Field label="Mã xác minh" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" maxLength="6" required />
      <Submit loading={loading}>Xác minh</Submit>
    </form>
  );
}

function ForgotForm({ loading, submit, go, setNotice }) {
  const [email, setEmail] = useState("");
  return (
    <form onSubmit={(event) => { event.preventDefault(); submit(async () => {
      const data = await api("/auth/forgot-password", { email });
      sessionStorage.setItem("kits_reset_email", email);
      go("reset");
      setNotice({ type: "success", text: data.message });
    }); }}>
      <Field label="Email đã đăng ký" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" required hint="Chúng tôi sẽ gửi mã 6 chữ số đến email này." />
      <Submit loading={loading}>Gửi mã khôi phục</Submit>
    </form>
  );
}

function ResetForm({ loading, submit, go, setNotice }) {
  const [form, setForm] = useState({ email: sessionStorage.getItem("kits_reset_email") || "", code: "", newPassword: "" });
  const update = (key) => (event) => setForm({ ...form, [key]: key === "code" ? event.target.value.replace(/\D/g, "").slice(0, 6) : event.target.value });
  return (
    <form onSubmit={(event) => { event.preventDefault(); submit(async () => {
      const data = await api("/auth/reset-password", form);
      localStorage.removeItem("kits_access_token");
      localStorage.removeItem("kits_user");
      go("login");
      setNotice({ type: "success", text: data.message });
    }); }}>
      <Field label="Email" type="email" value={form.email} onChange={update("email")} placeholder="you@gmail.com" required />
      <Field label="Mã khôi phục" value={form.code} onChange={update("code")} placeholder="000000" inputMode="numeric" maxLength="6" required />
      <Field label="Mật khẩu mới" type="password" value={form.newPassword} onChange={update("newPassword")} placeholder="Tối thiểu 8 ký tự" minLength="8" required />
      <Submit loading={loading}>Đổi mật khẩu</Submit>
    </form>
  );
}

function Submit({ loading, children }) {
  return <button className="primary" type="submit" disabled={loading}>{loading ? <><span className="spinner" />Đang xử lý...</> : children}</button>;
}

export default App;
