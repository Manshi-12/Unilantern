import { Redis } from "ioredis";
import { env } from "../../config/env.js";

type RedisClient = Redis;

let client: RedisClient | null = null;

export function getRedis(): RedisClient {
  if (!client) {
    if (!env.REDIS_URL) {
      throw new Error("REDIS_URL is required to initialise Redis");
    }

    client = new Redis(env.REDIS_URL, {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    });
    client.on("error", (err: Error) => {
      console.error("[redis] error:", err.message);
    });
  }
  return client;
}