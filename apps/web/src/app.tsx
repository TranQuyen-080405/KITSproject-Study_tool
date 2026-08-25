// This file selects the initial page rendered by the React web client.
import { useState } from "react";
import { AccountBadge } from "./components/account-badge";
import { AppPage } from "./components/app-sidebar";
import { ChatbotPage } from "./pages/chatbot-page";
import { DashboardPage } from "./pages/dashboard-page";
import { LessonPage } from "./pages/lesson-page";
import { McqPage } from "./pages/mcq-page";
import { ResultPage } from "./pages/result-page";
import { LoginPage } from "./pages/login-page";
import { authService } from "./services/auth.service";
import type { Account } from "./types/auth";

export function App() {
  const [account, setAccount] = useState<Account | undefined>(() => {
    const stored = localStorage.getItem("haru-account");
    if (!stored) return undefined;
    try {
      const parsed = JSON.parse(stored) as Partial<Account>;
      if (typeof parsed.accessToken !== "string" || typeof parsed.id !== "number") {
        localStorage.removeItem("haru-account");
        return undefined;
      }
      return parsed as Account;
    } catch {
      localStorage.removeItem("haru-account");
      return undefined;
    }
  });
  const [activePage, setActivePage] = useState<AppPage>("lessons");
  const [selectedLessonId, setSelectedLessonId] = useState<string>();
  const [result, setResult] = useState({ correctCount: 0, totalCount: 0 });

  function saveAccount(user: Account) {
    localStorage.setItem("haru-account", JSON.stringify(user));
    setAccount(user);
  }

  async function clearAccount() {
    try {
      await authService.logout();
    } catch {
      // Local logout still proceeds if the gateway/user-service is offline.
    }
    localStorage.removeItem("haru-account");
    setAccount(undefined);
  }

  if (!account) {
    return <LoginPage onLogin={saveAccount} />;
  }

  const badge = <AccountBadge account={account} onLogout={() => void clearAccount()} />;

  if (activePage === "chatbot") return <>{badge}<ChatbotPage onNavigate={setActivePage} userId={account.id} /></>;
  if (activePage === "dashboard") return <>{badge}<DashboardPage onNavigate={setActivePage} token={account.accessToken} userId={account.id} /></>;

  if (activePage === "mcq" && selectedLessonId) {
    return <>{badge}<McqPage
      lessonId={selectedLessonId}
      userId={account.id}
      accessToken={account.accessToken}
      onComplete={(correctCount, totalCount) => {
        setResult({ correctCount, totalCount });
        setActivePage("result");
      }}
      onNavigate={setActivePage}
    /></>;
  }
  if (activePage === "result") {
    return <>{badge}<ResultPage {...result} onExit={() => setActivePage("lessons")} onRetry={() => setActivePage("mcq")} /></>;
  }

  return (
    <>{badge}<LessonPage
      onNavigate={setActivePage}
      onSelectLesson={(lessonId) => {
        setSelectedLessonId(lessonId);
        setActivePage("mcq");
      }}
    /></>
  );
}
