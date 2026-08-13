import { conversationRepository } from "../repositories/index.js";

export function getUserId(req, body={}){
    return req.header("x-user-id") || body.userId || "anonymous"
}

export async function createConversation(userId, title){
    return conversationRepository.create({userId, title})
}

export function generateAiReply(content){
    return `AI response: ${content}`;
}

export async function sendMessage({conversationId, content, userId }){
    const conversation = await conversationRepository.findById(conversationId);
    if(!conversation || conversation.userId != userId) return null;
    const userMessage = await conversationRepository.addMessage(conversationId, { role: "user", content });
    const assistantMessage = await conversationRepository.addMessage(conversationId, { role: "assistant", content });
    return {userMessage, assistantMessage};
}