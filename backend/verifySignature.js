const crypto = require("crypto");

const SQUARE_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

function verifySquareSignature(signatureHeader, rawBodyBuffer) {
  if (!signatureHeader || !SQUARE_SIGNATURE_KEY) return false;

  const hmac = crypto.createHmac("sha256", SQUARE_SIGNATURE_KEY);
  const digest = hmac.update(rawBodyBuffer).digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(digest)
  );
}

module.exports = verifySquareSignature;
