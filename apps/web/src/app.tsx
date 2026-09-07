import { useEffect, useState } from "react";
import bg1 from "../../../assets/images/background-1.jpg";
import bg2 from "../../../assets/images/background-2.jpg";
import bg3 from "../../../assets/images/background-3.jpg";
import { AppPage } from "./components/app-sidebar";
import { ChatbotPage } from "./pages/chatbot-page";
import { DashboardPage } from "./pages/dashboard-page";
import { VocabReviewPage } from "./pages/vocab-review-page";
import { LessonPage } from "./pages/lesson-page";
import { ManageContentPage } from "./pages/manage-content-page";
import { McqPage } from "./pages/mcq-page";
import { ResultPage } from "./pages/result-page";
import { LoginPage } from "./pages/login-page";
import { authService } from "./services/auth.service";
import type { ReviewRecord } from "./api/analytics-api";
import type { Account } from "./types/auth";
import "./styles/app.css";

export function App() {
  // Inject Background Images into CSS Variables & Enforce Global Liquid Glass Dark Theme
  useEffect(() => {
    document.documentElement.style.setProperty("--bg-image-1", `url('${bg1}')`);
    document.documentElement.style.setProperty("--bg-image-2", `url('${bg2}')`);
    document.documentElement.style.setProperty("--bg-image-3", `url('${bg3}')`);

    // Lock Global Dark Theme & Liquid Glass Properties
    document.documentElement.dataset.theme = "dark";
    document.body.dataset.background = localStorage.getItem("haru-bg") || "background-1";
    document.documentElement.style.setProperty("--glass-opacity-val", "0.50");
    document.documentElement.style.setProperty("--glass-blur-val", "6px");

    // Prevent Ctrl + Mouse Wheel Zooming
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    // Prevent Ctrl + Key ('+', '-', '=', '0') Zooming
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0"].includes(e.key)) {
        e.preventDefault();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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

  const [activePage, setActivePageState] = useState<AppPage>(() => {
    const saved = localStorage.getItem("haru-active-page") as AppPage | null;
    const validPages: AppPage[] = ["lessons", "mcq", "result", "manage-content", "dashboard", "chatbot", "review"];
    return saved && validPages.includes(saved) ? saved : "lessons";
  });
  const [selectedLessonId, setSelectedLessonIdState] = useState<string | undefined>(() => {
    return localStorage.getItem("haru-selected-lesson-id") || undefined;
  });
  const [result, setResult] = useState({ correctCount: 0, totalCount: 0, reviewsRecorded: 0, reviewsSyncFailed: 0 });
  const [reviewSession, setReviewSession] = useState<{ items: ReviewRecord[]; startIndex: number } | null>(null);

  function setActivePage(page: AppPage) {
    localStorage.setItem("haru-active-page", page);
    setActivePageState(page);
  }

  function setSelectedLessonId(lessonId: string | undefined) {
    if (lessonId) {
      localStorage.setItem("haru-selected-lesson-id", lessonId);
    } else {
      localStorage.removeItem("haru-selected-lesson-id");
    }
    setSelectedLessonIdState(lessonId);
  }

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
    localStorage.removeItem("haru-active-page");
    localStorage.removeItem("haru-selected-lesson-id");
    setAccount(undefined);
  }

  if (!account) {
    return <LoginPage onLogin={saveAccount} />;
  }

  const handleLogout = () => void clearAccount();

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
    return (
      <ResultPage
        account={account}
        correctCount={result.correctCount}
        onExit={() => setActivePage("lessons")}
        onLogout={handleLogout}
        onNavigate={setActivePage}
        onRetry={() => setActivePage("mcq")}
        reviewsRecorded={result.reviewsRecorded}
        reviewsSyncFailed={result.reviewsSyncFailed}
        totalCount={result.totalCount}
      />
    );
  }

  return (
    <LessonPage
      account={account}
      onLogout={handleLogout}
      onNavigate={setActivePage}
      onSelectLesson={(lessonId) => {
        setSelectedLessonId(lessonId);
        setActivePage("mcq");
      }}
    />
  );
}
