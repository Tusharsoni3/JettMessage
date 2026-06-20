import { io, type Socket } from "socket.io-client";
import type { EncryptedMessage } from "./authApi";

export type MessageDeliveryStatus = "sent" | "delivered" | "read";
export interface MessageStatusUpdate {
  messageId: string;
  conversationId: string;
  status: MessageDeliveryStatus;
}

export type PresenceStatus = "online" | "offline";
export interface PresenceUpdate {
  userId: string;
  status: PresenceStatus;
}

const HEARTBEAT_INTERVAL_MS = 10000; // must match HEARTBEAT_INTERVAL_MS on the server

let socket: Socket | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function startHeartbeat(activeSocket: Socket) {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    activeSocket.emit("heartbeat");
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export const socketService = {
  connect(): Socket {
    if (!socket) {
      socket = io("http://localhost:3000", {
        withCredentials: true,
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => {
        startHeartbeat(socket!);
      });

      socket.on("disconnect", () => {
        stopHeartbeat();
      });
    }
    return socket;
  },

  joinConversation(conversationId: string) {
    this.connect().emit("conversation:join", conversationId);
  },

  leaveConversation(conversationId: string) {
    socket?.emit("conversation:leave", conversationId);
  },

  onNewMessage(handler: (message: EncryptedMessage) => void) {
    this.connect().on("message:new", handler);
  },

  offNewMessage(handler: (message: EncryptedMessage) => void) {
    socket?.off("message:new", handler);
  },

  markMessageDelivered(messageId: string) {
    this.connect().emit("message_delivered", { msgId: messageId });
  },

  markMessageRead(messageId: string) {
    this.connect().emit("message_read", { msgId: messageId });
  },

  onMessageStatusUpdate(handler: (update: MessageStatusUpdate) => void) {
    this.connect().on("message_status_update", handler);
  },

  offMessageStatusUpdate(handler: (update: MessageStatusUpdate) => void) {
    socket?.off("message_status_update", handler);
  },

  requestPresence(userIds: string[]): Promise<Record<string, PresenceStatus>> {
    return new Promise((resolve) => {
      this.connect().emit(
        "presence:get",
        userIds,
        (statuses: Record<string, PresenceStatus>) => resolve(statuses ?? {}),
      );
    });
  },

  onPresenceUpdate(handler: (update: PresenceUpdate) => void) {
    this.connect().on("presence_update", handler);
  },

  offPresenceUpdate(handler: (update: PresenceUpdate) => void) {
    socket?.off("presence_update", handler);
  },

  disconnect() {
    stopHeartbeat();
    socket?.disconnect();
    socket = null;
  },
};