const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function verifyV3(token) {

  console.error("🔥 VERIFY FUNCTION HIT:", __filename);

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret || !token) return { success: false };

  const params = new URLSearchParams({ secret, response: token });

  const res = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );

  const data = await res.json();
  return data;
}

module.exports = verifyV3;
