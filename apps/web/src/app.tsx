import { useEffect, useState, type ReactNode } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import bg1 from "../../../assets/images/background-1.jpg";
import bg2 from "../../../assets/images/background-2.jpg";
import bg3 from "../../../assets/images/background-3.jpg";
import type { StrugglingWord } from "./api/analytics-api";
import { AppPage } from "./components/app-sidebar";
import { ChatbotPage } from "./pages/chatbot-page";
import { ReviewActionsContext } from "./components/review-bell";
import { DashboardPage } from "./pages/dashboard-page";
import { StudySchedulePage } from "./pages/study-schedule-page";
import { VocabReviewPage, type DailyReviewCard } from "./pages/vocab-review-page";
import { FlashcardsPage } from "./pages/flashcards-page";
import { FlashcardDetailPage } from "./pages/flashcard-detail-page";
import { FlashcardStudyPage } from "./pages/flashcard-study-page";
import { LoginPage } from "./pages/login-page";
import { clearSession, loadSession, saveSession } from "./lib/session-storage";
import { isNativeAndroid } from "./lib/runtime";
import { authService } from "./services/auth.service";
import type { Account } from "./types/auth";
import "./styles/app.css";

function parseInitialRoute(): { page: AppPage; deckId?: string } {
  if (typeof window === "undefined") {
    return { page: "flashcards" };
  }
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  const reservedRoutes: AppPage[] = [
    "chatbot",
    "dashboard",
    "schedule",
    "manage-content",
    "flashcards",
    "flashcard-detail",
    "flashcard-study",
    "review",
    "mcq",
    "result",
  ];
  if (path) {
    if (path.startsWith("flashcards/")) {
      const id = path.slice("flashcards/".length);
      if (id) return { page: "flashcard-detail", deckId: id };
    } else if (path.startsWith("flashcard/")) {
      const id = path.slice("flashcard/".length);
      if (id) return { page: "flashcard-detail", deckId: id };
    } else if (path.startsWith("flasscrad/")) {
      const id = path.slice("flasscrad/".length);
      if (id) return { page: "flashcard-detail", deckId: id };
    } else if (!reservedRoutes.includes(path as AppPage)) {
      return { page: "flashcard-detail", deckId: path };
    } else if (reservedRoutes.includes(path as AppPage)) {
      return { page: path as AppPage };
    }
  }

  const saved = localStorage.getItem("haru-active-page") as AppPage | null;
  const validPages: AppPage[] = [
    "flashcards",
    "flashcard-detail",
    "flashcard-study",
    "mcq",
    "result",
    "manage-content",
    "dashboard",
    "schedule",
    "chatbot",
    "review",
  ];
  const initialPage = saved && validPages.includes(saved) ? saved : "flashcards";
  const savedDeckId = localStorage.getItem("haru-selected-deck-id") || undefined;
  return { page: initialPage, deckId: savedDeckId };
}

export function App() {
  // Inject Background Images into CSS Variables & Enforce Global Liquid Glass Dark Theme
  useEffect(() => {
    document.documentElement.style.setProperty("--bg-image-1", `url('${bg1}')`);
    document.documentElement.style.setProperty("--bg-image-2", `url('${bg2}')`);
    document.documentElement.style.setProperty("--bg-image-3", `url('${bg3}')`);

    document.documentElement.dataset.theme = "dark";
    localStorage.setItem("haru-theme", "dark");
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

  const [account, setAccount] = useState<Account>();
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void loadSession()
      .then((stored) => { if (active) setAccount(stored); })
      .finally(() => { if (active) setIsSessionLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const updateSession = (event: Event) => setAccount((event as CustomEvent<Account | undefined>).detail);
    window.addEventListener("haru-session-updated", updateSession);
    return () => window.removeEventListener("haru-session-updated", updateSession);
  }, []);

  const [initialRoute] = useState(() => parseInitialRoute());
  const [activePage, setActivePageState] = useState<AppPage>(initialRoute.page);
  const [selectedDeckId, setSelectedDeckIdState] = useState<string | undefined>(() => {
    return initialRoute.deckId || localStorage.getItem("haru-selected-deck-id") || undefined;
  });
  const [startDeckTest, setStartDeckTest] = useState(false);
  const [reviewItems, setReviewItems] = useState<DailyReviewCard[]>();
  const [reviewExtras, setReviewExtras] = useState<DailyReviewCard[]>();
  const [deckDetailTab, setDeckDetailTab] = useState<"cards" | "tests">(() =>
    new URLSearchParams(window.location.search).get("tab") === "tests" ? "tests" : "cards");

  useEffect(() => {
    const handlePopState = () => {
      const route = parseInitialRoute();
      setActivePageState(route.page);
      if (route.deckId) {
        setSelectedDeckIdState(route.deckId);
        setDeckDetailTab(new URLSearchParams(window.location.search).get("tab") === "tests" ? "tests" : "cards");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!isNativeAndroid) return;
    let disposed = false;
    let removeListener: (() => Promise<void>) | undefined;
    void CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (activePage !== "flashcards") {
        if (canGoBack) window.history.back();
        else setActivePage("flashcards");
        return;
      }
      void CapacitorApp.minimizeApp();
    }).then((listener) => {
      if (disposed) void listener.remove();
      else removeListener = () => listener.remove();
    });
    return () => {
      disposed = true;
      if (removeListener) void removeListener();
    };
  }, [activePage]);

  function setActivePage(page: AppPage) {
    localStorage.setItem("haru-active-page", page);
    setActivePageState(page);
    if (page === "flashcards") {
      if (window.location.pathname !== "/" && window.location.pathname !== "/flashcards") {
        window.history.pushState(null, "", "/flashcards");
      }
    } else if (page !== "flashcard-detail") {
      if (window.location.pathname !== `/${page}`) {
        window.history.pushState(null, "", `/${page}`);
      }
    }
  }

  function handleSelectDeck(deckId: string, tab: "cards" | "tests" = "cards") {
    setDeckDetailTab(tab);
    setStartDeckTest(tab === "tests");
    setSelectedDeckId(deckId);
    window.history.pushState({ page: "flashcard-detail", deckId }, "", `/flashcards/${deckId}${tab === "tests" ? "?tab=tests" : ""}`);
    setActivePage("flashcard-detail");
  }

  function setSelectedDeckId(deckId: string | undefined) {
    if (deckId) {
      localStorage.setItem("haru-selected-deck-id", deckId);
    } else {
      localStorage.removeItem("haru-selected-deck-id");
    }
    setSelectedDeckIdState(deckId);
  }

  function saveAccount(user: Account) {
    void saveSession(user);
    setAccount(user);
  }

  async function clearAccount() {
    try {
      await authService.logout();
    } catch {
      // Local logout still proceeds if the gateway/user-service is offline.
    }
    await clearSession();
    localStorage.removeItem("haru-active-page");
    localStorage.removeItem("haru-selected-lesson-id");
    localStorage.removeItem("haru-selected-deck-id");
    setAccount(undefined);
  }

  if (isSessionLoading) {
    return <div className="login-page"><p className="page-status">Đang khôi phục phiên đăng nhập...</p></div>;
  }

  if (!account) {
    return <LoginPage onLogin={saveAccount} />;
  }

  const handleLogout = () => void clearAccount();

  const startReview = (items: StrugglingWord[], extras: StrugglingWord[] = []) => {
    const toCard = (item: StrugglingWord): DailyReviewCard => ({
      cardId: item.cardId,
      word: item.word,
      translation: item.translation ?? "",
      status: item.status,
      easeFactor: item.easeFactor,
    });
    setReviewItems(items.map(toCard));
    setReviewExtras(extras.map(toCard));
    setActivePage("review");
  };

  let page: ReactNode;
  if (activePage === "chatbot") {
    page = <ChatbotPage account={account} onLogout={handleLogout} onNavigate={setActivePage} userId={account.id} />;
  } else if (activePage === "dashboard") {
    page = (
      <DashboardPage
        account={account}
        onLogout={handleLogout}
        onNavigate={setActivePage}
        token={account.accessToken}
      />
    );
  } else if (activePage === "schedule") {
    page = (
      <StudySchedulePage
        account={account}
        onLogout={handleLogout}
        onNavigate={setActivePage}
        onStartReview={startReview}
        token={account.accessToken}
      />
    );
  } else if (activePage === "manage-content") {
    setActivePage("flashcards");
    page = null;
  } else if (activePage === "flashcards") {
    page = (
      <FlashcardsPage
        account={account}
        onLogout={handleLogout}
        onNavigate={setActivePage}
        onSelectDeck={handleSelectDeck}
        onStartStudy={(deckId) => {
          setSelectedDeckId(deckId);
          setActivePage("flashcard-study");
        }}
        onStartMcq={(deckId) => handleSelectDeck(deckId, "tests")}
      />
    );
  } else if (["flashcard-detail", "mcq", "result"].includes(activePage) && selectedDeckId) {
    page = (
      <FlashcardDetailPage
        account={account}
        deckId={selectedDeckId}
        onBackToDecks={() => {
          setActivePage("flashcards");
        }}
        onLogout={handleLogout}
        onNavigate={setActivePage}
        initialTab={activePage === "mcq" || activePage === "result" ? "tests" : deckDetailTab}
        startTestOnOpen={startDeckTest}
        onTestStartHandled={() => setStartDeckTest(false)}
        onStartStudy={(deckId) => {
          setSelectedDeckId(deckId);
          setActivePage("flashcard-study");
        }}
      />
    );
  } else if (activePage === "flashcard-study" && selectedDeckId) {
    page = (
      <FlashcardStudyPage
        account={account}
        deckId={selectedDeckId}
        onBackToDecks={() => setActivePage("flashcards")}
        onLogout={handleLogout}
        onNavigate={setActivePage}
      />
    );
  } else if (activePage === "review") {
    page = (
      <VocabReviewPage
        account={account}
        extras={reviewExtras}
        items={reviewItems}
        token={account.accessToken}
        onComplete={() => {
          setReviewItems(undefined);
          setReviewExtras(undefined);
          setActivePage("schedule");
        }}
        onLogout={handleLogout}
        onNavigate={setActivePage}
      />
    );
  } else page = (
    <FlashcardsPage
      account={account}
      onLogout={handleLogout}
      onNavigate={setActivePage}
      onSelectDeck={handleSelectDeck}
      onStartStudy={(deckId) => {
        setSelectedDeckId(deckId);
        setActivePage("flashcard-study");
      }}
      onStartMcq={(deckId) => handleSelectDeck(deckId, "tests")}
    />
  );

  return (
    <ReviewActionsContext.Provider
      value={{
        token: account.accessToken,
        accountId: account.id,
        refreshKey: activePage,
        startReview,
        openSchedule: () => setActivePage("schedule"),
      }}
    >
      {page}
    </ReviewActionsContext.Provider>
  );
}
