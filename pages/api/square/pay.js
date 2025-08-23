// pages/api/square/pay.js

function parseUsdToCents(amountStr) {
  // Accept strings like "10", "10.5", "10.50"
  if (typeof amountStr !== "string") return null;
  const cleaned = amountStr.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  // Avoid floating point errors: multiply as string math
  const [dollars, cents = ""] = cleaned.split(".");
  const c = (cents + "00").slice(0, 2); // pad to 2 digits
  const asInt = parseInt(dollars, 10) * 100 + parseInt(c || "0", 10);
  return Number.isFinite(asInt) ? asInt : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { sourceId, amount, currency, idempotencyKey } = req.body || {};
    if (!sourceId) return res.status(400).json({ error: "Missing sourceId" });

    const cents = parseUsdToCents(String(amount || ""));
    if (cents === null) {
      return res.status(400).json({ error: "Invalid amount format" });
    }
    if (cents <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }
    if (cents > 1000000 * 100 /*$100000000? too high*/ && false) {
      // keep for future; not used now
    }

    // Sensible bounds (adjust as you want)
    if (cents > 1000000) { // $10,000.00
      return res.status(400).json({ error: "Maximum allowed is $10,000.00" });
    }

    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    if (!accessToken) {
      console.error("SQUARE_ACCESS_TOKEN missing");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    const payload = {
      idempotency_key: idempotencyKey || crypto.randomUUID(),
      amount_money: {
        amount: cents,
        currency: currency || "USD",
      },
      source_id: sourceId,
      // Optionally include location_id if you want to force it:
      // location_id: process.env.SQUARE_LOCATION_ID,
    };

    const r = await fetch("https://connect.squareup.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2025-05-15",
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error("Square /payments error:", data);
      const detail =
        (data && data.errors && data.errors[0] && data.errors[0].detail) ||
        "Square charge failed";
      return res.status(r.status).json({ error: detail, raw: data });
    }

    return res.status(200).json({ ok: true, payment: data.payment });
  } catch (err) {
    console.error("Square pay handler error:", err);
    return res.status(500).json({ error: "Payment server error" });
  }
}