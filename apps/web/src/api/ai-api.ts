import type {
  AiChatResponse,
  AiConversation,
  AiConversationDetail,
} from "../types/ai";
import { apiRequest } from "./client";
import { endpoints } from "./endpoints";

function aiOptions(userId: number) {
  return { userId: String(userId) };
}

export const aiApi = {
  health(userId: number) {
    return apiRequest<{ status: string; database: string }>(
      endpoints.ai.health,
      aiOptions(userId),
    );
  },

  createConversation(userId: number, title = "HARU HARU") {
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
};
