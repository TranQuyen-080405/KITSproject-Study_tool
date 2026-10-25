// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Deck, Question, Session } from "../src/types";

const mock = vi.hoisted(() => {
  const listeners = new Set<(session: unknown) => void>();
  const api = Object.fromEntries(["login", "google", "register", "verify", "forgot", "reset", "me", "user", "deleteUser", "decks", "deck", "saveDeck", "deleteDeck", "saveCard", "deleteCard", "questions", "saveQuestion", "deleteQuestion", "studyBank"].map((name) => [name, vi.fn()]));
  return {
    api, listeners,
    client: {
      restore: vi.fn(), getSession: vi.fn(), refresh: vi.fn(), signOut: vi.fn(),
      subscribe: (callback: (value: unknown) => void) => { listeners.add(callback); return () => listeners.delete(callback); },
    },
  };
});
vi.mock("../src/api", () => ({ ...mock, apiUrl: "http://test-server" }));
import App from "../src/app";

const session: Session = { accessToken: "test", expiresIn: 900, user: { id: 7, username: "learner", email: "learner@example.com", displayName: "Learner", emailVerified: true, role: "USER" } };
let decks: Deck[];
let questions: Question[];
const tap = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
async function login() {
  await screen.findByRole("button", { name: "Sign in", exact: true });
  fill("Username", "learner"); fill("Password", "password123"); tap(/^Sign in$/);
  await screen.findByRole("button", { name: "+ Create a deck" });
}

beforeEach(() => {
  vi.clearAllMocks(); mock.listeners.clear(); decks = []; questions = [];
  HTMLElement.prototype.scrollTo = vi.fn(); HTMLElement.prototype.scroll = vi.fn();
  mock.client.restore.mockResolvedValue(null); mock.client.getSession.mockReturnValue(null);
  mock.api.login.mockImplementation(async () => { mock.listeners.forEach((callback) => callback(session)); });
  mock.client.signOut.mockImplementation(async () => { mock.listeners.forEach((callback) => callback(null)); });
  mock.api.me.mockResolvedValue(session.user);
  mock.api.decks.mockImplementation(async () => [...decks]);
  mock.api.deck.mockImplementation(async (id: string) => decks.find((deck) => deck.id === id));
  mock.api.questions.mockImplementation(async (id: string) => questions.filter((q) => q.flashcardId === id));
  mock.api.saveDeck.mockImplementation(async (body: { title: string; description: string }) => { const deck = { ...body, id: "deck-1", cards: [] }; decks.push(deck); return deck; });
  mock.api.saveCard.mockImplementation(async (deckId: string, body: { front: string; back: string }) => { decks.find((d) => d.id === deckId)!.cards!.push({ ...body, id: "card-1", flashcardId: deckId }); });
  mock.api.saveQuestion.mockImplementation(async (deckId: string, body: Question) => { questions.push({ ...body, id: "question-1", flashcardId: deckId }); });
  mock.api.studyBank.mockImplementation(async () => ({ cards: decks.flatMap((d) => d.cards ?? []), questions }));
});
afterEach(cleanup);

describe("mobile app flows rendered with React Native Web", () => {
  it("creates manual material, studies cards and questions, retries misses, and signs out", async () => {
    render(<App />); await login();
    tap("+ Create a deck"); fill("Deck title", "Everyday Korean"); tap("Save deck");
    fireEvent.click(await screen.findByRole("button", { name: "Open Everyday Korean" }));
    fireEvent.click(await screen.findByRole("button", { name: "+ Add a flashcard" }));
    fill("Front · word or prompt", "안녕하세요"); fill("Back · meaning or answer", "Hello"); tap("Save flashcard");
    await screen.findByRole("button", { name: "Questions" }); tap("Questions"); tap("+ Add a question");
    fill("Question", "What does 안녕하세요 mean?");
    ["Hello", "Thanks", "Goodbye", "Sorry"].forEach((value, i) => fill(`Answer ${String.fromCharCode(65 + i)}`, value));
    fireEvent.click(screen.getAllByRole("radio")[0]); tap("Save question");
    await screen.findByRole("button", { name: "Study these flashcards" });
    tap("Study these flashcards"); await screen.findByRole("button", { name: "Start practice" }); tap("Start practice");
    tap("Reveal answer"); tap("Review again"); tap("Retry missed items"); tap("Reveal answer"); tap("Got it");
    expect(screen.getByText("1 / 1")).toBeTruthy(); tap("Finish");
    await screen.findByRole("button", { name: "Practice these questions" }); tap("Practice these questions"); await screen.findByRole("button", { name: "Start practice" }); tap("Start practice");
    fireEvent.click(screen.getAllByRole("radio")[1]); tap("Check answer"); expect(screen.getByText("Correct answer: Hello")).toBeTruthy(); tap("See results"); tap("Retry missed items");
    fireEvent.click(screen.getAllByRole("radio")[0]); tap("Check answer"); tap("See results"); expect(screen.getByText("1 / 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Account/ })); await screen.findByText("learner@example.com"); tap("Sign out");
    await screen.findByRole("button", { name: "Sign in", exact: true });
    expect(mock.api.saveCard).toHaveBeenCalledTimes(1); expect(mock.api.saveQuestion).toHaveBeenCalledTimes(1);
  });
  it("offers registration, email verification, and password recovery", async () => {
    render(<App />); await screen.findByRole("button", { name: "Sign in", exact: true }); tap("Create an account");
    fill("Username", "newlearner"); fill("Display name", "New Learner"); fill("Email address", "new@example.com"); fill("Password", "password123"); tap("Create account");
    await screen.findByLabelText("Six-digit email code"); fill("Six-digit email code", "123456"); tap("Verify email"); await screen.findByRole("button", { name: "Sign in", exact: true });
    expect(mock.api.verify).toHaveBeenCalledWith("new@example.com", "123456");
    tap("Forgot password?"); fill("Email address", "new@example.com"); tap("Send reset code"); await screen.findByLabelText("New password"); fill("Six-digit email code", "654321"); fill("New password", "freshpassword123"); tap("Save new password");
    await screen.findByRole("button", { name: "Sign in", exact: true }); expect(mock.api.reset).toHaveBeenCalledWith("new@example.com", "654321", "freshpassword123");
  });
  it("starts all-deck practice and handles an empty question bank", async () => {
    render(<App />); await login(); fireEvent.click(screen.getByRole("tab", { name: /Practice/ })); tap("Practice all questions");
    await screen.findByText("No questions here"); expect(mock.api.studyBank).toHaveBeenCalledWith("questions", undefined);
  });
});
