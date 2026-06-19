import { asc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { messages, participants } from "../db/schema.js";
import { ensureConversationParticipant } from "./conversation.controller.js";
import { getIO } from "../socket/index.js";

export const createMessage = async (req, res) => {
  try {
    const {
      conversationId,
      receiverCiphertext,
      receiverIv,
      senderCiphertext,
      senderIv,
    } = req.body;

    const isParticipant = await ensureConversationParticipant(
      conversationId,
      req.user.id,
    );
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this conversation",
      });
    }

    const [message] = await db
      .insert(messages)
      .values({
        conversationId,
        senderId: req.user.id,
        receiverCiphertext,
        receiverIv,
        senderCiphertext,
        senderIv,
      })
      .returning();

    const conversationParticipants = await db
      .select({ userId: participants.userId })
      .from(participants)
      .where(eq(participants.conversationId, conversationId));

    for (const participant of conversationParticipants) {
      getIO()?.to(`user:${participant.userId}`).emit("message:new", message);
    }

    getIO()?.to(`conversation:${conversationId}`).emit("message:new", message);

    return res.status(201).json({ success: true, message });
  } catch (error) {
    console.error("createMessage error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while sending message",
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const isParticipant = await ensureConversationParticipant(
      conversationId,
      req.user.id,
    );
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this conversation",
      });
    }

    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));

    return res.status(200).json({ success: true, messages: history });
  } catch (error) {
    console.error("getMessages error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching messages",
    });
  }
};
