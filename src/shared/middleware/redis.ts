import Redis from "ioredis";
import { env } from "../../config/env.js";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    });
    client.on("error", (err) => {
      console.error("[redis] error:", err.message);
    });
  }
  return client;
}
