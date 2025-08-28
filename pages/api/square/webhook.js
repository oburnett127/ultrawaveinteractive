// pages/api/square/webhook.js
import crypto from "crypto";

export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const sigHdr = req.headers["x-square-hmacsha256"]; // base64 string
  const ct = req.headers["content-type"];

  // TEMP: explicit missing checks with distinct messages
  if (!sigKey) {
    console.error("[webhook] Missing SQUARE_WEBHOOK_SIGNATURE_KEY env");
    return res.status(401).json({ error: "Missing signature key env" });
  }
  if (!sigHdr) {
    console.error("[webhook] Missing x-square-hmacsha256 header");
    return res.status(401).json({ error: "Missing signature header" });
  }

  const raw = await readRawBody(req);

  // TEMP: log minimal meta (no secrets)
  console.log("[webhook] meta", {
    ct,
    rawLen: raw?.length || 0,
    sigHdrPreview: String(sigHdr).slice(0, 10) + "...",
    hasKey: !!sigKey,
  });

  // Compute base64 HMAC over **raw** body
  const computedB64 = crypto.createHmac("sha256", sigKey).update(raw).digest("base64");

  // Constant-time compare
  const a = Buffer.from(computedB64, "utf8");
  const b = Buffer.from(String(sigHdr), "utf8");
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!ok) {
    console.error("[webhook] Invalid signature", {
      recvLen: b.length,
      compLen: a.length,
      recvPreview: String(sigHdr).slice(0, 10) + "...",
      compPreview: computedB64.slice(0, 10) + "...",
    });
    return res.status(401).json({ error: "Invalid signature" });
  }

  // ✅ Verified: parse and return OK
  const evt = JSON.parse(raw.toString("utf8"));
  console.log("[webhook] verified event:", evt?.type);
  return res.status(200).json({ ok: true });
}
