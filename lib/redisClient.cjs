// /lib/redisClient.cjs
const { createClient } = require("redis");
const { RateLimiterRedis } = require("rate-limiter-flexible");

let redisClient;
let heartbeatInterval;

async function createRedisClient() {
  if (redisClient) return redisClient;

  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = process.env.REDIS_PORT || 6379;
  const password = process.env.REDIS_PASSWORD || null;

  const url = password
    ? `redis://:${password}@${host}:${port}`
    : `redis://${host}:${port}`;

  const isTLS =
    url.startsWith("rediss://") || host.includes(".addon.code.run");

  console.log(`[Redis] Initializing → ${url}  (TLS: ${isTLS ? "enabled" : "disabled"})`);

  redisClient = createClient({
    url,
    socket: {
      tls: isTLS ? true : undefined,
      rejectUnauthorized: false,
      reconnectStrategy: (retries) => {
        const delay = Math.min(retries * 200, 5000); // cap at 5 seconds
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

  // Attempt first connection
  try {
    await redisClient.connect();
    console.log("[Redis ✅] Connected successfully");
  } catch (err) {
    console.error("[Redis ❌] Initial connection failed:", err.message);
  }

  // --- Heartbeat every 30s to keep socket alive ---
  if (!heartbeatInterval) {
    heartbeatInterval = setInterval(async () => {
      if (!redisClient?.isOpen) return;
      try {
        await redisClient.ping();
        // console.log("[Redis ❤️] PING OK"); // uncomment to verify heartbeat
      } catch (err) {
        console.warn("[Redis ⚠️] Heartbeat failed:", err.message);
      }
    }, 30_000);
  }

  return redisClient;
}

// ✅ Same limiter factory — no changes needed
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

module.exports = { createRedisClient, limiterFactory };
