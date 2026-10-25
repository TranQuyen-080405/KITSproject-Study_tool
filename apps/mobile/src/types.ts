export type User = {
  id: number;
  username: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  role?: "USER" | "ADMIN";
};
export type Session = { accessToken: string; refreshToken?: string; expiresIn: number; user: User };
export type AdminUser = User & { status: string; role: string; createdAt: string };
export type Card = { id: string; flashcardId: string; front: string; back: string; hint?: string | null; orderIndex?: number; deckTitle?: string };
export type Question = { id: string; flashcardId: string; cardId?: string | null; prompt: string; options: string[]; correctOptionIndex: number; deckTitle?: string };
export type Deck = { id: string; title: string; description?: string | null; cardCount?: number; questionCount?: number; cards?: Card[] };
export type CardInput = Pick<Card, "front" | "back" | "hint">;
export type QuestionInput = Pick<Question, "prompt" | "options" | "correctOptionIndex">;
