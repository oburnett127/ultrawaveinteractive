const crypto = require("crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");
const prisma = require("../lib/prisma.cjs");

const router = express.Router();

// --- Helper: optional NextAuth session resolution ---
async function tryGetSession(req, res) {
  try {
    const { getServerSession } = await import("next-auth/next");
    const mod = await import("../pages/api/auth/[...nextauth].js");
    const authOptions = mod.authOptions || mod.default?.authOptions;
    if (!authOptions) return null;
    return await getServerSession(req, res, authOptions);
  } catch {
    return null;
  }
}

// --- Helper: strict USD parser ---
function parseUsdToCents(amountStr) {
  if (typeof amountStr !== "string") return null;
  const cleaned = amountStr.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [dollars, cents = ""] = cleaned.split(".");
  const c = (cents + "00").slice(0, 2);
  const result = parseInt(dollars, 10) * 100 + parseInt(c || "0", 10);
  return Number.isFinite(result) ? result : null;
}

// --- Helper: safe UUID generator ---
function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// --- Helper: timeout wrapper ---
async function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  );
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// --- Rate limiter: prevent abuse ---
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 payments per 15 minutes per IP
  message: { error: "Too many payment attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- POST /api/payment/charge ---
router.post("/payment/charge", paymentLimiter, async (req, res) => {
  const startTime = Date.now();

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const { sourceId, amount, currency, idempotencyKey } = req.body || {};

    // --- 1️⃣ Validate input ---
    if (!sourceId || typeof sourceId !== "string" || sourceId.length < 5) {
      return res.status(400).json({ ok: false, error: "Invalid or missing sourceId." });
    }

    const cents = parseUsdToCents(String(amount || ""));
    if (cents === null || cents <= 0) {
      return res.status(400).json({ ok: false, error: "Invalid amount format." });
    }
    if (cents > 1_000_000) {
      return res.status(400).json({ ok: false, error: "Maximum allowed amount is $10,000.00." });
    }

    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const version = process.env.SQUARE_VERSION || "2025-01-01";
    if (!accessToken) {
      console.error("[PaymentRoute] ❌ Missing SQUARE_ACCESS_TOKEN.");
      return res.status(500).json({ ok: false, error: "Payment service misconfigured." });
    }

    // --- 2️⃣ Try to resolve authenticated user (if available) ---
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
      console.warn("[PaymentRoute] ⚠️ Unable to resolve user session:", e.message);
    }

    // --- 3️⃣ Prepare Square API request ---
    const idem = idempotencyKey || uuid();
    const payload = {
      idempotency_key: idem,
      amount_money: { amount: cents, currency: currency || "USD" },
      source_id: sourceId,
      location_id: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
    };

    // --- 4️⃣ Perform payment request with timeout ---
    let squareRes, squareJson;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000); // 7s timeout
      squareRes = await fetch("https://connect.squareup.com/v2/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Square-Version": version,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      squareJson = await squareRes.json();
    } catch (apiErr) {
      console.error("[PaymentRoute] ❌ Square API network error:", apiErr);
      return res.status(502).json({ ok: false, error: "Payment gateway unavailable." });
    }

    // --- 5️⃣ Handle Square API errors ---
    if (!squareRes.ok) {
      const detail =
        squareJson?.errors?.[0]?.detail ||
        squareJson?.errors?.[0]?.code ||
        "Square charge failed.";
      console.error("[PaymentRoute] ❌ Square error:", squareJson);
      return res.status(squareRes.status).json({ ok: false, error: detail });
    }

    const sqPayment = squareJson?.payment;
    if (!sqPayment) {
      console.error("[PaymentRoute] ❌ Square response missing payment field:", squareJson);
      return res.status(502).json({ ok: false, error: "Malformed response from Square." });
    }

    // --- 6️⃣ Persist payment record in DB (gracefully) ---
    let saved = null;
    try {
      saved = await prisma.payment.create({
        data: {
          userId,
          amount: cents,
          currency: sqPayment.amount_money?.currency || currency || "USD",
          squarePaymentId: sqPayment.id,
          idempotencyKey: idem,
          status: sqPayment.status || "COMPLETED",
        },
      });
    } catch (dbErr) {
      console.error("[PaymentRoute] ❌ Failed to save payment:", dbErr);
      // not fatal — the payment succeeded at Square
    }

    console.info(
      `[PaymentRoute] ✅ Payment processed successfully: ${sqPayment.id} (${cents}¢ in ${
        sqPayment.amount_money?.currency
      }) [${Date.now() - startTime}ms]`
    );

    return res.status(200).json({
      ok: true,
      payment: {
        id: sqPayment.id,
        status: sqPayment.status,
        amount: sqPayment.amount_money?.amount,
        currency: sqPayment.amount_money?.currency,
      },
      savedId: saved?.id || null,
    });
  } catch (err) {
    console.error("[PaymentRoute] ❌ Unhandled payment error:", err);
    return res.status(500).json({
      ok: false,
      error: "Payment server error.",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

module.exports = router;
