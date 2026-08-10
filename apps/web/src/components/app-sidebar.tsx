// This component provides the shared primary navigation for future web pages.
import { useState } from "react";
import logoUrl from "../../../../assets/icons/logo-1.png";

export type AppPage = "lessons" | "chatbot" | "dashboard" | "mcq" | "result";

type NavigationItem = {
  page?: AppPage;
  label: string;
  isComingSoon?: boolean;
};

const navigationItems: NavigationItem[] = [
  { page: "lessons", label: "Bài học" },
  { page: "chatbot", label: "Chatbot" },
  { page: "dashboard", label: "Dashboard" },
];

type AppSidebarProps = {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
};

export function AppSidebar({ activePage, onNavigate }: AppSidebarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  function setTheme(theme: "light" | "dark") {
    document.documentElement.dataset.theme = theme;
  }

  function setBackground(background: "none" | "background-1" | "background-2" | "background-3") {
    document.body.dataset.background = background;
  }

  return (
    <aside className="app-sidebar">
      <a className="brand" href="/" aria-label="Haru Haru home">
        <img alt="" className="brand-logo" src={logoUrl} />
        <span>Haru Learning</span>
      </a>

      <nav aria-label="Điều hướng chính">
        <ul className="navigation-list">
          {navigationItems.map(({ page, label, isComingSoon }) => (
            <li key={label}>
              <button
                aria-current={page === activePage ? "page" : undefined}
                className={`navigation-item${page === activePage ? " navigation-item-active" : ""}`}
                disabled={isComingSoon}
                onClick={() => page && onNavigate(page)}
                type="button"
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-settings">
        <button
          aria-expanded={isSettingsOpen}
          aria-haspopup="dialog"
          aria-label="Mở cài đặt giao diện"
          className="settings-trigger"
          onClick={() => setIsSettingsOpen((isOpen) => !isOpen)}
          type="button"
        >
          ⚙
        </button>

        {isSettingsOpen ? (
          <section aria-label="Cài đặt giao diện" className="settings-popover">
            <h2>Cài đặt</h2>
            <p className="settings-label">Giao diện</p>
            <div className="settings-options">
              <button onClick={() => setTheme("light")} type="button">Light</button>
              <button onClick={() => setTheme("dark")} type="button">Dark</button>
            </div>
            <p className="settings-label">Hình nền</p>
            <div className="settings-options">
              <button onClick={() => setBackground("background-1")} type="button">Mặc định</button>
              <button onClick={() => setBackground("background-2")} type="button">Nền 2</button>
              <button onClick={() => setBackground("background-3")} type="button">Nền 3</button>
              <button onClick={() => setBackground("none")} type="button">Không nền</button>
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
