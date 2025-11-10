async function verifyRecaptchaToken(token) {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY; // Must be set in Northflank / .env

    if (!secretKey) {
      console.error("[verifyRecaptchaToken] Missing RECAPTCHA_SECRET_KEY in environment");
      return { success: false };
    }

    const params = new URLSearchParams();
    params.append("secret", secretKey);
    params.append("response", token);

    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString(),
    });

    if (res.status === 429) {
      console.warn("Rate limited. Backing off.");
      return; // don't retry immediately
    }
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await response.json();
    return data; // Example: { success: true, score: 0.9, action: "contact" }
  } catch (err) {
    console.error("[verifyRecaptchaToken] Error verifying token:", err);
    return { success: false };
  }
}

module.exports = verifyRecaptchaToken;