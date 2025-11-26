// verifyRecaptchaToken.cjs

// ✔ FIX: fetch for CommonJS Node.js
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function verifyRecaptchaToken(token, expectedAction = null) {
  if (!token) {
    return { success: false, error: "missing-input-response" };
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  
  //console.log("🔍 Secret exists:", !!secret);

  if (!secret) {
    console.error("Missing RECAPTCHA_SECRET_KEY");
    return { success: false, error: "missing-secret-key" };
  }

  try {
    const params = new URLSearchParams();
    params.append("secret", secret);
    params.append("response", token);

    // ✔ FIX: Send correct headers + stringify body
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      console.error(`reCAPTCHA HTTP error: ${res.status}`);
      return { success: false, error: "http-failure" };
    }

    const data = await res.json();
  
    //console.log("🔍 Google response data:", data);

    if (!data.success) {
      return { success: false, error: data["error-codes"] || "failed" };
    }

    if (expectedAction && data.action !== expectedAction) {
      return { success: false, error: "invalid-action" };
    }

    if (data.score < 0.3) {
      return { success: false, error: "low-score", score: data.score };
    }

    return { success: true, score: data.score, action: data.action };
  } catch (err) {
    console.error("Error verifying reCAPTCHA:", err);
    return { success: false, error: "verify-failed" };
  }
}

module.exports = verifyRecaptchaToken;