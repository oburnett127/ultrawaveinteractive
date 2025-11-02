const getRedis = require("../lib/redis.cjs");

async function verifyRecaptchaToken(token) {
  if (!token) {
    return { success: false, "error-codes": ["missing-input-response"] }; // Token is missing
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.error("Missing reCAPTCHA secret key in environment variables.");
    return { success: false, "error-codes": ["missing-secret-key"] };
  }

  const verificationURL = "https://www.google.com/recaptcha/api/siteverify";

  try {
    const response = await fetch(verificationURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }).toString(),
    });

    if (response.ok === false) {
      console.error(`reCAPTCHA verification failed: ${response.statusText}`);
      return { success: false, "error-codes": ["verification-failed"] };
    }

    const data = (await response.json());
    //console.log("Google's reCAPTCHA verification response:", data); // Debugging

    // Handle failure from Google's response
    if (data.success === false) {
      console.error("reCAPTCHA verification failed:", data);
      return { success: false, "error-codes": data["error-codes"] };
    }

    // Success case
    return data;
  } catch (error) {
    console.error("Error verifying reCAPTCHA token:", error);
    return { success: false, "error-codes": ["internal-error"] };
  }
}

module.exports = async function verifyRecaptchaHandler(req, res) {
  const { recaptchaToken } = req.body;

  if (!recaptchaToken) {
    return res.status(400).json({ success: false, message: "Token is missing." });
  }

  try {
    // --- Redis IP Rate Limiting ---
    const r = await getRedis();
    const ip = req.ip; // Express will automatically capture IP even behind proxies if trust proxy is set
    const rateKey = `rate:recaptcha:${ip}`;
    const attempts = await r.incr(rateKey);

    if (attempts === 1) {
      // Set expiration if it's the first increment
      await r.expire(rateKey, 60); // window of 60 seconds
    }

    if (attempts > 10) {
      return res.status(429).json({
        success: false,
        message: "Too many reCAPTCHA verification attempts. Please wait a minute and try again.",
      });
    }

    // --- Verify Token with Google ---
    const data = await verifyRecaptchaToken(recaptchaToken);

    if (data.success === true) {
      return res.status(200).json({
        success: true,
        message: "reCAPTCHA verification successful.",
      });
    } else {
      console.error("reCAPTCHA verification failed:", data["error-codes"]);
      return res.status(400).json({
        success: false,
        message: "reCAPTCHA verification failed.",
        errors: data["error-codes"],
      });
    }
  } catch (error) {
    console.error("Error verifying reCAPTCHA:", error.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred during reCAPTCHA verification.",
    });
  }
};