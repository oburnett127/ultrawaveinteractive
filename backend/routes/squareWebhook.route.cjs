// /routes/squareWebhook.route.cjs
const crypto = require("crypto");
const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma.cjs"); // adjust path if needed

// ✅ Square webhooks are POSTed as raw bytes — ensure express.raw() is applied in server setup:
// app.use("/api/square/webhook", express.raw({ type: "*/*" }), squareWebhookRoute);

router.post("/square/webhook", async (req, res) => {
  // --------------------------------------------------
  // 🛑 Graceful shutdown guard (NEW)
  // --------------------------------------------------
  if (global.__SHUTTING_DOWN__) {
    // Tell Square to retry later instead of dropping the request
    return res.status(503).send("Server shutting down");
  }

  // Track in-flight webhook processing (NEW)
  global.__ACTIVE_WEBHOOKS__++;

  try {
    const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    const sigHdr = req.headers["x-square-hmacsha256"];
    const rawBody = req.body; // raw Buffer (not parsed JSON)

    // --- Basic validation before crypto ---
    if (!sigKey) {
      console.error(
        "[SquareWebhook] ❌ Missing SQUARE_WEBHOOK_SIGNATURE_KEY environment variable."
      );
      return res.status(500).json({ error: "Server misconfiguration" });
    }

    if (!sigHdr) {
      console.warn("[SquareWebhook] ⚠️ Missing x-square-hmacsha256 header.");
      return res.status(401).json({ error: "Missing signature header" });
    }

    if (!Buffer.isBuffer(rawBody)) {
      console.error(
        "[SquareWebhook] ❌ Webhook body not received as Buffer. Ensure express.raw() middleware is used."
      );
      return res.status(400).json({ error: "Invalid body type" });
    }

    // --- Compute and validate signature ---
    let computedSig;
    try {
      computedSig = crypto
        .createHmac("sha256", sigKey)
        .update(rawBody)
        .digest("base64");

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
      console.warn(
        "[SquareWebhook] ⚠️ Missing event type or invalid payload:",
        event
      );
      return res.status(400).json({ error: "Invalid event payload" });
    }

    // --- Process event safely ---
    if (event.type === "payment.updated") {
      const paymentData = event.data?.object?.payment;

      if (!paymentData) {
        console.warn("[SquareWebhook] Missing payment data in event.");
        return res.status(200).json({ ok: true });
      }

      const {
        id: squarePaymentId,
        status,
        amount_money,
        order_id,
        customer_id,
        updated_at,
      } = paymentData;

      console.log(
        `[SquareWebhook] 🔔 Payment Update Event: ${squarePaymentId} → ${status}`
      );

      try {
        await prisma.payment.update({
          where: { squarePaymentId },
          data: {
            status,
            orderId: order_id || null,
            squareCustomerId: customer_id || null,
            amount: amount_money?.amount
              ? amount_money.amount / 100
              : undefined,
            updatedAt: new Date(updated_at),
          },
        });

        console.log("[SquareWebhook] 💾 Payment updated in DB");
      } catch (err) {
        console.error(
          "[SquareWebhook] ❌ Failed to update payment record:",
          err
        );
        // NOTE: returning 200 prevents Square retries; log + recover later if needed
      }
    }

    // Always respond fast — Square retries on non-2xx or timeout
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[SquareWebhook] ❌ Error while processing event:", err);
    return res.status(200).json({
      ok: true,
      warning: "Processing failed internally",
    });
  } finally {
    // --------------------------------------------------
    // 🧹 Always decrement active webhook counter (NEW)
    // --------------------------------------------------
    global.__ACTIVE_WEBHOOKS__--;
  }
});

module.exports = router;
