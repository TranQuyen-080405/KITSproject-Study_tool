import { useEffect, useState, type ReactNode } from "react";
import logoUrl from "../../../../assets/icons/logo-1.png";
import type { Account } from "../types/auth";
import {
  BookIcon2D,
  BotIcon2D,
  ChartIcon2D,
  CheckIcon2D,
  EditIcon2D,
  LogoutIcon2D,
  SettingsIcon2D,
} from "./icons";

export type AppPage =
  | "lessons"
  | "manage-content"
  | "chatbot"
  | "dashboard"
  | "mcq"
  | "result"
  | "review";

type NavigationItem = {
  page: AppPage;
  label: string;
  icon: ReactNode;
};

const navigationItems: NavigationItem[] = [
  { page: "lessons", label: "Bài học", icon: <BookIcon2D size={18} /> },
  { page: "manage-content", label: "Soạn bài", icon: <EditIcon2D size={18} /> },
  { page: "chatbot", label: "Trợ lý AI", icon: <BotIcon2D size={18} /> },
  { page: "dashboard", label: "Bảng thống kê", icon: <ChartIcon2D size={18} /> },
];

export type AppSidebarProps = {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  account?: Account;
  onLogout?: () => void;
};

export function AppSidebar({ activePage, onNavigate, account, onLogout }: AppSidebarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentBg, setCurrentBg] = useState<string>(() => localStorage.getItem("haru-bg") || "background-1");

  useEffect(() => {
    document.body.dataset.background = currentBg;
    localStorage.setItem("haru-bg", currentBg);
  }, [currentBg]);

  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.setProperty("--glass-opacity-val", "0.50");
    document.documentElement.style.setProperty("--glass-blur-val", "6px");
    localStorage.setItem("haru-theme", "dark");
  }, []);

  const avatarInitial = (account?.displayName || account?.username || "U").charAt(0).toUpperCase();

  return (
    <aside className="app-sidebar">
      <a className="brand" href="/" onClick={(e) => { e.preventDefault(); onNavigate("lessons"); }} aria-label="Trang chủ">
        <img alt="Haru" className="brand-logo-img" src={logoUrl} />
      </a>

      <nav aria-label="Điều hướng chính" style={{ flex: 1 }}>
        <ul className="navigation-list">
          {navigationItems.map(({ page, label, icon }) => {
            const isActive = page === activePage;
            return (
              <li key={page}>
                <button
                  aria-current={isActive ? "page" : undefined}
                  className={`navigation-item${isActive ? " navigation-item-active" : ""}`}
                  onClick={() => onNavigate(page)}
                  type="button"
                >
                  <span aria-hidden="true" style={{ display: "flex", alignItems: "center" }}>{icon}</span>
                  <span>{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Gọn góc trái dưới: Icon Cài đặt & Thông tin tài khoản */}
      <div className="sidebar-footer">
        <button
          aria-expanded={isSettingsOpen}
          aria-haspopup="dialog"
          aria-label="Cài đặt tài khoản & giao diện"
          className="sidebar-settings-icon-button interactive-element"
          onClick={() => setIsSettingsOpen((isOpen) => !isOpen)}
          type="button"
        >
          <div className="account-avatar-sm">{avatarInitial}</div>
          <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left", fontSize: "13px", fontWeight: 700 }}>
            {account?.displayName || account?.username || "Tài khoản"}
          </div>
          <SettingsIcon2D size={18} style={{ opacity: 0.85, flexShrink: 0 }} />
        </button>

        {isSettingsOpen ? (
          <section aria-label="Cài đặt tài khoản & giao diện" className="settings-popover">
            {/* 1. Phần Tài Khoản */}
            <h2 style={{ fontSize: "11px", fontWeight: 800, margin: "0 0 4px", color: "var(--brand-primary)", letterSpacing: "0.05em" }}>
              TÀI KHOẢN
            </h2>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "8px 10px", background: "rgba(0, 0, 0, 0.04)", border: "1px solid var(--border-glass-subtle)", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                <div className="account-avatar-sm">{avatarInitial}</div>
                <div style={{ overflow: "hidden" }}>
                  <div className="settings-account-name" style={{ fontSize: "13px", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {account?.displayName || "Người dùng"}
                  </div>
                  <div className="settings-account-handle" style={{ fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    @{account?.username || "user"}
                  </div>
                </div>
              </div>

              {onLogout && (
                <button
                  aria-label="Đăng xuất khỏi tài khoản"
                  onClick={onLogout}
                  style={{
                    background: "var(--state-error-bg)",
                    color: "var(--state-error)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    padding: "5px 9px",
                    borderRadius: "var(--radius-md)",
                    fontSize: "11.5px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    whiteSpace: "nowrap"
                  }}
                  type="button"
                >
                  <LogoutIcon2D size={12} /> Thoát
                </button>
              )}
            </div>

            {/* 2. Phần Hình Nền */}
            <h2 style={{ fontSize: "11px", fontWeight: 800, margin: "6px 0 4px", color: "var(--brand-primary)", letterSpacing: "0.05em" }}>
              CHỌN ẢNH NỀN
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <button
                className={`manage-secondary-button${currentBg === "background-1" ? " tag-active" : ""}`}
                onClick={() => setCurrentBg("background-1")}
                style={{ textAlign: "left", fontSize: "12px", padding: "6px 8px", justifyContent: "space-between" }}
                type="button"
              >
                <span>Nền Khung Cảnh 1</span>
                {currentBg === "background-1" && <CheckIcon2D size={14} />}
              </button>
              <button
                className={`manage-secondary-button${currentBg === "background-2" ? " tag-active" : ""}`}
                onClick={() => setCurrentBg("background-2")}
                style={{ textAlign: "left", fontSize: "12px", padding: "6px 8px", justifyContent: "space-between" }}
                type="button"
              >
                <span>Nền Khung Cảnh 2</span>
                {currentBg === "background-2" && <CheckIcon2D size={14} />}
              </button>
              <button
                className={`manage-secondary-button${currentBg === "background-3" ? " tag-active" : ""}`}
                onClick={() => setCurrentBg("background-3")}
                style={{ textAlign: "left", fontSize: "12px", padding: "6px 8px", justifyContent: "space-between" }}
                type="button"
              >
                <span>Nền Khung Cảnh 3</span>
                {currentBg === "background-3" && <CheckIcon2D size={14} />}
              </button>
              <button
                className={`manage-secondary-button${currentBg === "gradient" ? " tag-active" : ""}`}
                onClick={() => setCurrentBg("gradient")}
                style={{ textAlign: "left", fontSize: "12px", padding: "6px 8px", justifyContent: "space-between" }}
                type="button"
              >
                <span>Gradient Tối</span>
                {currentBg === "gradient" && <CheckIcon2D size={14} />}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
