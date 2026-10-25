import type {
  AiChatResponse,
  AiConversation,
  AiConversationDetail,
} from "../types/ai";
import { apiRequest } from "./client";
import { endpoints } from "./endpoints";

function aiOptions(_userId: number) {
  return {}; // Identity is determined by the bearer token in the shared client.
}

export const aiApi = {
  health(userId: number) {
    return apiRequest<{ status: string; database: string }>(
      endpoints.ai.health,
      aiOptions(userId),
    );
  },

  listConversations(userId: number) {
    return apiRequest<AiConversation[]>(endpoints.ai.conversations, {
      ...aiOptions(userId),
      method: "GET",
    });
  },

  createConversation(userId: number, title = "Cuộc hội thoại mới") {
    return apiRequest<AiConversation>(endpoints.ai.conversations, {
      ...aiOptions(userId),
      method: "POST",
      body: { title },
    });
  },

  getConversation(userId: number, conversationId: string) {
    return apiRequest<AiConversationDetail>(
      endpoints.ai.conversation(conversationId),
      aiOptions(userId),
    );
  },

  sendMessage(userId: number, conversationId: string, content: string) {
    return apiRequest<AiChatResponse>(endpoints.ai.messages(conversationId), {
      ...aiOptions(userId),
      method: "POST",
      body: { content },
    });
  },

  deleteConversation(userId: number, conversationId: string) {
    return apiRequest<void>(endpoints.ai.conversation(conversationId), {
      ...aiOptions(userId),
      method: "DELETE",
    });
  },

  completeFlashcards(cards: Array<{ index: number; front: string; back: string }>) {
    return apiRequest<{ cards: Array<{ index: number; front: string; back: string }> }>(
      endpoints.ai.completeFlashcards, { method: "POST", body: { cards } },
    );
  },

  generateFlashcards(prompt: string) {
    return apiRequest<{ flashcards: Array<{ question: string; answer: string }> }>(
      endpoints.ai.generateFlashcards,
      {
        method: "POST",
        body: { prompt },
      },
    );
  },

  generateMcqQuestions(
    words: Array<{ word: string; meaning?: string; vocabulary_id?: string } | string>,
    questionCount = 5,
    description = "Câu hỏi trắc nghiệm tiếng Hàn 4 đáp án",
  ) {
    return apiRequest<{
      questions: Array<{
        prompt: string;
        options: string[];
        correct_option_index: number;
        correctOptionIndex?: number;
        explanation?: string;
        target_word?: string;
      }>;
      total: number;
    }>(endpoints.ai.generateQuestions, {
      method: "POST",
      body: {
        words,
        question_count: questionCount,
        description,
      },
    });
  },
};
