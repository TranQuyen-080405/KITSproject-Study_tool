import { apiRequest } from "./client";
import { endpoints } from "./endpoints";

export type FlashcardDeck = {
  id: string;
  title: string;
  description: string | null;
  folderId: string | null;
  userId: string | null;
  cardCount?: number;
  questionCount?: number;
  cards?: FlashcardCard[];
  createdAt: string;
  updatedAt: string;
};

export type FlashcardCard = {
  id: string;
  flashcardId: string;
  front: string;
  back: string;
  hint: string | null;
  orderIndex: number;
};

export type CreateFlashcardInput = {
  title: string;
  description?: string;
};

export type CardItem = {
  front: string;
  back: string;
};

export async function createFlashcardDeck(
  input: CreateFlashcardInput,
): Promise<FlashcardDeck> {
  const { flashcard } = await apiRequest<{ flashcard: FlashcardDeck }>(
    endpoints.content.flashcards,
    { method: "POST", body: input },
  );
  return flashcard;
}

export async function addCardsToFlashcard(
  flashcardId: string,
  items: CardItem[],
): Promise<FlashcardCard[]> {
  const { cards } = await apiRequest<{ cards: FlashcardCard[] }>(
    endpoints.content.cards(flashcardId),
    { method: "POST", body: { items } },
  );
  return cards;
}

export async function fetchFlashcardDecks(): Promise<FlashcardDeck[]> {
  const { flashcards } = await apiRequest<{ flashcards: FlashcardDeck[]; count: number }>(
    endpoints.content.flashcards,
  );
  return flashcards;
}

export async function fetchFlashcardDeck(deckId: string): Promise<FlashcardDeck> {
  const { flashcard } = await apiRequest<{ flashcard: FlashcardDeck }>(
    endpoints.content.flashcard(deckId),
  );
  return flashcard;
}

export async function deleteFlashcardDeck(deckId: string): Promise<void> {
  await apiRequest<void>(endpoints.content.flashcard(deckId), {
    method: "DELETE",
  });
}

export async function updateFlashcardDeck(
  deckId: string,
  input: { title?: string; description?: string },
): Promise<FlashcardDeck> {
  const { flashcard } = await apiRequest<{ flashcard: FlashcardDeck }>(
    endpoints.content.flashcard(deckId),
    { method: "PATCH", body: input },
  );
  return flashcard;
}

export async function deleteCard(cardId: string): Promise<void> {
  await apiRequest<void>(endpoints.content.card(cardId), {
    method: "DELETE",
  });
}

export async function updateCard(
  cardId: string,
  input: { front?: string; back?: string; hint?: string | null },
): Promise<FlashcardCard> {
  const { card } = await apiRequest<{ card: FlashcardCard }>(
    endpoints.content.card(cardId),
    { method: "PATCH", body: input },
  );
  return card;
}

