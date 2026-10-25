import type { Card, Deck, Question } from "./types";
export type Route =
  | { name: "library" | "study-home" | "account" }
  | { name: "deck"; id: string; tab?: "cards" | "questions" }
  | { name: "edit-deck"; deck?: Deck }
  | { name: "edit-card"; deckId: string; card?: Card }
  | { name: "edit-question"; deckId: string; question?: Question }
  | { name: "study"; kind: "cards" | "questions"; deckId?: string };
export type Navigate = (route: Route) => void;
