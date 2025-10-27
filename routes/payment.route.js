import crypto from "crypto";
import prisma from "../lib/prisma.cjs";

// OPTIONAL: if you have a NextAuth session and exported authOptions from [...nextauth].js,
// this will attach userId/email to the Payment row. If not, it will still work without it.
async function tryGetSession(req, res) {
  try {
    const { getServerSession } = await import("next-auth/next");
    // You need to export `authOptions` from your [...nextauth].js for this to work:
    const mod = await import("../pages/api/auth/[...nextauth].js");
    const authOptions = mod.authOptions || mod.default?.authOptions;
    if (!authOptions) return null;
    return await getServerSession(req, res, authOptions);
  } catch {
    return null;
  }
}

// Strict amount parsing on the server
function parseUsdToCents(amountStr) {
  if (typeof amountStr !== "string") return null;
  const cleaned = amountStr.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [dollars, cents = ""] = cleaned.split(".");
  const c = (cents + "00").slice(0, 2);
  const result = parseInt(dollars, 10) * 100 + parseInt(c || "0", 10);
  return Number.isFinite(result) ? result : null;
}

// Small helper
function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { sourceId, amount, currency, idempotencyKey } = req.body || {};
    if (!sourceId) return res.status(400).json({ error: "Missing sourceId" });

    const cents = parseUsdToCents(String(amount || ""));
    if (cents === null) return res.status(400).json({ error: "Invalid amount format" });
    if (cents <= 0) return res.status(400).json({ error: "Amount must be greater than 0" });
    if (cents > 1_000_000) return res.status(400).json({ error: "Maximum allowed is $10,000.00" });

    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    if (!accessToken) {
      console.error("SQUARE_ACCESS_TOKEN missing");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    // Resolve optional userId from NextAuth session (if available)
    let userId = null;
    try {
      const session = await tryGetSession(req, res);
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true },
        });
        userId = user?.id || null;
      }
    } catch (e) {
      // not fatal
      console.warn("Unable to resolve user session for payment:", e?.message || e);
    }

    const idem = idempotencyKey || uuid();

    // Create payment with Square
    const squareRes = await fetch("https://connect.squareup.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2025-05-15", // keep reasonably current
      },
      body: JSON.stringify({
        idempotency_key: idem,
        amount_money: { amount: cents, currency: currency || "USD" },
        source_id: sourceId,
        // optional: location_id: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID
      }),
    });

    const squareJson = await squareRes.json();

    if (!squareRes.ok) {
      // Handle idempotency conflict gracefully if you want:
      // 409 -> already processed with same idempotency key
      console.error("Square /payments error:", squareJson);
      const detail =
        squareJson?.errors?.[0]?.detail ||
        squareJson?.errors?.[0]?.code ||
        "Square charge failed";
      return res.status(squareRes.status).json({ error: detail, raw: squareJson });
    }

    const sqPayment = squareJson.payment;
    // Persist the row in your DB
    const saved = await prisma.payment.create({
      data: {
        userId,
        amount: cents,
        currency: sqPayment?.amount_money?.currency || (currency || "USD"),
        squarePaymentId: sqPayment?.id,
        idempotencyKey: idem,
        status: sqPayment?.status || "COMPLETED",
      },
    });

    return res.status(200).json({
      ok: true,
      payment: {
        id: sqPayment?.id,
        status: sqPayment?.status,
        amount: sqPayment?.amount_money?.amount,
        currency: sqPayment?.amount_money?.currency,
      },
      savedId: saved.id,
    });
  } catch (err) {
    console.error("Square pay handler error:", err);
    return res.status(500).json({ error: "Payment server error" });
  }
}
