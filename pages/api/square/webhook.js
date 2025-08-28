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
  if (req.method !== "POST") return res.status(405).end();

  const signature = req.headers["x-square-hmacsha256"];
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!signature || !key) return res.status(401).end("Missing signature");

  const raw = await readRawBody(req);
  const computedB64 = crypto.createHmac("sha256", key).update(raw).digest("base64");

  const a = Buffer.from(computedB64, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) {
    console.error("Invalid webhook signature", {
      recv_len: b.length, comp_len: a.length,
      recv_preview: String(signature).slice(0, 8) + "...",
      comp_preview: computedB64.slice(0, 8) + "..."
    });
    return res.status(401).end("Invalid signature");
  }

  // ✅ Verified
  const evt = JSON.parse(raw.toString("utf8"));
  // ... process event ...
  return res.status(200).json({ ok: true });
}
