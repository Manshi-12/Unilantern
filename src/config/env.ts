import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("127.0.0.1"),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  JWT_ACCESS_TTL: z.string().default("15m"),

  OTP_TTL_SECONDS: z.coerce.number().default(300),

  BCRYPT_ROUNDS: z.coerce.number().default(10),

  REDIS_URL: z.string().optional().default(""),
  DOB_ENCRYPTION_KEY: z.string().optional().default(""),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", z.treeifyError(parsed.error));
  throw new Error("Environment validation failed");
}

export const env: Env = parsed.data;