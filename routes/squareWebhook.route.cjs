// /routes/squareWebhook.route.cjs
const crypto = require("crypto");

module.exports = async function squareWebhookHandler(req, res) {
  try {
    const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    const sigHdr = req.headers["x-square-hmacsha256"];
    const rawBody = req.body; // captured as raw Buffer by express.raw()

    if (!sigKey) {
      console.error("[Webhook] Missing SQUARE_WEBHOOK_SIGNATURE_KEY env");
      return res.status(401).json({ error: "Missing signature key" });
    }
    if (!sigHdr) {
      console.error("[Webhook] Missing x-square-hmacsha256 header");
      return res.status(401).json({ error: "Missing signature header" });
    }

    // Compute HMAC SHA-256 Base64 signature
    const computedSig = crypto
      .createHmac("sha256", sigKey)
      .update(rawBody)
      .digest("base64");

    const sigMatch = crypto.timingSafeEqual(
      Buffer.from(computedSig, "utf8"),
      Buffer.from(String(sigHdr), "utf8")
    );

    if (!sigMatch) {
      console.error("[Webhook] Signature mismatch", {
        received: sigHdr,
        computed: computedSig,
      });
      return res.status(401).json({ error: "Invalid signature" });
    }

    // ✅ Verified: parse and handle the webhook data
    const event = JSON.parse(rawBody.toString("utf8"));
    console.log("[Webhook] Verified event type:", event?.type);

    // TODO: Queue this event or process here...

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[Webhook] Handler error:", err);
    return res.status(500).json({ error: "Internal webhook error" });
  }
};