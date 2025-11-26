// /routes/squareWebhook.route.cjs
const crypto = require("crypto");
const express = require("express");
const router = express.Router();

// ✅ Square webhooks are POSTed as raw bytes — ensure express.raw() is applied in server setup:
// app.use("/api/square/webhook", express.raw({ type: "*/*" }), squareWebhookRoute);

router.post("/square/webhook", async (req, res) => {
  const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const sigHdr = req.headers["x-square-hmacsha256"];
  const rawBody = req.body; // raw Buffer (not parsed JSON)

  // --- Basic validation before crypto ---
  if (!sigKey) {
    console.error("[SquareWebhook] ❌ Missing SQUARE_WEBHOOK_SIGNATURE_KEY environment variable.");
    return res.status(500).json({ error: "Server misconfiguration" });
  }
  if (!sigHdr) {
    console.warn("[SquareWebhook] ⚠️ Missing x-square-hmacsha256 header.");
    return res.status(401).json({ error: "Missing signature header" });
  }
  if (!Buffer.isBuffer(rawBody)) {
    console.error("[SquareWebhook] ❌ Webhook body not received as Buffer. Ensure express.raw() middleware is used.");
    return res.status(400).json({ error: "Invalid body type" });
  }

  // --- Compute and validate signature ---
  let computedSig;
  try {
    computedSig = crypto
      .createHmac("sha256", sigKey)
      .update(rawBody)
      .digest("base64");

    // Compare signatures in constant time
    const match =
      computedSig.length === String(sigHdr).length &&
      crypto.timingSafeEqual(
        Buffer.from(computedSig, "utf8"),
        Buffer.from(String(sigHdr), "utf8")
      );

    if (!match) {
      console.error("[SquareWebhook] ❌ Signature mismatch.", {
        received: sigHdr,
        computed: computedSig,
      });
      return res.status(401).json({ error: "Invalid signature" });
    }
  } catch (err) {
    console.error("[SquareWebhook] ❌ Signature verification error:", err);
    return res.status(500).json({ error: "Signature verification failed" });
  }

  // --- Parse and validate JSON ---
  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch (err) {
    console.error("[SquareWebhook] ❌ Failed to parse JSON:", err);
    return res.status(400).json({ error: "Malformed JSON body" });
  }

  // --- Sanity check event object ---
  if (!event || typeof event !== "object" || !event.type) {
    console.warn("[SquareWebhook] ⚠️ Missing event type or invalid payload:", event);
    return res.status(400).json({ error: "Invalid event payload" });
  }

  //console.log(`[SquareWebhook] ✅ Verified event type: ${event.type}`);

  // --- Process event safely (decouple from request) ---
  try {
    // Example: queue for async background processing
    // await queueWebhookEvent(event);

    // Or handle directly (non-blocking)
    if (event.type === "payment.updated") {
      const paymentData = event.data?.object?.payment;

      if (!paymentData) {
        console.warn("[SquareWebhook] Missing payment data in event.");
        return;
      }

      const {
        id: squarePaymentId,
        status,
        amount_money,
        order_id,
        customer_id,
        updated_at
      } = paymentData;

      console.log(`[SquareWebhook] 🔔 Payment Update Event: ${squarePaymentId} → ${status}`);

      try {
        // Update a Payment row by its Square ID
        const updated = await prisma.payment.update({
          where: { squarePaymentId }, // Ensure this is in your Prisma Payment model
          data: {
            status,
            orderId: order_id || null,
            squareCustomerId: customer_id || null,
            amount: amount_money?.amount ? amount_money.amount / 100 : undefined,
            updatedAt: new Date(updated_at),
          },
        });

        console.log("[SquareWebhook] 💾 Payment updated in DB:", updated);
      } catch (err) {
        console.error("[SquareWebhook] ❌ Failed to update payment record:", err);
        // You can store failed updates for retrying later
      }
    }

    // Always respond fast — Square retries if response > 10s or non-2xx
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[SquareWebhook] ❌ Error while processing event:", err);
    // Still return 200 to prevent retries if the webhook data itself was valid
    return res.status(200).json({ ok: true, warning: "Processing failed internally" });
  }
});

module.exports = router;
