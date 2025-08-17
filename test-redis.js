// test-redis.js
const { createClient } = require("redis");

(async () => {
  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  const r = createClient({ url });
  r.on("error", (e) => console.error("Redis error:", e));
  await r.connect();
  console.log("PING ->", await r.ping());         // Expect "PONG"
  await r.set("otp:test@example.com", "123456", { EX: 60 });
  console.log("GET ->", await r.get("otp:test@example.com")); // Expect "123456"
  console.log("TTL ->", await r.ttl("otp:test@example.com")); // ~60 then counting down
  await r.quit();
})();
