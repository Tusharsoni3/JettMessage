import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "../db/index.js";
import { conversations, messages, participants, users } from "../db/schema.js";

export const listConversations = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const myRooms = await db
      .select({ conversationId: participants.conversationId })
      .from(participants)
      .where(eq(participants.userId, currentUserId));

    const items = await Promise.all(
      myRooms.map(async ({ conversationId }) => {
        const [otherParticipant] = await db
          .select({ userId: participants.userId })
          .from(participants)
          .where(
            and(
              eq(participants.conversationId, conversationId),
              ne(participants.userId, currentUserId),
            ),
          )
          .limit(1);

        if (!otherParticipant) return null;

        const [recipient] = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            avatarUrl: users.avatarUrl,
            publicKey: users.publicKey,
          })
          .from(users)
          .where(eq(users.id, otherParticipant.userId))
          .limit(1);

        if (!recipient) return null;

        const [lastMessage] = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversationId))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        return {
          conversationId,
          recipient,
          lastMessage: lastMessage ?? null,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      conversations: items.filter(Boolean),
    });
  } catch (error) {
    console.error("listConversations error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while loading conversations",
    });
  }
};

export const createOrGetConversation = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const currentUserId = req.user.id;

    if (recipientId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot start a chat with yourself",
      });
    }

    const [recipient] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        publicKey: users.publicKey,
      })
      .from(users)
      .where(eq(users.id, recipientId))
      .limit(1);

    if (!recipient) {
      return res
        .status(404)
        .json({ success: false, message: "Recipient not found" });
    }

    const currentUserRooms = await db
      .select({ conversationId: participants.conversationId })
      .from(participants)
      .where(eq(participants.userId, currentUserId));

    const recipientRooms = await db
      .select({ conversationId: participants.conversationId })
      .from(participants)
      .where(eq(participants.userId, recipientId));

    const currentRoomIds = new Set(
      currentUserRooms.map((row) => row.conversationId),
    );
    const existingRoom = recipientRooms.find((row) =>
      currentRoomIds.has(row.conversationId),
    );

    if (existingRoom) {
      return res.status(200).json({
        success: true,
        conversationId: existingRoom.conversationId,
        recipient,
      });
    }

    const [conversation] = await db
      .insert(conversations)
      .values({})
      .returning();

    await db.insert(participants).values([
      { conversationId: conversation.id, userId: currentUserId },
      { conversationId: conversation.id, userId: recipientId },
    ]);

    return res.status(201).json({
      success: true,
      conversationId: conversation.id,
      recipient,
    });
  } catch (error) {
    console.error("createOrGetConversation error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating conversation",
    });
  }
};

export const ensureConversationParticipant = async (conversationId, userId) => {
  const [participant] = await db
    .select({ conversationId: participants.conversationId })
    .from(participants)
    .where(
      and(
        eq(participants.conversationId, conversationId),
        eq(participants.userId, userId),
      ),
    )
    .limit(1);

  return Boolean(participant);
};
