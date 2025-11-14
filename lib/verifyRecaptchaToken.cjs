// verifyRecaptchaToken.cjs

// If you're on Node 18+ you do NOT need to import 'node-fetch'
// But if you want to guarantee compatibility, uncomment this:
// const fetch = require("node-fetch"); 

async function verifyRecaptchaToken(token) {
  try {
    if (!token) {
      console.error("[verifyRecaptchaToken] Missing token");
      return { success: false };
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
      console.error("[verifyRecaptchaToken] Missing RECAPTCHA_SECRET_KEY in environment");
      return { success: false };
    }

    const params = new URLSearchParams();
    params.append("secret", secretKey);
    params.append("response", token);

    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    // ❌ FIXED: you used "res" instead of "response"
    if (response.status === 429) {
      console.warn("[verifyRecaptchaToken] Rate limited (429).");
      return { success: false, error: "rate_limited" };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data; 
    // Expected response example:
    // { success: true, score: 0.9, action: "contact" }

  } catch (err) {
    console.error("[verifyRecaptchaToken] Error verifying token:", err);
    return { success: false };
  }
}

module.exports = verifyRecaptchaToken;