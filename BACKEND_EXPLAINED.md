# UniLantern Backend — Complete Beginner's Guide

> Read this top-to-bottom. By the end you will understand **every file**, how
> the server starts, how a student logs in, and which pieces you can reuse for
> any future module.

---

## Table of Contents

1. [Big Picture — How a Request Travels](#1-big-picture)
2. [How the Server Turns On](#2-how-the-server-turns-on)
3. [config/ — App Settings](#3-config)
4. [shared/response/ — How We Send Data Back](#4-shared-response)
5. [shared/errors/ — How We Throw Errors](#5-shared-errors)
6. [shared/utils/ — Reusable Tools](#6-shared-utils)
7. [shared/middleware/ — Code That Runs Before Every Request](#7-shared-middleware)
8. [db/ — Database Connection & Table Definitions](#8-db)
9. [modules/auth/student/ — The Auth Module](#9-student-auth-module)
10. [Auth Flow — Step-by-Step Story](#10-auth-flow-stories)
11. [What Is Reusable (and How to Reuse It)](#11-reusability-guide)
12. [Glossary for Beginners](#12-glossary)

---

## 1. Big Picture

Think of the backend as a **post office**.

```
Browser / Mobile App
        │
        │  HTTP Request (JSON body)
        ▼
┌─────────────────────────────────────────────────────────┐
│                      Express App                        │
│                                                         │
│  Middleware chain (runs on EVERY request):              │
│    1. CORS        → allows browser to talk to us        │
│    2. JSON parser → turns raw text into JS object       │
│    3. Request-ID  → stamps every request with a UUID    │
│    4. Rate Limiter→ blocks if too many requests         │
│                                                         │
│  Router picks the right controller method               │
│                                                         │
│  Controller → validates input → calls Service           │
│  Service    → business logic  → calls Repository        │
│  Repository → talks to the database (MSSQL)             │
│                                                         │
│  Response travels back as JSON                          │
└─────────────────────────────────────────────────────────┘
        │
        │  HTTP Response (JSON)
        ▼
Browser / Mobile App
```

Every successful response looks like:
```json
{
  "success": true,
  "request_id": "uuid-here",
  "data": { ... }
}
```

Every error response looks like:
```json
{
  "success": false,
  "request_id": "uuid-here",
  "error": {
    "code": "OTP_INVALID",
    "message": "Invalid OTP code",
    "details": { "otp_code": ["Must be 6 digits"] }
  }
}
```

---

## 2. How the Server Turns On

### `src/server.ts` — The Entry Point

```
npm run dev
  └─► tsx watches src/server.ts
        └─► Node.js executes server.ts
              └─► imports app.ts
                    └─► starts listening on port 3000
```

**Line by line:**

```typescript
import "dotenv/config";
```
> Loads your `.env` file into `process.env` FIRST, before anything else.
> This must be the very first import so that `JWT_SECRET`, `DATABASE_URL` etc.
> are available when other files read `process.env`.

```typescript
import app from "./app.js";
```
> Imports the configured Express application (all routes, middleware, error
> handlers already attached).

```typescript
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "127.0.0.1";
```
> Read port and host from .env. Fall back to 3000 / 127.0.0.1 if not set.

```typescript
const server = app.listen(port, host, () => {
  console.log(`Server running at http://localhost:${port}`);
});
```
> **This is the moment the server opens a socket and starts accepting
> connections.** The callback runs once, just to print the log line.

```typescript
const shutdown = (signal: string) => {
  server.close(() => { process.exit(0); });
};
process.on("SIGINT",  () => shutdown("SIGINT"));   // Ctrl+C in terminal
process.on("SIGTERM", () => shutdown("SIGTERM"));  // Docker / system kill
```
> **Graceful shutdown.** When the process is asked to stop, we wait for
> in-flight requests to finish before killing the process, so no request
> gets cut off mid-way.

---

### `src/app.ts` — The Express App

This file builds and exports the Express application. Think of it as
**assembling the post office** — adding all the desks, rules, and departments
before opening the doors.

```typescript
import cors from "cors";
app.use(cors());
```
> CORS = Cross-Origin Resource Sharing. Browsers block requests to a different
> domain by default. This middleware tells the browser "yes, our API allows
> external frontends to call us."

```typescript
app.use(express.json({ limit: "1mb" }));
```
> Parses the raw HTTP body bytes into a JavaScript object and puts it in
> `req.body`. The `1mb` limit prevents huge payloads from crashing the server.

```typescript
app.use(requestId);
```
> Adds a unique ID to every request so we can trace it through logs.
> Stored in `res.locals.requestId` and sent back as `X-Request-Id` header.

```typescript
app.use("/auth/student", studentAuthRouter);
```
> **Route mounting.** Any request that starts with `/auth/student` is handed
> to the student auth router. Everything inside that router uses paths
> *relative* to `/auth/student`, so `/otp/send` becomes `/auth/student/otp/send`.

```typescript
app.use((_req, res) => {
  sendError(res, "NOT_FOUND", "Route not found", 404);
});
```
> **404 handler.** If no route matched, we return a JSON 404 (not an HTML page).

```typescript
app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) { ... }
  if (err instanceof AppError) { ... }
  sendError(res, "INTERNAL_ERROR", "An unexpected error occurred", 500);
});
```
> **Global error handler.** Express recognises this as an error handler because
> it has **4 parameters** (err, req, res, next). When any controller calls
> `next(err)`, execution jumps here.
>
> Priority order:
> 1. ZodError → 422 Unprocessable Entity + field-level details
> 2. AppError (our custom errors) → their own status code
> 3. Anything else → 500 Internal Server Error

---

## 3. Config

### `src/config/env.ts` — Environment Validation

```typescript
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV:           z.enum(["development","test","production"]).default("development"),
  PORT:               z.coerce.number().default(3000),
  DATABASE_URL:       z.string().min(1),
  REDIS_URL:          z.string().min(1),
  JWT_SECRET:         z.string().min(32),
  JWT_ACCESS_TTL:     z.string().default("15m"),
  OTP_TTL_SECONDS:    z.coerce.number().default(600),
  DOB_ENCRYPTION_KEY: z.string().min(64),
});
```
> Defines **what environment variables the app needs** and their types.
> `z.coerce.number()` converts the string "3000" from .env to the number 3000.

```typescript
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", z.treeifyError(parsed.error));
  throw new Error("Environment validation failed");
}
export const env = parsed.data;
```
> If any required variable is missing or wrong, the app **crashes immediately**
> at startup with a clear error message. This is intentional — it's better to
> crash on startup than silently use wrong config in production.
>
> After this file is imported, all other files use `env.JWT_SECRET` instead of
> `process.env.JWT_SECRET` — fully typed and validated.

---

### `src/config/constants.ts` — Magic Numbers in One Place

```typescript
export const OTP_TTL_SECONDS = 600;      // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;       // wrong attempts before lockout
export const OTP_CODE_LENGTH = 6;        // digits in the OTP
export const BCRYPT_COST = 10;           // bcrypt hashing rounds
export const JWT_ACCESS_TTL = "15m";     // token lifetime
```
> Never scatter `600` or `5` across the codebase. Put them here once.
> When a product manager says "change OTP expiry to 15 minutes", you change
> **one number** and it propagates everywhere.

```typescript
export const RATE_LIMITS = {
  OTP_SEND:   { limit: 5,  window: 3600 },
  OTP_VERIFY: { limit: 5,  window: 3600 },
  SIGNUP:     { limit: 3,  window: 3600 },
  LOGIN:      { limit: 10, window: 3600 },
} as const;
```
> Rate limit config for each action. `as const` makes TypeScript treat these
> as exact values (not just `number`), which prevents accidental mutation.

---

## 4. Shared Response

### `src/shared/response/http-status.ts`

```typescript
export const HttpStatus = {
  OK:                  200,
  CREATED:             201,
  UNAUTHORIZED:        401,
  NOT_FOUND:           404,
  CONFLICT:            409,
  UNPROCESSABLE_ENTITY:422,
  TOO_MANY_REQUESTS:   429,
  INTERNAL_SERVER_ERROR:500,
} as const;
```
> Instead of writing the number `409` everywhere, you write
> `HttpStatus.CONFLICT`. Much clearer, and typo-proof.
> **Reusable** in every module.

---

### `src/shared/response/error-codes.ts`

```typescript
export const AuthErrorCode = {
  OTP_INVALID:             "OTP_INVALID",
  OTP_EXPIRED:             "OTP_EXPIRED",
  PHONE_ALREADY_REGISTERED:"PHONE_ALREADY_REGISTERED",
  // ... 16 total
} as const;

export type AuthErrorCode = (typeof AuthErrorCode)[keyof typeof AuthErrorCode];
```
> A string enum of every error code the API can return.
>
> The trick `(typeof AuthErrorCode)[keyof typeof AuthErrorCode]` creates a type
> that is the *union of all the string values*:
> `"OTP_INVALID" | "OTP_EXPIRED" | ...`
>
> This means TypeScript will complain if you use an error code that doesn't
> exist. **Reusable** — add more codes here as you build more modules.

---

### `src/shared/response/success.ts`

```typescript
export function sendSuccess<T>(res, data: T, status = 200, meta?): void {
  res.status(status).json({
    success: true,
    request_id: res.locals.requestId ?? uuidv4(),
    data,
    ...(meta ? { meta } : {}),
  });
}
```
> **The ONLY way to send a success response.** The `<T>` generic means it
> works with any data type. TypeScript will infer `T` from what you pass in.
>
> Example usage:
> ```typescript
> sendSuccess(res, { expires_in_seconds: 600, phone_masked: "+1•••••1234" });
> ```
> **Reusable** in every single controller.

---

### `src/shared/response/error.ts`

```typescript
export function sendError(res, code, message, status, details?): void {
  res.status(status).json({
    success: false,
    request_id: res.locals.requestId ?? uuidv4(),
    error: { code, message, ...(details ? { details } : {}) },
  });
}
```
> **The ONLY way to send an error response.** The `details` field carries
> field-level validation errors like `{ phone_number: ["Invalid E.164 format"] }`.
> **Reusable** everywhere.

---

## 5. Shared Errors

These are JavaScript `Error` classes that carry extra data (status code, error
code). Instead of scattering `res.status(409).json(...)` across your code,
you **throw an error object** and let the global error handler in `app.ts`
format the response.

### `src/shared/errors/app-error.ts` — Base Class

```typescript
export class AppError extends Error {
  constructor(
    public readonly code: string,        // e.g. "PHONE_ALREADY_REGISTERED"
    public readonly message: string,     // human-readable
    public readonly statusCode: number,  // HTTP status
    public readonly details?: Record<string, string[]>  // optional field errors
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```
> `new.target.name` makes the error show the subclass name (e.g. `AuthError`)
> in stack traces instead of just `Error`.
>
> `Object.setPrototypeOf(this, new.target.prototype)` is required in TypeScript
> when extending built-ins like `Error` — without it, `instanceof` checks break.

---

### `src/shared/errors/auth-error.ts`

```typescript
export class AuthError extends AppError {
  constructor(code: AuthErrorCode, message: string, statusCode = 401) {
    super(code, message, statusCode);
  }
}
```
> Extends AppError. Default status is `401 Unauthorized`, but you can pass
> `403`, `404`, `429` etc.
>
> **How to throw:**
> ```typescript
> throw new AuthError(AuthErrorCode.OTP_EXPIRED, "OTP has expired");
> // → HTTP 401, code "OTP_EXPIRED"
>
> throw new AuthError(AuthErrorCode.PHONE_NOT_FOUND, "Not found", 404);
> // → HTTP 404, code "PHONE_NOT_FOUND"
> ```

---

### `src/shared/errors/conflict-error.ts`

```typescript
export class ConflictError extends AppError {
  constructor(code, message, details?) {
    super(code, message, 409, details);
  }
}
```
> Use when something already exists:
> ```typescript
> throw new ConflictError(AuthErrorCode.PHONE_ALREADY_REGISTERED, "Phone taken");
> // → HTTP 409
> ```

---

### `src/shared/errors/validation-error.ts`

```typescript
export class ValidationError extends AppError {
  constructor(message = "Validation failed", details = {}) {
    super(AuthErrorCode.VALIDATION_ERROR, message, 422, details);
  }

  static fromZod(err: ZodError): ValidationError {
    return new ValidationError("Validation failed", buildZodDetails(err));
  }
}

export function buildZodDetails(err: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const field = issue.path.join(".") || "_";
    if (!details[field]) details[field] = [];
    details[field].push(issue.message);
  }
  return details;
}
```
> `buildZodDetails` converts Zod's array of issues into a flat map:
> ```
> { phone_number: ["Invalid E.164 format"], otp_code: ["Must be 6 digits"] }
> ```
> The global error handler in `app.ts` calls this when it catches a `ZodError`.

---

### `src/shared/errors/rate-limit-error.ts`

```typescript
export class RateLimitError extends AppError {
  constructor(message = "Too many requests", retryAfterSeconds?) {
    super(AuthErrorCode.TOO_MANY_REQUESTS, message, 429);
  }
}
```
> Thrown by the rate limiter middleware. Sets HTTP 429.

---

## 6. Shared Utils

These are pure functions — no Express, no database, no side effects. They take
input and return output. The easiest kind of code to test and reuse.

### `src/shared/utils/otp.ts`

```typescript
import { randomInt } from "node:crypto";  // cryptographically secure random!

export function generateOtp(): string {
  const max = 10 ** 6;          // 1,000,000
  const code = randomInt(0, max); // random integer 0–999999
  return code.toString().padStart(6, "0"); // always 6 chars, e.g. "007823"
}
```
> Why `randomInt` from `node:crypto` and not `Math.random()`?
> `Math.random()` is **NOT** cryptographically secure — a sophisticated attacker
> could predict future values. `crypto.randomInt` uses OS-level entropy.

```typescript
export function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, BCRYPT_COST);  // BCRYPT_COST = 10
}

export function verifyOtpHash(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}
```
> We **never store the OTP in plain text**. bcrypt converts `"123456"` into a
> 60-character hash like `$2b$10$...`. The original number cannot be recovered
> from the hash (one-way function). To verify, bcrypt re-hashes and compares.

---

### `src/shared/utils/jwt.ts`

A JWT (JSON Web Token) is a signed string the server gives to the client after
login. The client sends it back in the `Authorization` header on protected
requests. The server verifies the signature to confirm it's authentic.

```typescript
const secretKey = new TextEncoder().encode(env.JWT_SECRET);
const ALG = "HS256";
```
> Convert the JWT_SECRET string to bytes. HS256 = HMAC-SHA-256 — a symmetric
> algorithm (same key to sign and verify).

```typescript
export async function signAccessToken(payload): Promise<string> {
  return new SignJWT({ role: payload.role, school_id: payload.school_id })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)        // sub = student_id (the token "subject")
    .setIssuedAt()                  // iat = current timestamp
    .setExpirationTime(env.JWT_ACCESS_TTL)  // exp = now + 15m
    .sign(secretKey);
}
```
> Creates a signed JWT. The client stores this and sends it with every
> authenticated request.

```typescript
export async function verifyAccessToken(token): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: [ALG] });
    return payload;
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired)
      throw new AuthError(AuthErrorCode.JWT_EXPIRED, "Access token expired");
    throw new AuthError(AuthErrorCode.JWT_INVALID, "Invalid access token");
  }
}
```
> Verifies the signature AND checks expiry. Throws a typed error on failure.
> Used by auth-guard middleware in future modules.

---

### `src/shared/utils/phone.ts`

```typescript
const E164_REGEX = /^\+[1-9]\d{7,14}$/;
```
> E.164 is the international phone standard: `+` followed by country code
> followed by number. Examples: `+12125551234` (US), `+447911123456` (UK).

```typescript
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim().replace(/[\s\-()]/g, "");
  // strips spaces, dashes, parentheses: "+1 (212) 555-1234" → "+12125551234"
  if (!E164_REGEX.test(trimmed)) throw new Error("Invalid phone format");
  return trimmed;
}
```
> Called at the start of every service method so we work with a canonical form.

```typescript
export function maskPhone(e164: string): string {
  const cc = e164.startsWith("+1") ? "+1" : e164.slice(0, 3);
  const last4 = e164.slice(-4);
  return `${cc}•••••${last4}`;
  // "+12125551234" → "+1•••••1234"
}
```
> Used in the OTP send response so the client can confirm "yes, we sent to
> your number" without exposing the full number.

---

### `src/shared/utils/crypto.ts`

AES-256-GCM is a symmetric encryption algorithm. We use it to encrypt the
student's date of birth before storing it.

```typescript
const ALGO = "aes-256-gcm";
const IV_BYTES = 12;   // Initialisation Vector — random per encryption
const TAG_BYTES = 16;  // Authentication Tag — proves data wasn't tampered with
```

```typescript
export function encryptDob(plaintext: string): string {
  const key = getKey();              // 32-byte key from DOB_ENCRYPTION_KEY env
  const iv = randomBytes(IV_BYTES);  // NEW random IV every time
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
  // Output: base64( iv + tag + ciphertext )
}
```
> The IV is random every call, so encrypting the same date twice gives
> different ciphertext — this prevents pattern analysis.
>
> Layout of the stored blob: `[12 bytes IV][16 bytes tag][rest = ciphertext]`

```typescript
export function decryptDob(encoded: string): string {
  const buf = Buffer.from(encoded, "base64");
  const iv        = buf.subarray(0, 12);        // first 12 bytes
  const tag       = buf.subarray(12, 28);       // next 16 bytes
  const ciphertext= buf.subarray(28);           // the rest
  const decipher  = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);  // GCM auth tag verification happens here
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
```

---

## 7. Shared Middleware

Middleware = a function that runs **between** the request arriving and the
controller handling it. Signature: `(req, res, next) => void`.

### `src/shared/middleware/request-id.ts`

```typescript
export function requestId(req, res, next): void {
  const incoming = req.header("x-request-id");
  const id = incoming ?? uuidv4();
  res.locals.requestId = id;        // stored here for success/error helpers
  res.setHeader("X-Request-Id", id); // echoed back in response headers
  next();  // MUST call next() or the request hangs forever
}
```
> If the client sends an `X-Request-Id` header (useful for tracing in
> distributed systems), we echo it back. Otherwise we generate one.
>
> `res.locals` is a per-request storage bag — data put here is available to
> all subsequent middleware and controllers in the same request.

---

### `src/shared/middleware/redis.ts` — Redis Connection

```typescript
let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 3 });
    client.on("error", (err) => console.error("[redis]", err.message));
  }
  return client;
}
```
> **Singleton pattern.** The first call creates the connection; every
> subsequent call returns the same connection object. This prevents opening
> thousands of Redis connections.

---

### `src/shared/middleware/rate-limiter.ts`

Rate limiting prevents abuse. For example, limiting OTP sends to 5 per hour
stops someone from spamming SMS to a phone number.

```typescript
export function rateLimiter(
  action: string,         // "otp_send", "login", etc.
  limit: number,          // max requests allowed
  windowSeconds: number,  // in this many seconds
  options = {}
): RequestHandler {
```
> Returns a middleware function. This pattern (a function that returns a
> function) is called a **factory** or **higher-order function**.

```typescript
  return async (req, res, next) => {
    const identifier = resolveIdentifier(req, identifierSource);
    const key = `rate:${action}:${identifier}`;
    // e.g. "rate:otp_send:+12125551234"
    //      "rate:login:192.168.1.1"
```
> The Redis key is different per user, so each user gets their own counter.

```typescript
    const count = await redis.incr(key);
    // INCR atomically increments the counter and returns the new value.
    // If the key didn't exist, Redis creates it starting at 0, then returns 1.

    if (count === 1) {
      await redis.expire(key, windowSeconds);
      // Set the TTL only on first request, so the window starts then.
    }

    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, limit - count)));

    if (count > limit) {
      throw new RateLimitError("Rate limit exceeded");
    }

    next();
  };
}
```
> Why is this safe? `redis.incr` is **atomic** — even if two requests arrive
> simultaneously, they each get a different count. No race condition.

```typescript
function resolveIdentifier(req, source): string | null {
  if (source === "phone_number") {
    return req.body?.phone_number ?? null;  // OTP routes: per phone number
  }
  return req.ip ?? req.socket.remoteAddress ?? null;  // others: per IP
}
```
> For OTP actions we rate-limit by phone number (not IP) because one person
> could request OTPs for many different numbers from the same IP.

---

## 8. DB Layer

### `src/db/client.ts` — Database Connection

```typescript
let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(env.DATABASE_URL).connect();
  }
  return poolPromise;
}
```
> **Connection pooling.** Opening a DB connection is expensive (~100ms).
> We open one pool of connections at startup and reuse them for all queries.
> Same singleton pattern as Redis.

```typescript
export { sql };
```
> Re-exports the `mssql` library so repositories can import both `getPool`
> and `sql` from the same file.

---

### `src/db/schema/students.ts`

```typescript
export const STUDENTS_TABLE = "students";
// Rule: ALWAYS "students", never "student_auth" or anything else.

export const STUDENTS_DDL = `
CREATE TABLE students (
  student_id     INT IDENTITY(1,1) PRIMARY KEY,
  -- IDENTITY = auto-increment in SQL Server
  school_id      INT NULL,
  role           VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student')),
  account_status VARCHAR(30) NOT NULL DEFAULT 'independent'
                   CHECK (account_status IN ('independent','school_linked')),
  is_active      BIT NOT NULL DEFAULT 1,
  phone_number   VARCHAR(25) NOT NULL UNIQUE,
  phone_verified BIT NOT NULL DEFAULT 0,
  full_name      VARCHAR(200) NOT NULL,
  invite_token_used VARCHAR(500) NULL,
  last_login_at  DATETIMEOFFSET NULL,
  created_at     DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  updated_at     DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
`;
```
> `DATETIMEOFFSET` is SQL Server's timezone-aware datetime type (like
> JavaScript's `Date` but with timezone offset stored).
>
> `BIT` = boolean in SQL Server (0 or 1).
>
> `CHECK (role IN ('student'))` = a constraint — the database will reject any
> row where role is not 'student'.

---

### `src/db/schema/otp-verifications.ts`

```typescript
export const OTP_VERIFICATIONS_TABLE = "otp_verifications";

export const OTP_VERIFICATIONS_DDL = `
CREATE TABLE otp_verifications (
  otp_id        INT IDENTITY(1,1) PRIMARY KEY,
  phone_number  VARCHAR(25) NOT NULL,
  purpose       VARCHAR(30) NOT NULL CHECK (purpose IN ('signup','login','phone_change')),
  otp_code_hash VARCHAR(255) NOT NULL,  -- bcrypt hash, NEVER the raw OTP
  is_used       BIT NOT NULL DEFAULT 0,
  attempts      SMALLINT NOT NULL DEFAULT 0,
  expires_at    DATETIMEOFFSET NOT NULL,
  created_at    DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
CREATE INDEX IX_otp_verifications_phone   ON otp_verifications(phone_number);
CREATE INDEX IX_otp_verifications_expires ON otp_verifications(expires_at);
`;
```
> Indexes on `phone_number` and `expires_at` make queries fast. Without an
> index, the database scans every row; with it, it jumps straight to matching rows.

---

## 9. Student Auth Module

All files live flat inside `src/modules/auth/student/`.
The only subfolder allowed is `dto/`.

```
modules/auth/student/
├── dto/
│   ├── request.dto.ts     ← shape of incoming JSON bodies
│   └── response.dto.ts    ← shape of outgoing JSON data
├── student.types.ts       ← internal DB record types
├── student.schema.ts      ← Zod validators
├── student.repository.ts  ← database queries
├── student.service.ts     ← business logic
├── student.controller.ts  ← HTTP layer (parse → service → respond)
└── student.routes.ts      ← URL routing
```

---

### `dto/request.dto.ts` — What the Client Sends

```typescript
export interface StudentSendOtpRequestDto {
  phone_number: string;       // "+12125551234"
  purpose: "signup" | "login";
}
```
> DTOs (Data Transfer Objects) are just TypeScript interfaces — they have no
> runtime code, only type information. They describe the **contract** between
> client and server.

```typescript
export interface StudentRegisterRequestDto {
  phone_number: string;
  otp_code: string;                  // the 6-digit code from SMS
  full_name: string;
  graduation_year: number;
  date_of_birth: string;             // "YYYY-MM-DD"
  high_school_name: string;
  state_of_residence: string;
  confirms_age_13_plus: boolean;     // MUST be true
  confirms_parental_permission: boolean;  // MUST be true if age 13-17
  invite_token?: string;             // optional school invite
  college_data_share?: boolean;      // default true
}
```

---

### `dto/response.dto.ts` — What We Send Back

```typescript
export interface StudentAuthResponseDto {
  access_token: string;    // JWT — client stores this
  student_id: string;      // string (even though DB stores INT) for JSON safety
  role: "student";
  account_status: "independent" | "school_linked";
  school_id?: string | null;
  full_name: string;
}
```
> Note: `student_id` is a **string** in the response even though it's an `INT`
> in the database. JavaScript can't safely represent very large integers (>2^53),
> so IDs are always sent as strings.

---

### `student.types.ts` — Internal Database Types

```typescript
export interface StudentRecord {
  student_id: number;
  school_id: number | null;
  role: "student";
  account_status: "independent" | "school_linked";
  is_active: boolean;
  phone_number: string;
  phone_verified: boolean;
  full_name: string;
  invite_token_used: string | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
```
> This is what comes back from the database when we query a student row.
> Notice it has fields like `otp_code_hash` and `is_active` that we **never**
> return in responses — the mapping from `StudentRecord` to
> `StudentAuthResponseDto` is explicit and intentional.

```typescript
export interface CreateStudentData {
  phone_number: string;
  full_name: string;
  is_active: boolean;
  phone_verified: boolean;
  account_status: "independent" | "school_linked";
  school_id: number | null;
  invite_token_used: string | null;
}
```
> Data needed to **create** a new student row. Separate from `StudentRecord`
> because the DB generates `student_id`, `created_at` etc.

---

### `student.schema.ts` — Zod Validation

Zod validates request bodies **before** they reach service logic. If validation
fails, Zod throws a `ZodError` which the global error handler catches and
formats as a 422 response.

```typescript
const phoneRegex = /^\+[1-9]\d{7,14}$/;
// ^ = start of string
// \+ = literal plus sign
// [1-9] = first digit must be 1-9 (no +0...)
// \d{7,14} = 7 to 14 more digits
// $ = end of string
```

```typescript
export const sendOtpSchema = z.object({
  phone_number: phoneNumber,  // applies the regex above
  purpose: z.enum(["signup", "login"]),  // only these two values allowed
});
```

```typescript
export const registerSchema = z.object({
  // ...
  graduation_year: z.number().int()
    .min(currentYear)        // can't be in the past
    .max(currentYear + 6),   // reasonable future window

  date_of_birth: z.string()
    .regex(isoDateRegex)     // "YYYY-MM-DD" format check
    .refine(v => !isNaN(new Date(v).getTime()), "Invalid date")
    .refine(v => computeAge(v) >= 13, "Must be at least 13"),
    // .refine() adds custom validation logic beyond format checking

  confirms_age_13_plus: z.boolean()
    .refine(v => v === true, "confirms_age_13_plus must be true"),
});
```
> `z.refine()` lets you add any custom rule. The second argument is the error
> message shown if the rule fails.

```typescript
export function computeAge(dobIso: string): number {
  const dob = new Date(`${dobIso}T00:00:00Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}
```
> Calculates exact age. The `m < 0` check handles "birthday hasn't happened
> yet this year" — e.g., if DOB is Dec 31 and today is Jan 1, we subtract 1.

---

### `student.repository.ts` — Database Queries

Repositories have one job: **speak to the database**. No business logic here.

```typescript
export class StudentRepository {
  async findByPhone(phone: string): Promise<StudentRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("phone", sql.VarChar(25), phone)  // ← parameterized query!
      .query(`SELECT TOP 1 * FROM students WHERE phone_number = @phone`);
    return result.recordset[0] ?? null;
  }
```
> **Parameterized queries are CRITICAL for security.**
> Never do: `` `WHERE phone = '${phone}'` `` — that's SQL Injection.
> Always use `.input("name", type, value)` — the driver sanitizes the value.

```typescript
  async createStudent(data: CreateStudentData): Promise<StudentRecord> {
    const result = await pool.request()
      .input("phone_number", sql.VarChar(25), data.phone_number)
      // ... more .input() calls
      .query(`
        INSERT INTO students (phone_number, full_name, ...)
        OUTPUT INSERTED.*       ← returns the inserted row (including auto-generated ID)
        VALUES (@phone_number, @full_name, ...)
      `);
    return result.recordset[0];
  }
```
> `OUTPUT INSERTED.*` is SQL Server's way of returning the newly created row
> without needing a second SELECT query.

```typescript
export class OtpRepository {
  async findLatestValidOtp(phone, purpose): Promise<OtpRecord | null> {
    // ORDER BY otp_id DESC → newest first
    // is_used = 0          → not already consumed
    // No expires_at check here — we check in the service to get cleaner errors
  }

  async invalidatePreviousOtps(phone, purpose): Promise<void> {
    // Sets is_used = 1 for all previous unused OTPs for this phone+purpose
    // This ensures only the latest OTP is valid
  }
}
```

---

### `student.service.ts` — Business Logic

The service is the **brain**. It knows the rules:
- You can't request OTP for login if you haven't registered
- You can't register twice with the same phone
- You can't be under 13
- OTPs expire after 10 minutes
- 5 wrong attempts = lock out

```typescript
export class StudentService {
  constructor(
    private readonly studentRepo: StudentRepository,
    private readonly otpRepo: OtpRepository,
  ) {}
```
> **Dependency Injection.** The service doesn't create its own repos — it
> receives them via the constructor. This makes the service easy to test
> (you can pass in mock repos) and loosely coupled.

#### `sendOtp` flow:

```typescript
async sendOtp(dto): Promise<StudentSendOtpResponseDto> {
  const phone = normalizePhone(dto.phone_number);   // 1. canonicalize

  if (dto.purpose === "login") {
    const existing = await this.studentRepo.findByPhone(phone);
    if (!existing) throw new AuthError(PHONE_NOT_FOUND, "...", 404);  // 2. must exist for login
  } else {
    const existing = await this.studentRepo.findByPhone(phone);
    if (existing) throw new ConflictError(PHONE_ALREADY_REGISTERED, "..."); // 3. must NOT exist for signup
  }

  await this.otpRepo.invalidatePreviousOtps(phone, dto.purpose); // 4. old OTPs invalid
  const code = generateOtp();                  // 5. new 6-digit code
  const hash = await hashOtp(code);            // 6. bcrypt hash
  await this.otpRepo.createOtp({ phone, purpose, otp_code_hash: hash, expires_at }); // 7. save
  await this.dispatchOtp(phone, code);          // 8. send SMS (stubbed → console.log)

  return { expires_in_seconds: 600, phone_masked: maskPhone(phone) };
}
```

#### `consumeOtp` — private helper used by verifyOtp, register, login:

```typescript
private async consumeOtp(phone, code, purpose): Promise<OtpRecord> {
  const otp = await this.otpRepo.findLatestValidOtp(phone, purpose);
  if (!otp || otp.expires_at.getTime() <= Date.now())
    throw new AuthError(OTP_EXPIRED, "OTP expired");         // not found or expired
  if (otp.attempts >= OTP_MAX_ATTEMPTS)
    throw new AuthError(OTP_TOO_MANY_ATTEMPTS, "...", 429);  // brute-force protection

  await this.otpRepo.incrementAttempts(otp.otp_id);  // record this attempt BEFORE checking
  // ^ Why before? If we check first and then increment, a crash between the two
  //   leaves the counter un-incremented and the attacker gets a free try.

  const ok = await verifyOtpHash(code, otp.otp_code_hash);
  if (!ok) throw new AuthError(OTP_INVALID, "Invalid OTP");

  await this.otpRepo.markUsed(otp.otp_id);  // consumed — can't use again
  return otp;
}
```

#### `register` age gate:

```typescript
const age = computeAge(dto.date_of_birth);

if (age < 13)
  throw new AuthError(AGE_GATE_FAILED, "Must be at least 13", 403);

if (!dto.confirms_age_13_plus)
  throw new AuthError(AGE_CONFIRMATION_REQUIRED, "Age confirmation required", 400);

if (age >= 13 && age <= 17 && !dto.confirms_parental_permission)
  throw new AuthError(PARENTAL_CONSENT_REQUIRED, "Parental consent required", 403);
```
> Three separate checks because they produce different error codes that the
> client uses to show the right UI message.

---

### `student.controller.ts` — HTTP Layer

The controller is thin on purpose. It does exactly three things:
1. Parse/validate the request body
2. Call the service
3. Send the response

```typescript
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  sendOtp = async (req, res, next): Promise<void> => {
    try {
      const dto = sendOtpSchema.parse(req.body);    // ← validates; throws ZodError if invalid
      const result = await this.studentService.sendOtp(dto);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);  // ← passes to global error handler in app.ts
    }
  };
```
> **Arrow function syntax** (`sendOtp = async () =>`) is used instead of
> regular method syntax so that `this` is bound correctly when Express calls
> `controller.sendOtp`. With a regular method, `this` would be `undefined`.

---

### `student.routes.ts` — URL Mapping

```typescript
const router = Router();

const controller = new StudentController(
  new StudentService(
    new StudentRepository(),
    new OtpRepository()
  )
);
```
> **Wiring the dependency chain manually:**
> Repository → Service → Controller
> This is the Composition Root — the one place where we assemble dependencies.

```typescript
router.post("/otp/send",
  rateLimiter("otp_send", 5, 3600),   // middleware runs first
  controller.sendOtp                   // then controller
);

router.post("/register",
  rateLimiter("signup", 3, 3600, { identifier: "ip" }),
  controller.register
);
```
> When a request hits `POST /auth/student/otp/send`:
> 1. Rate limiter checks Redis → if limit hit, throws RateLimitError → 429
> 2. If OK, calls `controller.sendOtp`

---

## 10. Auth Flow Stories

### Story 1: New Student Signs Up

```
Client                          Server
  │                               │
  │── POST /auth/student/otp/send ─►│
  │   { phone: "+12125551234",     │
  │     purpose: "signup" }        │
  │                               │  1. Zod validates body
  │                               │  2. normalizePhone("+12125551234")
  │                               │  3. studentRepo.findByPhone → null (new phone ✓)
  │                               │  4. otpRepo.invalidatePreviousOtps
  │                               │  5. generateOtp() → "847291"
  │                               │  6. hashOtp("847291") → "$2b$10$..."
  │                               │  7. otpRepo.createOtp({ hash, expires: now+10min })
  │                               │  8. console.log("[otp:dev] code=847291")
  │◄── 200 OK ─────────────────── │
  │   { expires_in_seconds: 600,   │
  │     phone_masked: "+1•••••1234"}│
  │                               │
  │── POST /auth/student/register ─►│
  │   { phone, otp_code: "847291",  │
  │     full_name: "Alex Smith",    │
  │     date_of_birth: "2006-03-15",│
  │     confirms_age_13_plus: true, │
  │     ... }                      │
  │                               │  1. Zod validates ALL fields
  │                               │  2. normalizePhone
  │                               │  3. findByPhone → null (not registered yet ✓)
  │                               │  4. consumeOtp("847291", "signup")
  │                               │     - find OTP row
  │                               │     - check not expired
  │                               │     - increment attempts
  │                               │     - bcrypt.compare("847291", hash) → true
  │                               │     - markUsed (OTP can't be reused)
  │                               │  5. computeAge("2006-03-15") → 20 → ≥13 ✓
  │                               │  6. encryptDob("2006-03-15")
  │                               │  7. studentRepo.createStudent(...)
  │                               │     → returns student row with student_id=42
  │                               │  8. signAccessToken({ sub:"42", role:"student" })
  │◄── 201 Created ────────────── │
  │   { access_token: "eyJ...",    │
  │     student_id: "42",          │
  │     role: "student",           │
  │     full_name: "Alex Smith" }  │
```

---

### Story 2: Existing Student Logs In

```
Client                          Server
  │                               │
  │── POST /auth/student/otp/send ─►│
  │   { phone: "+12125551234",     │
  │     purpose: "login" }         │
  │                               │  findByPhone → student exists ✓
  │                               │  is_active = true ✓
  │                               │  generate + hash + store OTP
  │◄── 200 ───────────────────── │
  │                               │
  │── POST /auth/student/login ────►│
  │   { phone: "+12125551234",     │
  │     otp_code: "192384" }       │
  │                               │  findByPhone → student ✓
  │                               │  consumeOtp → bcrypt verify ✓
  │                               │  updateLastLogin
  │                               │  signAccessToken
  │◄── 200 ───────────────────── │
  │   { access_token, student_id } │
```

---

### Story 3: Wrong OTP

```
Client                          Server
  │                               │
  │── POST /auth/student/login ────►│
  │   { phone, otp_code: "000000" }│  (wrong code)
  │                               │  findLatestValidOtp → found, not expired
  │                               │  attempts = 2 < 5 → ok
  │                               │  incrementAttempts → attempts now 3
  │                               │  verifyOtpHash("000000", hash) → FALSE
  │                               │  throw AuthError(OTP_INVALID, 401)
  │◄── 401 ───────────────────── │
  │   { error: { code: "OTP_INVALID",│
  │     message: "Invalid OTP" } }  │
```

---

### Story 4: Validation Error

```
Client                          Server
  │                               │
  │── POST /auth/student/register──►│
  │   { phone: "not-valid" }       │
  │                               │  registerSchema.parse(req.body)
  │                               │  → ZodError: phone_number invalid E.164
  │                               │  next(zodError) in controller catch
  │                               │  → global error handler catches ZodError
  │                               │  → buildZodDetails → { phone_number: ["Invalid E.164..."] }
  │◄── 422 ───────────────────── │
  │   { error: {                  │
  │     code: "VALIDATION_ERROR",  │
  │     message: "Validation failed",│
  │     details: {                 │
  │       phone_number: ["Invalid E.164 format"]│
  │     }}}                        │
```

---

## 11. Reusability Guide

The shared layer is designed to be used by **every future module** — advisor,
school-admin, college, etc. Here's what you can reuse without writing new code:

| What you need | Import from | Usage |
|---|---|---|
| Send success response | `shared/response/success.ts` | `sendSuccess(res, data, 201)` |
| Send error response | `shared/response/error.ts` | `sendError(res, code, msg, 400)` |
| HTTP status codes | `shared/response/http-status.ts` | `HttpStatus.CREATED` |
| Error code strings | `shared/response/error-codes.ts` | `AuthErrorCode.JWT_EXPIRED` |
| Custom error classes | `shared/errors/*.ts` | `throw new AuthError(...)` |
| OTP generate/hash/verify | `shared/utils/otp.ts` | Any OTP feature |
| JWT sign/verify | `shared/utils/jwt.ts` | Any authenticated route |
| Phone normalize/mask | `shared/utils/phone.ts` | Any phone field |
| AES encrypt/decrypt | `shared/utils/crypto.ts` | Any PII field |
| Rate limiting | `shared/middleware/rate-limiter.ts` | `rateLimiter("action", 10, 3600)` |
| Request ID | `shared/middleware/request-id.ts` | Already in `app.ts` globally |
| DB connection | `db/client.ts` | `const pool = await getPool()` |

### Adding a New Module (e.g., School Admin Auth)

1. Create `src/modules/auth/school-admin/` with the same flat structure
2. Copy the pattern: `dto/ → types → schema → repository → service → controller → routes`
3. Add `app.use("/auth/school-admin", schoolAdminRouter)` in `app.ts`
4. **Reuse everything from shared/** — you only write the business logic

---

## 12. Glossary for Beginners

| Term | Plain English |
|---|---|
| **E.164** | International phone number standard: `+12125551234` |
| **JWT** | A signed token the server gives after login; client sends it on future requests |
| **bcrypt** | Password hashing algorithm — turns "123456" into a string you can't reverse |
| **OTP** | One-Time Password — the 6-digit code sent via SMS |
| **AES-256-GCM** | Symmetric encryption — scrambles data with a key |
| **MSSQL** | Microsoft SQL Server (Azure SQL) — the database |
| **Redis** | In-memory key-value store — used for rate limit counters |
| **Middleware** | Code that runs before/after every request in the chain |
| **DTO** | Data Transfer Object — TypeScript interface describing request/response shape |
| **Repository** | Class that talks to the database, nothing else |
| **Service** | Class that contains business rules |
| **Controller** | Class that handles HTTP — parse → service → respond |
| **Dependency Injection** | Passing dependencies via constructor instead of creating them inside |
| **Zod** | Library for validating JavaScript objects against a schema |
| **Parameterized query** | SQL query with `@placeholder` instead of string concat — prevents SQL injection |
| **Singleton** | Pattern where a class/object is created only once and reused |
| **E.164** | Phone format: `+` country-code digits, e.g. `+12125551234` |
| **DATETIMEOFFSET** | SQL Server date type that includes timezone offset |
| **IDENTITY(1,1)** | SQL Server auto-increment — starts at 1, increments by 1 |

---

*End of documentation. Every file in this backend follows the same layered
pattern: config → shared → db → module. Adding new features means adding new
modules, not modifying the shared layer.*
