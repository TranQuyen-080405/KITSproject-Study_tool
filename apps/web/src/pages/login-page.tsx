import { FormEvent, useState } from "react";
import "../styles/app.css";

export type Account = { userId: string; username: string; displayName: string; token: string };

type LoginPageProps = { onLogin: (account: Account) => void };

export function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("user demo");
  const [password, setPassword] = useState("1234");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function applySession(response: Response) {
    const body = await response.json() as { token?: string; user?: Omit<Account, "token">; error?: string };
    if (!response.ok || !body.user || !body.token) throw new Error(body.error ?? "Không thể đăng nhập.");
    onLogin({ ...body.user, token: body.token });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      await applySession(response);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể hoàn tất.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function continueAsGuest() {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/guest", { method: "POST" });
      await applySession(response);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể vào tài khoản khách.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <p className="eyebrow">HARU LEARNING</p>
        <h1>{mode === "login" ? "Đăng nhập" : "Thêm tài khoản"}</h1>
        {mode === "login" ? (
          <p>Đăng nhập để lưu tiến độ học theo tài khoản của bạn.</p>
        ) : null}
        <label>
          Tên đăng nhập
          <input onChange={(event) => setUsername(event.target.value)} value={username} />
        </label>
        <label>
          Mật khẩu
          <input
            onChange={(event) => setPassword(event.target.value)}
            type={showPassword ? "text" : "password"}
            value={password}
          />
        </label>
        <label className="login-checkbox">
          <input
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
            type="checkbox"
          />
          Hiện mật khẩu
        </label>
        {error ? <p className="page-status page-status-error">{error}</p> : null}
        <button disabled={isSubmitting || !username.trim() || !password} type="submit">
          {isSubmitting
            ? "Đang xử lý..."
            : mode === "login"
              ? "Đăng nhập"
              : "Tạo tài khoản"}
        </button>
        <div className="login-footer-links">
          {mode === "login" ? (
            <>
              <button
                className="login-text-link"
                disabled={isSubmitting}
                onClick={continueAsGuest}
                type="button"
              >
                tài khoản khách
              </button>
              <button
                className="login-text-link"
                disabled={isSubmitting}
                onClick={() => {
                  setMode("register");
                  setUsername("");
                  setPassword("");
                  setError("");
                }}
                type="button"
              >
                tạo tài khoản
              </button>
            </>
          ) : (
            <button
              className="login-text-link login-text-link-right"
              disabled={isSubmitting}
              onClick={() => {
                setMode("login");
                setUsername("user demo");
                setPassword("1234");
                setError("");
              }}
              type="button"
            >
              đăng nhập
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
