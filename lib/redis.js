// lib/redis.js
const { createClient } = require("redis");

const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redis.on("error", (err) => {
  console.error("Redis Client Error", err);
});

let isConnected = false;

async function connectRedis() {
  if (!isConnected) {
    await redis.connect();
    isConnected = true;
    console.log("✅ Redis connected");
  }
  return redis;
}

module.exports = connectRedis;
