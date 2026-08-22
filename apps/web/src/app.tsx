// This file selects the initial page rendered by the React web client.
import { useState } from "react";
import { AccountBadge } from "./components/account-badge";
import { AppPage } from "./components/app-sidebar";
import { ChatbotPage } from "./pages/chatbot-page";
import { DashboardPage } from "./pages/dashboard-page";
import { LessonPage } from "./pages/lesson-page";
import { McqPage } from "./pages/mcq-page";
import { ResultPage } from "./pages/result-page";
import { Account, LoginPage } from "./pages/login-page";

export function App() {
  const [account, setAccount] = useState<Account | undefined>(() => {
    const stored = localStorage.getItem("haru-account");
    return stored ? JSON.parse(stored) as Account : undefined;
  });
  const [activePage, setActivePage] = useState<AppPage>("lessons");
  const [selectedLessonId, setSelectedLessonId] = useState("lesson-1");
  const [result, setResult] = useState({ correctCount: 0, totalCount: 0 });

  function saveAccount(user: Account) {
    localStorage.setItem("haru-account", JSON.stringify(user));
    setAccount(user);
  }

  function clearAccount() {
    localStorage.removeItem("haru-account");
    setAccount(undefined);
  }

  if (!account) {
    return <LoginPage onLogin={saveAccount} />;
  }

  const badge = <AccountBadge account={account} onLogout={clearAccount} />;

  if (activePage === "chatbot") return <>{badge}<ChatbotPage onNavigate={setActivePage} /></>;
  if (activePage === "dashboard") return <>{badge}<DashboardPage onNavigate={setActivePage} token={account.token} /></>;

  if (activePage === "mcq") {
    return <>{badge}<McqPage
      lessonId={selectedLessonId}
      token={account.token}
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
