// /backend/lib/redisClient.cjs
const { createClient } = require("redis");
const { RateLimiterRedis } = require("rate-limiter-flexible");

let redisClient;
let heartbeatInterval;

async function createRedisClient() {
  if (redisClient) return redisClient;

  const url =
    process.env.REDIS_URL ||
    (process.env.REDIS_PASSWORD
      ? `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
      : `redis://${process.env.REDIS_HOST || "127.0.0.1"}:${process.env.REDIS_PORT || 6379}`);

  const isTLS = url.startsWith("rediss://");

  console.log(
    `[Redis] Initializing → ${url} (TLS: ${isTLS ? "enabled" : "disabled"})`
  );

  redisClient = createClient({
    url,
    socket: {
      tls: isTLS ? true : false,
      rejectUnauthorized: false,
      reconnectStrategy: (retries) => {
        const delay = Math.min(retries * 200, 5000);
        console.log(`[Redis 🔄] Reconnect attempt #${retries} in ${delay}ms`);
        return delay;
      },
    },
  });

  redisClient.on("connect", () => console.log("[Redis 🔌] Connecting..."));
  redisClient.on("ready", () => console.log("[Redis ✅] Ready"));
  redisClient.on("end", () => console.warn("[Redis ⛔] Connection closed"));
  redisClient.on("reconnecting", () => console.log("[Redis 🔄] Reconnecting..."));
  redisClient.on("error", (err) => console.error("[Redis ❌ Error]", err.message));

  try {
    await redisClient.connect();
    console.log("[Redis ✅] Connected successfully");
  } catch (err) {
    console.error("[Redis ❌] Initial connection failed:", err.message);
  }

  if (!heartbeatInterval) {
    heartbeatInterval = setInterval(async () => {
      if (!redisClient?.isOpen) return;
      try {
        await redisClient.ping();
      } catch (err) {
        console.warn("[Redis ⚠️] Heartbeat failed:", err.message);
      }
    }, 30_000);
  }

  return redisClient;
}

// ✅ Gracefully close the Redis connection
async function disconnectRedisClient() {
  if (redisClient) {
    console.log("[Redis 🔌] Closing connection...");
    clearInterval(heartbeatInterval);

    try {
      await redisClient.quit();
      console.log("[Redis ✅] Connection closed cleanly");
    } catch (err) {
      console.warn("[Redis ⚠️] Error during disconnect:", err.message);
    }
  }
}

function limiterFactory({ redisClient, points, duration, blockDuration, keyPrefix }) {
  if (!redisClient) throw new Error("Redis client is not initialized for limiter factory.");

  return new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix,
    points,
    duration,
    blockDuration,
  });
}

module.exports = {
  createRedisClient,
  disconnectRedisClient,
  limiterFactory,
};
