const express = require("express");
const crypto = require("crypto");
const router = express.Router();

// Ensure raw body is captured - must be applied BEFORE any bodyParser middleware!
router.use(
  "/square/webhook",
  express.raw({ type: "*/*" }) // capture all content-types as raw buffer
);

router.post("/square/webhook", (req, res) => {
  try {
    const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    const sigHdr = req.headers["x-square-hmacsha256"];
    const ct = req.headers["content-type"];

    if (!sigKey) {
      console.error("[webhook] Missing SQUARE_WEBHOOK_SIGNATURE_KEY env");
      return res.status(401).json({ error: "Missing signature key env" });
    }
    if (!sigHdr) {
      console.error("[webhook] Missing x-square-hmacsha256 header");
      return res.status(401).json({ error: "Missing signature header" });
    }

    const raw = req.body; // raw buffer from express.raw()

    console.log("[webhook] meta", {
      ct,
      rawLen: raw?.length || 0,
      sigHdrPreview: String(sigHdr).slice(0, 10) + "...",
      hasKey: !!sigKey,
    });

    // Compute base64 HMAC over **raw** body
    const computedB64 = crypto
      .createHmac("sha256", sigKey)
      .update(raw)
      .digest("base64");

    // Constant-time compare
    const a = Buffer.from(computedB64, "utf8");
    const b = Buffer.from(String(sigHdr), "utf8");
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!ok) {
      console.error("[webhook] Invalid signature", {
        recvLen: b.length,
        compLen: a.length,
        recvPreview:
          String(sigHdr).slice(0, 10) + "...",
        compPreview:
          computedB64.slice(0, 10) + "...",
      });
      return res.status(401).json({ error: "Invalid signature" });
    }

    // ✅ Verified: parse and handle the webhook event
    const evt = JSON.parse(raw.toString("utf8"));
    console.log("[webhook] verified event:", evt?.type);

    // You can respond immediately or queue this event for async processing
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[webhook] error:", err);
    return res.status(500).json({ error: "Webhook handler error" });
  }
});

module.exports = router;
