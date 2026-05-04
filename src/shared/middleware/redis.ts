import { createRequire } from "node:module";
import type { Redis as RedisType } from "ioredis";
import { env } from "../../config/env.js";

const require = createRequire(import.meta.url);
const Redis = require("ioredis") as new (...args: any[]) => RedisType;

let client: RedisType | null = null;

export function getRedis(): RedisType {
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
