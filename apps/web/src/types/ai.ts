export type AiMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type AiConversation = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type AiConversationDetail = Pick<AiConversation, "id" | "user_id" | "title"> & {
  messages: AiMessage[];
};

export type AiChatResponse = {
  user_message: AiMessage;
  assistant_message: AiMessage;
  provider: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
};
