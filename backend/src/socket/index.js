//socket/index.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { and, eq, ne } from "drizzle-orm";
import { db } from "../db/index.js";
import { messages, participants } from "../db/schema.js";
import {
  getPresenceStatuses,
  HEARTBEAT_INTERVAL_MS,
  initPresenceStore,
  markUserSocketOffline,
  markUserSocketOnline,
  refreshPresenceHeartbeat,
  sweepStalePresence,
} from "../services/presenceStore.js";

let io;

const parseCookies = (cookieHeader = "") =>
  Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const [key, ...value] = cookie.split("=");
        return [key, decodeURIComponent(value.join("="))];
      }),
  );

const getFriendIds = async (userId) => {
  const myRooms = await db
    .select({ conversationId: participants.conversationId })
    .from(participants)
    .where(eq(participants.userId, userId));

  const friendIds = new Set();

  await Promise.all(
    myRooms.map(async ({ conversationId }) => {
      const friends = await db
        .select({ userId: participants.userId })
        .from(participants)
        .where(
          and(
            eq(participants.conversationId, conversationId),
            ne(participants.userId, userId),
          ),
        );

      for (const friend of friends) {
        friendIds.add(friend.userId);
      }
    }),
  );

  return [...friendIds];
};

const broadcastPresenceToFriends = async (userId, status) => {
  const friendIds = await getFriendIds(userId);
  const payload = { userId, status };

  for (const friendId of friendIds) {
    io?.to(`user:${friendId}`).emit("presence_update", payload);
  }

  io?.to(`user:${userId}`).emit("presence_update", payload);
};

const statusRank = {
  sent: 0,
  delivered: 1,
  read: 2,
};

const updateMessageReceipt = async ({ userId, messageId, nextStatus }) => {
  if (!messageId || !["delivered", "read"].includes(nextStatus)) return;

  const [message] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!message || message.senderId === userId) return;

  const [participant] = await db
    .select({ userId: participants.userId })
    .from(participants)
    .where(
      and(
        eq(participants.conversationId, message.conversationId),
        eq(participants.userId, userId),
      ),
    )
    .limit(1);

  if (!participant) return;

  const currentRank = statusRank[message.status] ?? 0;
  const nextRank = statusRank[nextStatus];

  if (currentRank >= nextRank) return;

  const [updatedMessage] = await db
    .update(messages)
    .set({ status: nextStatus })
    .where(eq(messages.id, message.id))
    .returning();

  const payload = {
    messageId: updatedMessage.id,
    conversationId: updatedMessage.conversationId,
    status: updatedMessage.status,
  };

  io?.to(`user:${updatedMessage.senderId}`).emit(
    "message_status_update",
    payload,
  );
  io?.to(`user:${userId}`).emit("message_status_update", payload);
  io?.to(`conversation:${updatedMessage.conversationId}`).emit(
    "message_status_update",
    payload,
  );
};

export const initSocket = (httpServer) => {
  void initPresenceStore();

  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST"],
    },
    // Heartbeat lowered to 10s so dropped/ghost connections are detected fast
    // instead of lingering online for up to 45s.
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.use((socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies.jwt;

      if (!token) {
        return next(new Error("Unauthorized: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded?.id) {
        return next(new Error("Unauthorized: Invalid token"));
      }

      socket.data.userId = decoded.id;
      next();
    } catch {
      next(new Error("Unauthorized: Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);

    try {
      const shouldBroadcastOnline = await markUserSocketOnline(
        userId,
        socket.id,
      );
      if (shouldBroadcastOnline) {
        await broadcastPresenceToFriends(userId, "online");
      }
    } catch (error) {
      console.error("presence connect error:", error);
    }

    socket.on("presence:get", async (userIds, callback) => {
      try {
        const statuses = await getPresenceStatuses(
          Array.isArray(userIds) ? userIds : [],
        );
        callback?.(statuses);
      } catch (error) {
        console.error("presence:get error:", error);
        callback?.({});
      }
    });

    // Client should emit this every HEARTBEAT_INTERVAL_MS (10s) while connected.
    socket.on("heartbeat", async () => {
      try {
        await refreshPresenceHeartbeat(userId);
      } catch (error) {
        console.error("heartbeat error:", error);
      }
    });

    socket.on("conversation:join", (conversationId) => {
      if (typeof conversationId === "string" && conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on("conversation:leave", (conversationId) => {
      if (typeof conversationId === "string" && conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    socket.on("message_delivered", async ({ msgId } = {}) => {
      try {
        await updateMessageReceipt({
          userId,
          messageId: msgId,
          nextStatus: "delivered",
        });
      } catch (error) {
        console.error("message_delivered error:", error);
      }
    });

    socket.on("message_read", async ({ msgId } = {}) => {
      try {
        await updateMessageReceipt({
          userId,
          messageId: msgId,
          nextStatus: "read",
        });
      } catch (error) {
        console.error("message_read error:", error);
      }
    });

    socket.on("disconnect", async () => {
      try {
        const shouldBroadcastOffline = await markUserSocketOffline(
          userId,
          socket.id,
        );
        if (shouldBroadcastOffline) {
          await broadcastPresenceToFriends(userId, "offline");
        }
      } catch (error) {
        console.error("presence disconnect error:", error);
      }
    });
  });

  // Safety net: if a client's socket dies without firing "disconnect" (sleep,
  // crash, killed app, network drop) and no heartbeat arrives in time, force
  // them offline and notify their friends instead of leaving a ghost session.
  setInterval(async () => {
    try {
      const staleUserIds = sweepStalePresence();
      for (const userId of staleUserIds) {
        await broadcastPresenceToFriends(userId, "offline");
      }
    } catch (error) {
      console.error("presence sweep error:", error);
    }
  }, HEARTBEAT_INTERVAL_MS);

  return io;
};

export const getIO = () => io;