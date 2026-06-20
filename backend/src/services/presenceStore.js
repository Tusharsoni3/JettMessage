//services/presenceStore.js
import { createClient } from "redis";

export const HEARTBEAT_INTERVAL_MS = 10000; // 10s — client should emit "heartbeat" at this cadence
const PRESENCE_TTL_SECONDS = 15; // ~1.5x heartbeat interval, tolerates one missed beat

const memorySocketsByUser = new Map();
const memoryOnlineUsers = new Set();

// Tracked regardless of backend (redis or memory) — used to detect and broadcast staleness.
const lastHeartbeatByUser = new Map();

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

  client.on("ready", () => {
    redisReady = true;
    console.log("Redis presence store connected");
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
  lastHeartbeatByUser.set(userId, Date.now());

  if (redisReady) {
    const previousStatus = await client.get(statusKey(userId));
    await client.sAdd(socketsKey(userId), socketId);
    await client.expire(socketsKey(userId), PRESENCE_TTL_SECONDS);
    await client.set(statusKey(userId), "online", {
      EX: PRESENCE_TTL_SECONDS,
    });
    return previousStatus !== "online";
  }

  const sockets = memorySocketsByUser.get(userId) ?? new Set();
  const wasOffline = sockets.size === 0;
  sockets.add(socketId);
  memorySocketsByUser.set(userId, sockets);
  memoryOnlineUsers.add(userId);
  return wasOffline;
};

// Call on every "heartbeat" event from the client — keeps the TTL alive.
export const refreshPresenceHeartbeat = async (userId) => {
  lastHeartbeatByUser.set(userId, Date.now());

  if (redisReady) {
    await client.expire(socketsKey(userId), PRESENCE_TTL_SECONDS);
    await client.expire(statusKey(userId), PRESENCE_TTL_SECONDS);
  }
};

export const markUserSocketOffline = async (userId, socketId) => {
  if (redisReady) {
    await client.sRem(socketsKey(userId), socketId);
    const remainingSockets = await client.sCard(socketsKey(userId));

    if (remainingSockets === 0) {
      await client.del(socketsKey(userId));
      await client.del(statusKey(userId));
      lastHeartbeatByUser.delete(userId);
      return true;
    }

    return false;
  }

  const sockets = memorySocketsByUser.get(userId);
  if (!sockets) {
    lastHeartbeatByUser.delete(userId);
    return false;
  }

  sockets.delete(socketId);
  if (sockets.size === 0) {
    memorySocketsByUser.delete(userId);
    memoryOnlineUsers.delete(userId);
    lastHeartbeatByUser.delete(userId);
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

// Run on an interval (e.g. every HEARTBEAT_INTERVAL_MS) from index.js.
// Returns userIds that just went stale so the caller can broadcast "offline".
export const sweepStalePresence = () => {
  const now = Date.now();
  const staleUserIds = [];

  for (const [userId, lastHeartbeat] of lastHeartbeatByUser.entries()) {
    if (now - lastHeartbeat > PRESENCE_TTL_SECONDS * 1000) {
      staleUserIds.push(userId);
    }
  }

  for (const userId of staleUserIds) {
    lastHeartbeatByUser.delete(userId);
    memorySocketsByUser.delete(userId);
    memoryOnlineUsers.delete(userId);
    // Redis keys already auto-expired via TTL; nothing extra to clean up there.
  }

  return staleUserIds;
};