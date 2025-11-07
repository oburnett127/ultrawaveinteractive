// /lib/redisManager.cjs
const { createClient } = require("redis");

let redisClient;

async function getClient() {
  if (!redisClient) {
    const useTLS = process.env.REDIS_USE_TLS === "true";
    const url = process.env.REDIS_URL;

    redisClient = createClient({
      url,
      socket: useTLS ? { tls: true } : {},
    });

    redisClient.on("error", (err) => {
      console.error("❌ Redis Client Error:", err.message);
    });

    await redisClient.connect();
  }

  return redisClient;
}

async function ensureRedisConnected() {
  try {
    const client = await getClient();
    await client.ping();
    console.log("✅ Redis connected");
  } catch (err) {
    console.error("❌ Failed to connect to Redis:", err.message);
    throw err;
  }
}

module.exports = {
  getClient,
  ensureRedisConnected,
};
