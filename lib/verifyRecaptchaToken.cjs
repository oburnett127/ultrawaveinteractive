const fetch = require("node-fetch");

async function verifyRecaptchaToken(token, expectedAction = null) {
  if (!token) {
    return { success: false, error: "missing-input-response" };
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.error("Missing RECAPTCHA_SECRET_KEY");
    return { success: false, error: "missing-secret-key" };
  }

  try {
    const params = new URLSearchParams();
    params.append("secret", secret);
    params.append("response", token);

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      body: params,
    });

    const data = await res.json();

    if (!data.success) return { success: false, error: data["error-codes"] };

    if (expectedAction && data.action !== expectedAction) {
      return { success: false, error: "invalid-action" };
    }

    if (data.score < 0.3) {
      return { success: false, error: "low-score" };
    }

    return { success: true, score: data.score, action: data.action };
  } catch (e) {
    console.error(e);
    return { success: false, error: "verify-failed" };
  }
}

module.exports = verifyRecaptchaToken;