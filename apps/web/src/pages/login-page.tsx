import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeftIcon2D, EyeIcon2D, EyeOffIcon2D, GoogleLogo2D } from "../components/icons";
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
        width: 320,
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
        setInfo("Đăng ký thành công! Nhập mã OTP 6 chữ số đã gửi tới email.");
        return;
      }

      if (mode === "verify-email") {
        await authService.verifyEmail({ email, code });
        setCode("");
        switchMode("login");
        setInfo("Xác minh email thành công! Bạn có thể đăng nhập ngay.");
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
      setError(reason instanceof Error ? reason.message : "Không thể hoàn tất yêu cầu.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
        {(mode === "verify-email" || mode === "forgot" || mode === "reset") && (
          <div style={{ textAlign: "center", marginBottom: "8px" }}>
            <h1 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>
              {mode === "verify-email"
                ? "Xác minh Email OTP"
                : mode === "forgot"
                  ? "Quên mật khẩu"
                  : "Đặt lại mật khẩu"}
            </h1>
          </div>
        )}

        {(mode === "login" || mode === "register") && (
          <div className="auth-tab-container">
            <button
              className={`auth-tab-btn ${mode === "login" ? "active" : ""}`}
              onClick={() => switchMode("login")}
              type="button"
            >
              Đăng nhập
            </button>
            <button
              className={`auth-tab-btn ${mode === "register" ? "active" : ""}`}
              onClick={() => switchMode("register")}
              type="button"
            >
              Đăng ký
            </button>
            <div className={`auth-tab-underline ${mode === "register" ? "register-active" : "login-active"}`} />
          </div>
        )}

        {(mode === "login" || mode === "register") && (
          <input
            aria-label="Tên đăng nhập"
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Tên đăng nhập"
            required
            value={username}
          />
        )}

        <div className={`auth-expandable-field ${mode === "register" ? "expanded" : ""}`}>
          <div>
            <input
              aria-label="Tên hiển thị"
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tên hiển thị"
              value={displayName}
            />
            <input
              aria-label="Địa chỉ Email"
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Địa chỉ Email"
              required={mode === "register"}
              type="email"
              value={email}
            />
          </div>
        </div>

        {(mode === "verify-email" || mode === "forgot" || mode === "reset") && (
          <input
            aria-label="Địa chỉ Email"
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Địa chỉ Email"
            required
            type="email"
            value={email}
          />
        )}

        {(mode === "login" || mode === "register") && (
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              aria-label="Mật khẩu"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              required
              style={{ paddingRight: "36px" }}
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              onClick={() => setShowPassword((prev) => !prev)}
              style={{ position: "absolute", right: "8px", background: "none", border: 0, color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "2px" }}
              type="button"
            >
              {showPassword ? <EyeOffIcon2D size={16} /> : <EyeIcon2D size={16} />}
            </button>
          </div>
        )}

        {mode === "reset" && (
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              aria-label="Mật khẩu mới"
              autoComplete="new-password"
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mật khẩu mới"
              required
              style={{ paddingRight: "36px" }}
              type={showPassword ? "text" : "password"}
              value={newPassword}
            />
            <button
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              onClick={() => setShowPassword((prev) => !prev)}
              style={{ position: "absolute", right: "8px", background: "none", border: 0, color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "2px" }}
              type="button"
            >
              {showPassword ? <EyeOffIcon2D size={16} /> : <EyeIcon2D size={16} />}
            </button>
          </div>
        )}

        {(mode === "verify-email" || mode === "reset") && (
          <input
            aria-label="Mã OTP 6 chữ số"
            inputMode="numeric"
            maxLength={6}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Mã OTP 6 chữ số"
            required
            style={{ letterSpacing: code ? "0.25em" : "normal", textAlign: "center", fontSize: code ? "16px" : "13.5px", fontWeight: "700" }}
            value={code}
          />
        )}

        <div className={`auth-forgot-field ${mode === "login" ? "expanded" : ""}`}>
          <div>
            <button
              className="interactive-element"
              onClick={() => switchMode("forgot")}
              style={{ background: "none", border: 0, color: "var(--brand-primary)", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
              type="button"
            >
              Quên mật khẩu?
            </button>
          </div>
        </div>

        {info && <p className="page-status page-status-success" style={{ padding: "6px 10px", fontSize: "12px" }}>{info}</p>}
        {error && <p className="page-status page-status-error" style={{ padding: "6px 10px", fontSize: "12px" }}>{error}</p>}

        <button
          className="login-primary-button interactive-element"
          disabled={isSubmitting || !canSubmit}
          style={{ padding: "8px 14px", marginTop: "4px" }}
          type="submit"
        >
          <div className="auth-btn-label-wrapper">
            <span className={`auth-btn-label ${mode === "login" ? "active-mode" : "hidden-mode"}`}>
              {isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
            </span>
            <span className={`auth-btn-label ${mode === "register" ? "active-mode" : "hidden-mode"}`}>
              {isSubmitting ? "Đang xử lý..." : "Tạo tài khoản"}
            </span>
            {mode !== "login" && mode !== "register" && (
              <span className="auth-btn-label active-mode">
                {isSubmitting
                  ? "Đang xử lý..."
                  : mode === "verify-email"
                    ? "Xác minh OTP"
                    : mode === "forgot"
                      ? "Gửi mã OTP"
                      : "Cập nhật mật khẩu"}
              </span>
            )}
          </div>
        </button>

        <div className={`auth-expandable-field ${mode === "login" || mode === "register" ? "expanded" : ""}`}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-muted)", fontSize: "11px", margin: "2px 0" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border-glass)" }} />
              <span>hoặc</span>
              <div style={{ flex: 1, height: "1px", background: "var(--border-glass)" }} />
            </div>

            {GOOGLE_CLIENT_ID ? (
              <div aria-label="Đăng nhập bằng Google" ref={googleButton} style={{ display: "flex", justifyContent: "center" }} />
            ) : (
              <button
                className="manage-secondary-button interactive-element"
                disabled={isSubmitting}
                onClick={() => setError("Google Client ID chưa được cấu hình.")}
                style={{ width: "100%", minHeight: "36px", padding: "6px 12px", justifyContent: "center", gap: "8px", fontSize: "13px" }}
                type="button"
              >
                <GoogleLogo2D size={16} />
                <span>Tiếp tục với Google</span>
              </button>
            )}
          </div>
        </div>

        <div className={`auth-expandable-field ${mode !== "login" && mode !== "register" ? "expanded" : ""}`}>
          <div>
            <div style={{ textAlign: "center", marginTop: "2px" }}>
              <button
                className="interactive-element"
                onClick={() => switchMode("login")}
                style={{ background: "none", border: 0, color: "var(--brand-primary)", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                type="button"
              >
                <ArrowLeftIcon2D size={13} />
                <span>Quay lại Đăng nhập</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
