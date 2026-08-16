import { conversationRepository } from "../repositories/index.js";
import { Client } from "@gradio/client";

const SPACE_NAME = process.env.HF_SPACE_NAME || "HKhangg/exaone-korean-chatbot";
let clientPromise;

function getChatbotClient() {
    clientPromise ??= Client.connect(SPACE_NAME);
    return clientPromise;
}

export function getUserId(req, body={}){
    return req.header("x-user-id") || body.userId || "anonymous"
}

export async function createConversation(userId, title){
    return conversationRepository.create({userId, title})
}

export async function generateAiReply(content){
    const client = await getChatbotClient();
    const result = await client.predict("/generate", { message: content });
    const response = Array.isArray(result.data) ? result.data[0] : result.data;
    return typeof response === "string" ? response : JSON.stringify(response);
}

export async function sendMessage({conversationId, content, userId }){
    const conversation = await conversationRepository.findById(conversationId);
    if(!conversation || conversation.userId != userId) return null;
    const userMessage = await conversationRepository.addMessage(conversationId, { role: "user", content });
    const assistantContent = await generateAiReply(content);
    const assistantMessage = await conversationRepository.addMessage(conversationId, { role: "assistant", content: assistantContent });
    return {userMessage, assistantMessage};
}
