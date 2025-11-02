const getRedis = require("../lib/redis.cjs");

module.exports = async function peekHandler(req, res) {
  // Disable in production
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }

  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: "email query param required" });
  }

  const lower = String(email).trim().toLowerCase();
  const key = `otp:${lower}`;

  try {
    const r = await getRedis();

    const value = await r.get(key);
    const ttl = await r.ttl(key); // -2: no key, -1: no expire, >=0: seconds remaining

    return res.status(200).json({
      key,
      value,
      ttl,
      message:
        ttl === -2
          ? "No key found"
          : ttl === -1
          ? "Key exists but has no expiration"
          : `Expires in ${ttl} seconds`,
    });
  } catch (e) {
    console.error("[otp/peek] error:", e);
    return res.status(500).json({ error: "peek failed" });
  }
};