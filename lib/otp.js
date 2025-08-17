import crypto from "crypto";
import { getRedis } from "./redis.cjs";

// 6-digit string
export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// HMAC-SHA256(code, salt) -> hex
function hmac(code, salt) {
  return crypto.createHmac("sha256", salt).update(code).digest("hex");
}

export async function saveOtpForEmail(email, code, ttlSeconds = 300) {
  const redis = getRedis();
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hmac(code, salt);

  const key = `otp:${email.toLowerCase()}`;
  await redis.set(key, JSON.stringify({ salt, hash }), "EX", ttlSeconds);

  // Throttle resend: 30s
  await redis.set(`otp:last:${email.toLowerCase()}`, Date.now().toString(), "EX", 30);

  return key;
}

export async function canResendOtp(email) {
  const redis = getRedis();
  const t = await redis.get(`otp:last:${email.toLowerCase()}`);
  return !t; // if null -> allowed
}

export async function verifyOtpForEmail(email, code) {
  const redis = getRedis();
  const key = `otp:${email.toLowerCase()}`;
  const data = await redis.get(key);
  if (!data) return false;

  const { salt, hash } = JSON.parse(data);
  const candidate = hmac(String(code || ""), salt);

  // timing-safe
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(candidate, "hex");
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (ok) await redis.del(key);
  return ok;
}
