import { getUserId, createConversation, generateAiReply, sendMessage } from "../services/index.js";
import { conversationRepository } from "../repositories/index.js";

const notFound = (res) => res.status(404).json({error: "Conversation not found"});

export async function createConversationController(req, res){
    const conversation = await createConversation(getUserId(req, req.body), req.body?.title);
    res.status(201).json(conversation);
};

export async function listConversationController(req, res){
    const userId = getUserId(req, req.body);
    res.json({data: await conversationRepository.listByUser(userId)});
}

export async function getConversationController(req, res){
    const conversation = await conversationRepository.findById(req.params.id);
    if(!conversation || conversation.userId != getUserId(req, req.body)) return notFound(res);
    res.json(conversation);
}   

export async function deleteConversationController(req,res){
    const conversation = await conversationRepository.findById(req.params.id);
    if(!conversation || conversation.userId != getUserId(req, req.body)) return notFound(res);
    await conversationRepository.delete(req.params.id);
    res.json(203).send();
}
