// pages/api/otp/peek.js
const { getRedis } = require("../../../lib/redis.js");

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (process.env.NODE_ENV === "production") return json(res, 404, { error: "Not found" });

  const { email } = req.query || {};
  if (!email) return json(res, 400, { error: "email query param required" });

  const lower = String(email).trim().toLowerCase();
  const key = `otp:${lower}`;
  try {
    const r = await getRedis();
    const val = await r.get(key);
    const ttl = await r.ttl(key); // -2: no key, -1: no expire, >=0: seconds remaining
    return json(res, 200, { key, value: val, ttl });
  } catch (e) {
    console.error("[otp/peek] error:", e);
    return json(res, 500, { error: "peek failed" });
  }
}
