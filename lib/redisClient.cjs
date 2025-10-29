// /lib/redisClient.cjs
const { createClient } = require("redis");
const { RateLimiterRedis } = require("rate-limiter-flexible");

async function createRedisClient() {
  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = process.env.REDIS_PORT || 6379;
  const password = process.env.REDIS_PASSWORD || null;

  const url = password
    ? `redis://:${password}@${host}:${port}`
    : `redis://${host}:${port}`;

  console.log(`[Redis] Connecting to ${host}:${port}...`);
  const client = createClient({ url });

  client.on("error", (err) => console.error("[Redis Error ❌]", err));

  await client.connect();
  console.log("[Redis] Connected ✅");

  return client;
}

function limiterFactory({ redisClient, points, duration, blockDuration, keyPrefix }) {
  if (!redisClient) throw new Error("Redis client is not initialized for limiter factory.");

  return new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix,
    points,       // max number of requests
    duration,     // per X seconds
    blockDuration // block for X seconds when limit is exceeded
  });
}

module.exports = { createRedisClient, limiterFactory };
