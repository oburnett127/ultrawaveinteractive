import Redis from "ioredis";

let redis;
export function getRedis() {
  if (!redis) {
    if (!process.env.REDIS_URL) {
      throw new Error("REDIS_URL is not set");
    }
    redis = new Redis(process.env.REDIS_URL);
  }
  return redis;
}
