import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const conversationRepository = {
    create({userId, title}){
        return prisma.conversation.create({
            data:{
                userId: userId,
                title: title
            }
        })
    },
    delete(id){
        return prisma.conversation.delete({
            where:{
                id: id
            }
        })
    },
    findById(id){
        return prisma.conversation.findUnique({
            where:{
                id:id
            },
            include:{
                messages: {
                    orderBy:{
                        createdAt: "asc"
                    }
                }
            }
        })
    },
    listByUser(userId){
        return prisma.conversation.findMany({
            where:{
                userId: userId
            },
            orderBy:{
                updatedAt:"desc"
            }
        })
    },
    addMessage(id,message){
        return prisma.message.create({
            data: {
                conversationId: id,
                message: message
            }
        })
    },
};
