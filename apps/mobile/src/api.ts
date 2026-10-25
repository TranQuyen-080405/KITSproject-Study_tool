import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient } from "./http";
import type { AdminUser, Card, CardInput, Deck, Question, QuestionInput, Session, User } from "./types";

// Browser preview keeps tokens in memory; native credentials use Android Keystore.
let browserSession: Session | null = null;
const key = "haru.mobile.session.v1";
export const apiUrl = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === "web" ? "http://localhost:3000" : "http://10.0.2.2:3000");
export const client = createClient(apiUrl, {
  async read() {
    if (Platform.OS === "web") return browserSession;
    const value = await SecureStore.getItemAsync(key);
    try { return value ? JSON.parse(value) as Session : null; }
    catch { await SecureStore.deleteItemAsync(key); return null; }
  },
  async write(value) {
    if (Platform.OS === "web") { browserSession = value; return; }
    if (value) await SecureStore.setItemAsync(key, JSON.stringify(value));
    else await SecureStore.deleteItemAsync(key);
  },
}, Platform.OS === "web" ? "web" : "android");

const content = "/api/v1/content";
const id = encodeURIComponent;
export const api = {
  login: (username: string, password: string) => client.signIn("/api/v1/auth/login", { username, password }),
  google: (idToken: string) => client.signIn("/api/v1/auth/google", { idToken }),
  register: (body: { username: string; email: string; password: string; displayName: string }) => client.request("/api/v1/auth/register", { body, auth: false }),
  verify: (email: string, code: string) => client.request("/api/v1/auth/verify-email", { body: { email, code }, auth: false }),
  forgot: (email: string) => client.request("/api/v1/auth/forgot-password", { body: { email }, auth: false }),
  reset: (email: string, code: string, newPassword: string) => client.request("/api/v1/auth/reset-password", { body: { email, code, newPassword }, auth: false }),
  me: () => client.request<User>("/api/v1/users/me"),
  user: (userId: string) => client.request<AdminUser>(`/api/v1/users/${id(userId)}`),
  deleteUser: (userId: string) => client.request(`/api/v1/users/${id(userId)}`, { method: "DELETE" }),
  async decks() { return (await client.request<{ flashcards: Deck[] }>(`${content}/flashcards`)).flashcards; },
  async deck(deckId: string) { return (await client.request<{ flashcard: Deck }>(`${content}/flashcards/${id(deckId)}`)).flashcard; },
  async saveDeck(body: { title: string; description: string }, deckId?: string) {
    return (await client.request<{ flashcard: Deck }>(`${content}/flashcards${deckId ? `/${id(deckId)}` : ""}`, { method: deckId ? "PATCH" : "POST", body })).flashcard;
  },
  deleteDeck: (deckId: string) => client.request(`${content}/flashcards/${id(deckId)}`, { method: "DELETE" }),
  async saveCard(deckId: string, body: CardInput, cardId?: string) {
    return client.request(cardId ? `${content}/cards/${id(cardId)}` : `${content}/flashcards/${id(deckId)}/cards`, { method: cardId ? "PATCH" : "POST", body: cardId ? body : { items: [body] } });
  },
  deleteCard: (cardId: string) => client.request(`${content}/cards/${id(cardId)}`, { method: "DELETE" }),
  async questions(deckId: string) { return (await client.request<{ questions: Question[] }>(`${content}/flashcards/${id(deckId)}/questions/managed`)).questions; },
  saveQuestion: (deckId: string, body: QuestionInput, questionId?: string) => client.request(questionId ? `${content}/questions/${id(questionId)}` : `${content}/flashcards/${id(deckId)}/questions`, { method: questionId ? "PATCH" : "POST", body }),
  deleteQuestion: (questionId: string) => client.request(`${content}/questions/${id(questionId)}`, { method: "DELETE" }),
  async studyBank(kind: "cards" | "questions", deckId?: string): Promise<{ cards: Card[]; questions: Question[] }> {
    const decks = deckId ? [await api.deck(deckId)] : await api.decks();
    const banks = await Promise.all(decks.map(async (deck) => {
      if (kind === "questions") return { cards: [], questions: (await api.questions(deck.id)).map((q) => ({ ...q, deckTitle: deck.title })) };
      const detail = deck.cards ? deck : await api.deck(deck.id);
      return { cards: (detail.cards ?? []).map((card) => ({ ...card, deckTitle: deck.title })), questions: [] };
    }));
    return { cards: banks.flatMap((bank) => bank.cards), questions: banks.flatMap((bank) => bank.questions) };
  },
};
