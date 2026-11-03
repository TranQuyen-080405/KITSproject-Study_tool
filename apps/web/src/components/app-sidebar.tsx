import { useEffect, useState, type ReactNode } from "react";
import logoUrl from "../assets/icons/logo-1.png";
import type { Account } from "../types/auth";
import {
  BotIcon2D,
  ChartIcon2D,
  ClockIcon2D,
  LayersIcon2D,
  LogoutIcon2D,
  SettingsIcon2D,
} from "./icons";
import { ReviewBell } from "./review-bell";

export type AppPage =
  | "lessons"
  | "flashcards"
  | "flashcard-detail"
  | "flashcard-study"
  | "manage-content"
  | "chatbot"
  | "dashboard"
  | "schedule"
  | "mcq"
  | "result"
  | "review";

type NavigationItem = {
  page: AppPage;
  label: string;
  icon: ReactNode;
};

const navigationItems: NavigationItem[] = [
  { page: "flashcards", label: "Flashcards", icon: <LayersIcon2D size={18} /> },
  { page: "schedule", label: "Lịch học", icon: <ClockIcon2D size={18} /> },
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
    document.documentElement.dataset.theme = "dark";
    localStorage.setItem("haru-theme", "dark");
  }, []);

  useEffect(() => {
    document.body.dataset.background = currentBg;
    localStorage.setItem("haru-bg", currentBg);
  }, [currentBg]);

  const avatarInitial = (account?.displayName || account?.username || "U").charAt(0).toUpperCase();

  return (
    <aside className={`app-sidebar${isSettingsOpen ? " app-sidebar-settings-open" : ""}`}>
      <a className="brand" href="/" onClick={(e) => { e.preventDefault(); onNavigate("lessons"); }} aria-label="Trang chủ">
        <img alt="Haru" className="brand-logo-img" src={logoUrl} />
      </a>

      <nav aria-label="Điều hướng chính" className="sidebar-nav">
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
      <ReviewBell />

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
          <section aria-label="Cài đặt" className="settings-popover">
            <div className="settings-heading">
              <SettingsIcon2D size={18} />
              <div>
                <h2>Cài đặt</h2>
              </div>
            </div>

            <div className="settings-account-summary">
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
                  aria-label="Đăng xuất"
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

            <div className="settings-group">
              <p className="settings-group-label">NỀN</p>
              <div className="settings-bg-swatches">
                {[
                  ["background-1", "Nền 1"],
                  ["background-2", "Nền 2"],
                  ["background-3", "Nền 3"],
                  ["gradient", "Nền tối"],
                ].map(([value, label]) => (
                  <button
                    aria-label={label}
                    aria-pressed={currentBg === value}
                    className={`settings-bg-swatch${currentBg === value ? " is-active" : ""}`}
                    data-bg={value}
                    key={value}
                    onClick={() => setCurrentBg(value)}
                    type="button"
                  />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
