// lib/redis.cjs
const { createClient } = require("redis");

let client;
let isConnecting = false;

async function getRedis() {
  if (client && client.isOpen) return client;
  if (isConnecting) {
    while (isConnecting) await new Promise(r => setTimeout(r, 50));
    return client;
  }

  isConnecting = true;

  // ✅ Use a safe default if REDIS_URL is not set
  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";

  client = createClient({ url });
  client.on("error", (err) => console.error("[redis] error:", err));
  client.on("connect", () => console.log(`[redis] connecting to ${url}`));
  client.on("ready",   () => console.log("[redis] ready"));

  await client.connect();
  isConnecting = false;
  return client;
}

module.exports = { getRedis };
