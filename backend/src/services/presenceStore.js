import { createClient } from "redis";

const memorySocketsByUser = new Map();
const memoryOnlineUsers = new Set();

let client;
let redisReady = false;
let redisInitStarted = false;

const statusKey = (userId) => `user:${userId}:status`;
const socketsKey = (userId) => `user:${userId}:sockets`;

export const initPresenceStore = async () => {
  if (redisInitStarted) return;
  redisInitStarted = true;

  client = createClient({
    url: process.env.REDIS_URL,
    socket: {
      connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? 15000),
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
  });

  client.on("error", (error) => {
    redisReady = false;
    console.warn(
      "Redis presence unavailable, using memory fallback:",
      error.message,
    );
  });

  try {
    await client.connect();
    redisReady = true;
    console.log("Redis presence store connected");
  } catch (error) {
    redisReady = false;
    console.warn(
      "Redis presence unavailable, using memory fallback:",
      error.message,
    );
  }
};

export const markUserSocketOnline = async (userId, socketId) => {
  if (redisReady) {
    await client.sAdd(socketsKey(userId), socketId);
    await client.set(statusKey(userId), "online");
    return true;
  }

  const sockets = memorySocketsByUser.get(userId) ?? new Set();
  const wasOffline = sockets.size === 0;
  sockets.add(socketId);
  memorySocketsByUser.set(userId, sockets);
  memoryOnlineUsers.add(userId);
  return wasOffline;
};

export const markUserSocketOffline = async (userId, socketId) => {
  if (redisReady) {
    await client.sRem(socketsKey(userId), socketId);
    const remainingSockets = await client.sCard(socketsKey(userId));

    if (remainingSockets === 0) {
      await client.del(socketsKey(userId));
      await client.del(statusKey(userId));
      return true;
    }

    return false;
  }

  const sockets = memorySocketsByUser.get(userId);
  if (!sockets) return false;

  sockets.delete(socketId);
  if (sockets.size === 0) {
    memorySocketsByUser.delete(userId);
    memoryOnlineUsers.delete(userId);
    return true;
  }

  return false;
};

export const getPresenceStatuses = async (userIds) => {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const statuses = {};

  if (redisReady) {
    const values = await Promise.all(
      uniqueIds.map(async (userId) => [
        userId,
        await client.get(statusKey(userId)),
      ]),
    );

    for (const [userId, value] of values) {
      statuses[userId] = value === "online" ? "online" : "offline";
    }

    return statuses;
  }

  for (const userId of uniqueIds) {
    statuses[userId] = memoryOnlineUsers.has(userId) ? "online" : "offline";
  }

  return statuses;
};
