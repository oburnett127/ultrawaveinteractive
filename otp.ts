import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379'); // Local Redis for dev

// Generate a random 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP in Redis with a 5-minute expiration
export async function storeOTP(email: string, otp: string): Promise<void> {
  const ttl = 300; // 300 seconds = 5 minutes
  await redis.set(`otp:${email}`, otp, 'EX', ttl); // Key = otp:<email>
}

// Validate OTP
export async function validateOTP(email: string, enteredOTP: string): Promise<boolean> {
  const storedOTP = await redis.get(`otp:${email}`);
  if (!storedOTP) return false; // OTP expired or not found
  return storedOTP === enteredOTP;
}

// Delete OTP after successful verification
export async function deleteOTP(email: string): Promise<void> {
  await redis.del(`otp:${email}`);
}
