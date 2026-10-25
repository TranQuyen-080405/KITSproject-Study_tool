import { useEffect, useState } from "react";
import bg1 from "../../../assets/images/background-1.jpg";
import bg2 from "../../../assets/images/background-2.jpg";
import bg3 from "../../../assets/images/background-3.jpg";
import { AppPage } from "./components/app-sidebar";
import { ChatbotPage } from "./pages/chatbot-page";
import { DashboardPage } from "./pages/dashboard-page";
import { VocabReviewPage } from "./pages/vocab-review-page";
import { FlashcardsPage } from "./pages/flashcards-page";
import { FlashcardDetailPage } from "./pages/flashcard-detail-page";
import { FlashcardStudyPage } from "./pages/flashcard-study-page";
import { LoginPage } from "./pages/login-page";
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
    localStorage.removeItem("haru-selected-deck-id");
    setAccount(undefined);
  }

  if (!account) {
    return <LoginPage onLogin={saveAccount} />;
  }

  const handleLogout = () => void clearAccount();

  if (activePage === "chatbot") {
    return <ChatbotPage account={account} onLogout={handleLogout} onNavigate={setActivePage} userId={account.id} />;
  }
  if (activePage === "dashboard") {
    return <DashboardPage account={account} onLogout={handleLogout} onNavigate={setActivePage} token={account.accessToken} />;
  }
  if (activePage === "manage-content") {
    setActivePage("flashcards");
    return null;
  }
  if (activePage === "flashcards") {
    return (
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
  }
  if (["flashcard-detail", "mcq", "result"].includes(activePage) && selectedDeckId) {
    return (
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
  }
  if (activePage === "flashcard-study" && selectedDeckId) {
    return (
      <FlashcardStudyPage
        account={account}
        deckId={selectedDeckId}
        onBackToDecks={() => setActivePage("flashcards")}
        onLogout={handleLogout}
        onNavigate={setActivePage}
      />
    );
  }

  if (activePage === "review") {
    return (
      <VocabReviewPage
        account={account}
        token={account.accessToken}
        onComplete={() => {
          setActivePage("dashboard");
        }}
        onLogout={handleLogout}
        onNavigate={setActivePage}
      />
    );
  }

  return (
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
}
