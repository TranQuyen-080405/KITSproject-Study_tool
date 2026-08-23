import { FormEvent, useEffect, useRef, useState } from "react";
import { authService } from "../services/auth.service";
import type { Account } from "../types/auth";
import "../styles/app.css";

export type { Account };

type LoginPageProps = { onLogin: (account: Account) => void };
type AuthMode = "login" | "register" | "verify-email" | "forgot" | "reset";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

export function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleButton = useRef<HTMLDivElement>(null);
  const onLoginRef = useRef(onLogin);
  onLoginRef.current = onLogin;

  useEffect(() => {
    if (mode !== "login" || !GOOGLE_CLIENT_ID) return;

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
        callback: ({ credential }) => {
          void (async () => {
            setIsSubmitting(true);
            setError("");
            setInfo("");
            try {
              onLoginRef.current(await authService.loginWithGoogle({ idToken: credential }));
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : "Không thể đăng nhập Google.");
            } finally {
              setIsSubmitting(false);
            }
          })();
        },
      });

      googleButton.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButton.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: 340,
        locale: "vi",
      });
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  function switchMode(next: AuthMode) {
    setMode(next);
    setError("");
    setInfo("");
    if (next === "verify-email") {
      setEmail((current) => current || sessionStorage.getItem("kits_pending_email") || "");
    }
    if (next === "reset") {
      setEmail((current) => current || sessionStorage.getItem("kits_reset_email") || "");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setInfo("");

    try {
      if (mode === "login") {
        onLogin(await authService.login({ username, password }));
        return;
      }

      if (mode === "register") {
        await authService.register({
          username,
          email,
          password,
          displayName: displayName || username,
        });
        sessionStorage.setItem("kits_pending_email", email);
        setPassword("");
        switchMode("verify-email");
        setInfo("Đăng ký thành công. Nhập mã OTP đã gửi tới email.");
        return;
      }

      if (mode === "verify-email") {
        await authService.verifyEmail({ email, code });
        setCode("");
        switchMode("login");
        setInfo("Xác minh email thành công. Hãy đăng nhập.");
        return;
      }

      if (mode === "forgot") {
        const result = await authService.forgotPassword({ email });
        sessionStorage.setItem("kits_reset_email", email);
        switchMode("reset");
        setInfo(result.message);
        return;
      }

      const result = await authService.resetPassword({ email, code, newPassword });
      setCode("");
      setNewPassword("");
      switchMode("login");
      setInfo(result.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể hoàn tất.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const title =
    mode === "login"
      ? "Đăng nhập"
      : mode === "register"
        ? "Tạo tài khoản"
        : mode === "verify-email"
          ? "Xác minh email"
          : mode === "forgot"
            ? "Quên mật khẩu"
            : "Đặt mật khẩu mới";

  const canSubmit =
    mode === "login"
      ? Boolean(username.trim() && password)
      : mode === "register"
        ? Boolean(username.trim() && email.trim() && password.length >= 8)
        : mode === "verify-email"
          ? Boolean(email.trim() && code.trim().length === 6)
          : mode === "forgot"
            ? Boolean(email.trim())
            : Boolean(email.trim() && code.trim().length === 6 && newPassword.length >= 8);

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <p className="eyebrow">HARU LEARNING</p>
        <h1>{title}</h1>
        {mode === "login" ? <p>Đăng nhập để lưu tiến độ học theo tài khoản của bạn.</p> : null}
        {mode === "register" ? <p>Mật khẩu tối thiểu 8 ký tự. Sau đăng ký cần xác minh email.</p> : null}
        {mode === "verify-email" ? <p>Nhập mã 6 chữ số gửi tới email của bạn.</p> : null}
        {mode === "forgot" ? <p>Nhập email đã đăng ký để nhận mã khôi phục.</p> : null}
        {mode === "reset" ? <p>Nhập mã trong email và chọn mật khẩu mới.</p> : null}

        {mode === "login" || mode === "register" ? (
          <label>
            Tên đăng nhập
            <input onChange={(event) => setUsername(event.target.value)} value={username} />
          </label>
        ) : null}

        {mode === "register" ? (
          <label>
            Tên hiển thị
            <input onChange={(event) => setDisplayName(event.target.value)} value={displayName} />
          </label>
        ) : null}

        {mode === "register" || mode === "verify-email" || mode === "forgot" || mode === "reset" ? (
          <label>
            Email
            <input
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>
        ) : null}

        {mode === "login" || mode === "register" ? (
          <label>
            Mật khẩu
            <input
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              value={password}
            />
          </label>
        ) : null}

        {mode === "reset" ? (
          <label>
            Mật khẩu mới
            <input
              onChange={(event) => setNewPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              value={newPassword}
            />
          </label>
        ) : null}

        {mode === "verify-email" || mode === "reset" ? (
          <label>
            Mã OTP
            <input
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              value={code}
            />
          </label>
        ) : null}

        {mode === "login" || mode === "register" || mode === "reset" ? (
          <label className="login-checkbox">
            <input
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
              type="checkbox"
            />
            Hiện mật khẩu
          </label>
        ) : null}

        {mode === "login" ? (
          <button
            className="login-text-link login-text-link-right"
            disabled={isSubmitting}
            onClick={() => switchMode("forgot")}
            type="button"
          >
            quên mật khẩu?
          </button>
        ) : null}

        {info ? <p className="page-status">{info}</p> : null}
        {error ? <p className="page-status page-status-error">{error}</p> : null}

        <button disabled={isSubmitting || !canSubmit} type="submit">
          {isSubmitting
            ? "Đang xử lý..."
            : mode === "login"
              ? "Đăng nhập"
              : mode === "register"
                ? "Tạo tài khoản"
                : mode === "verify-email"
                  ? "Xác minh email"
                  : mode === "forgot"
                    ? "Gửi mã khôi phục"
                    : "Đổi mật khẩu"}
        </button>

        {mode === "login" ? (
          <>
            <div className="login-divider">
              <span>hoặc</span>
            </div>
            {GOOGLE_CLIENT_ID ? (
              <div aria-label="Tiếp tục với Google" className="login-google-button" ref={googleButton} />
            ) : (
              <button
                className="login-google-fallback"
                disabled={isSubmitting}
                onClick={() =>
                  setError("Google Login chưa được cấu hình. Thêm VITE_GOOGLE_CLIENT_ID rồi chạy lại web.")
                }
                type="button"
              >
                Tiếp tục với Google
              </button>
            )}
          </>
        ) : null}

        <div className="login-footer-links">
          {mode === "login" ? (
            <button
              className="login-text-link login-text-link-right"
              disabled={isSubmitting}
              onClick={() => switchMode("register")}
              type="button"
            >
              tạo tài khoản
            </button>
          ) : (
            <button
              className="login-text-link login-text-link-right"
              disabled={isSubmitting}
              onClick={() => switchMode("login")}
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
