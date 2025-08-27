// pages/api/square/webhook.js
import crypto from "crypto";
import prisma from "../../../lib/prisma.cjs";

// Square sends base64 HMAC in the x-square-hmacsha256 header.
// We must verify against the RAW request body (not JSON-parsed).

export const config = {
  api: { bodyParser: false }, // important: use raw body
};

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

  try {
    const signatureHeader = req.headers["x-square-hmacsha256"];
    const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    if (!sigKey || !signatureHeader) {
      console.error("Missing signature or key");
      return res.status(401).end("Missing signature");
    }

    const raw = await readRawBody(req);

    // Compute HMAC (base64) over raw body with your signature key
    const computed = crypto
      .createHmac("sha256", sigKey)
      .update(raw)
      .digest("base64");

    if (computed !== signatureHeader) {
      console.error("Invalid webhook signature");
      return res.status(401).end("Invalid signature");
    }

    // Verified! Now we can trust the JSON.
    const evt = JSON.parse(raw.toString("utf8"));
    const evtType = evt?.type;
    const payment = evt?.data?.object?.payment;
    const sqId = payment?.id;
    const status = payment?.status;

    // Optional de-duplication: upsert by Square payment id
    if (evtType?.startsWith("payment.") && sqId) {
      await prisma.payment.upsert({
        where: { squarePaymentId: sqId },
        update: { status: status || undefined },
        create: {
          // If this event arrives before your charge response was persisted,
          // set minimal info. You can enrich later if needed.
          squarePaymentId: sqId,
          status: status || "PENDING",
          currency: payment?.amount_money?.currency || "USD",
          amount: payment?.amount_money?.amount ?? 0,
          idempotencyKey: `webhook-${evt?.event_id || sqId}`, // ensure unique
        },
      });
    }

    // Always respond 200 to stop Square from retrying (after successful handling)
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Square webhook error:", e);
    // If verification passed but processing failed, you can still return 200
    // to avoid retries—or return 500 to let Square retry.
    res.status(200).json({ ok: true });
  }
}
