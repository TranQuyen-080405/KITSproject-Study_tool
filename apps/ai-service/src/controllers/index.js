import { getUserId, createConversation, generateAiReply, sendMessage } from "../services/index.js";
import { conversationRepository } from "../repositories/index.js";

const notFound = (res) => res.status(404).json({error: "Conversation not found"});

export async function createConversationController(req, res){
    const conversation = await createConversation(getUserId(req, req.body), req.body?.title);
    res.status(201).json(conversation);
};

export async function listConversationsController(req, res){
    const userId = getUserId(req, req.body);
    res.json({data: await conversationRepository.listByUser(userId)});
}

export async function getConversationController(req, res){
    const conversation = await conversationRepository.findById(req.params.id);
    if(!conversation || conversation.userId !== getUserId(req, req.body)) return notFound(res);
    res.json(conversation);
}   

export async function deleteConversationController(req,res){
    const conversation = await conversationRepository.findById(req.params.id);
    if(!conversation || conversation.userId !== getUserId(req, req.body)) return notFound(res);
    await conversationRepository.delete(req.params.id);
    res.status(204).send();
}

export async function sendMessageController(req, res) {
    const content = req.body?.content ?? req.body?.message;
    if (typeof content !== "string" || !content.trim()) return res.status(400).json({ error: "content is required" });
    const result = await sendMessage({conversationId: req.params.id, content: content.trim(), userId: getUserId(req)});
    if (!result) return notFound(res);
    res.status(201).json(result);
}

export async function listMessagesController(req, res) {
    const conversation = await conversationRepository.findById(req.params.id);
    if (!conversation || conversation.userId !== getUserId(req)) return notFound(res);
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const start = (page - 1) * limit;
    res.json({ data: conversation.messages.slice(start, start + limit), pagination: { page, limit, total: conversation.messages.length, totalPages: Math.ceil(conversation.messages.length / limit) } });
}
