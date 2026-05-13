# UniLantern Backend API

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Architecture](#project-architecture)
4. [Folder Structure](#folder-structure)
5. [Core Components](#core-components)
6. [API Endpoints](#api-endpoints)
7. [Authentication & Authorization](#authentication--authorization)
8. [Error Handling](#error-handling)
9. [Middleware Chain](#middleware-chain)
10. [Database Schema](#database-schema)
11. [Setup & Installation](#setup--installation)
12. [Environment Variables](#environment-variables)
13. [API Documentation by Module](#api-documentation-by-module)

---

## Project Overview

**UniLantern** is a comprehensive Node.js/TypeScript backend API for a college readiness platform. It provides students with tools to manage their academic profiles, extracurricular activities, essays, college searches, and scholarship opportunities.

### Key Features
- ✅ **OTP-Based Authentication** — 6-digit codes with 60-second TTL and 5 max attempts
- ✅ **JWT Token System** — Access tokens (15-min) and refresh tokens (30-day)
- ✅ **Rate Limiting** — Per-endpoint protection with configurable limits
- ✅ **Audit Logging** — Track all sensitive operations
- ✅ **Score Recalculation Engine** — Auto-queued on profile changes
- ✅ **Multi-Device Sessions** — Push token support for notifications
- ✅ **Account Deletion** — 30-day grace period with reactivation
- ✅ **School Account Linking** — Merge accounts from school enrollment
- ✅ **Comprehensive Validation** — Zod schemas with custom rules
- ✅ **Request Tracking** — Unique request_id on every response

### Supported Student Features
- Profile management (grade, graduation year, GPA, test scores)
- Extracurricular activities tracking
- Academic records (GPA, SAT, ACT scores)
- Awards and honors management
- Essay submissions with status tracking
- College search and saved colleges
- Scholarship discovery and tracking
- Community service hours logging
- Consent management and data privacy
- Push notifications and preferences
- Account settings and deletion

---

## Technology Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 22 LTS | Runtime |
| **TypeScript** | 6.0.3 | Type-safe development |
| **Express** | 5.2.1 | Web framework |
| **SQL Server** | Azure | Primary database |
| **Drizzle ORM** | 0.36.0 | Type-safe database queries |
| **JWT (jose)** | 5.9.6 | Token generation & verification |
| **bcryptjs** | 2.4.3 | Password hashing |
| **Zod** | 4.4.1 | Schema validation |
| **ioredis** | 5.4.1 | Redis client (rate limiting, caching) |
| **UUID** | 11.0.3 | Unique identifiers |
| **dotenv** | 17.4.2 | Environment configuration |
| **CORS** | 2.8.6 | Cross-Origin Resource Sharing |

**Total Dependencies:** 12 core packages (production-only, minimal footprint)

---

## Project Architecture

### Architectural Pattern: Vertical Slice

Each feature is **independently organized** with its own folder structure containing all layers:

```
📦 Module
 ├── 📄 module.controller.ts      (HTTP request handlers)
 ├── 📄 module.service.ts          (Business logic)
 ├── 📄 module.repository.ts       (Database queries)
 ├── 📄 module.routes.ts           (Route definitions)
 ├── 📄 module.schema.ts           (Zod validation schemas)
 ├── 📄 module.types.ts            (TypeScript interfaces)
 └── 📁 dto/
     ├── 📄 request.dto.ts         (Request validation schemas)
     └── 📄 response.dto.ts        (Response object shapes)
```

### Layered Architecture Within Each Module

```
HTTP Request
    ↓
[Routes] - Defines endpoints
    ↓
[Middleware] - Auth, Rate-limit, Audit
    ↓
[Controller] - Parse request, validate, delegate
    ↓
[Service] - Business logic, calculations
    ↓
[Repository] - Database operations
    ↓
SQL Server Database
    ↓
[Response DTO] - Format response
    ↓
HTTP Response
```

### Design Principles

1. **Separation of Concerns** — Each layer has a single responsibility
2. **Dependency Injection** — Services injected into controllers
3. **Type Safety** — Full TypeScript coverage, no `any` types
4. **Validation First** — Zod validates all inputs before processing
5. **Error Boundaries** — Custom error classes propagated up the stack
6. **Single Responsibility** — Each function/method does one thing
7. **DRY (Don't Repeat Yourself)** — Shared utilities and middleware

---

## Folder Structure

```
📦 unilantern-backend/
│
├── 📄 package.json                    # Dependencies & scripts
├── 📄 tsconfig.json                   # TypeScript configuration
├── 📄 README.md                       # This file
├── 📄 .env.example                    # Environment template
│
├── 📁 src/
│   ├── 📄 app.ts                      # Express app setup & middleware
│   ├── 📄 server.ts                   # Server initialization (port/host)
│   │
│   ├── 📁 config/
│   │   ├── 📄 env.ts                  # Environment variables (validated)
│   │   └── 📄 constants.ts            # App-wide constants (rate limits, TTLs, etc.)
│   │
│   ├── 📁 db/
│   │   ├── 📄 client.ts               # Drizzle ORM client & connection
│   │   └── 📁 schema/
│   │       ├── 📄 students.ts         # Students table schema
│   │       ├── 📄 student_profiles.ts # Student profiles
│   │       ├── 📄 student_academics.ts # Academic records
│   │       ├── 📄 extracurricular_activities.ts
│   │       ├── 📄 honors_awards.ts
│   │       ├── 📄 student_essays.ts
│   │       ├── 📄 scholarships.ts
│   │       ├── 📄 colleges.ts
│   │       ├── 📄 schools.ts
│   │       ├── 📄 otp_verifications.ts
│   │       ├── 📄 student_sessions.ts
│   │       ├── 📄 push_tokens.ts
│   │       ├── 📄 notifications.ts
│   │       ├── 📄 student_consents.ts
│   │       ├── 📄 audit_logs.ts
│   │       ├── 📄 analytics_events.ts
│   │       ├── 📄 feedback_submissions.ts
│   │       ├── 📄 student_deletion_queue.ts
│   │       ├── 📄 student_deletion_archive.ts
│   │       ├── 📄 community_service_entries.ts
│   │       ├── 📄 invite_tokens.ts
│   │       ├── 📄 notification_preferences.ts
│   │       ├── 📄 student_saved_colleges.ts
│   │       ├── 📄 student_saved_scholarships.ts
│   │       ├── 📄 student_scores.ts
│   │       ├── 📄 cron_execution_logs.ts
│   │       └── 📄 college_data_sharing.ts
│   │
│   ├── 📁 modules/
│   │   │
│   │   ├── 📁 auth/
│   │   │   └── 📁 student/
│   │   │       ├── 📄 student.controller.ts
│   │   │       ├── 📄 student.service.ts
│   │   │       ├── 📄 student.repository.ts
│   │   │       ├── 📄 student.routes.ts
│   │   │       ├── 📄 student.schema.ts
│   │   │       ├── 📄 student.types.ts
│   │   │       └── 📁 dto/
│   │   │           ├── 📄 request.dto.ts
│   │   │           └── 📄 response.dto.ts
│   │   │
│   │   ├── 📁 student/
│   │   │   │
│   │   │   ├── 📁 student_profile/
│   │   │   │   ├── 📄 students.controller.ts
│   │   │   │   ├── 📄 students.service.ts
│   │   │   │   ├── 📄 students.repository.ts
│   │   │   │   ├── 📄 students.routes.ts
│   │   │   │   ├── 📄 students.schema.ts
│   │   │   │   └── 📁 dto/
│   │   │   │       ├── 📄 request.dto.ts
│   │   │   │       └── 📄 response.dto.ts
│   │   │   │
│   │   │   ├── 📁 academics/
│   │   │   │   ├── 📄 academics.controller.ts
│   │   │   │   ├── 📄 academics.service.ts
│   │   │   │   ├── 📄 academics.repository.ts
│   │   │   │   ├── 📄 academics.routes.ts
│   │   │   │   ├── 📄 academics.schema.ts
│   │   │   │   └── 📁 dto/
│   │   │   │       ├── 📄 request.dto.ts
│   │   │   │       └── 📄 response.dto.ts
│   │   │   │
│   │   │   ├── 📁 extracurriculars/
│   │   │   │   ├── 📄 extracurriculars.controller.ts
│   │   │   │   ├── 📄 extracurriculars.service.ts
│   │   │   │   ├── 📄 extracurriculars.repository.ts
│   │   │   │   ├── 📄 extracurriculars.routes.ts
│   │   │   │   ├── 📄 extracurriculars.schema.ts
│   │   │   │   └── 📁 dto/
│   │   │   │       ├── 📄 request.dto.ts
│   │   │   │       └── 📄 response.dto.ts
│   │   │   │
│   │   │   ├── 📁 awards/
│   │   │   │   ├── 📄 awards.controller.ts
│   │   │   │   ├── 📄 awards.service.ts
│   │   │   │   ├── 📄 awards.repository.ts
│   │   │   │   ├── 📄 awards.routes.ts
│   │   │   │   ├── 📄 awards.schema.ts
│   │   │   │   └── 📁 dto/
│   │   │   │
│   │   │   ├── 📁 essay/
│   │   │   │   ├── 📄 essay.controller.ts
│   │   │   │   ├── 📄 essay.service.ts
│   │   │   │   ├── 📄 essay.repository.ts
│   │   │   │   ├── 📄 essay.routes.ts
│   │   │   │   ├── 📄 essay.schema.ts
│   │   │   │   └── 📁 dto/
│   │   │   │
│   │   │   ├── 📁 colleges/
│   │   │   │   ├── 📄 colleges.controller.ts
│   │   │   │   ├── 📄 colleges.service.ts
│   │   │   │   ├── 📄 colleges.repository.ts
│   │   │   │   ├── 📄 colleges.routes.ts
│   │   │   │   ├── 📄 colleges.schema.ts
│   │   │   │   ├── 📄 saved-colleges.routes.ts
│   │   │   │   └── 📁 dto/
│   │   │   │
│   │   │   ├── 📁 scholarships/
│   │   │   │   ├── 📄 scholarships.controller.ts
│   │   │   │   ├── 📄 scholarships.service.ts
│   │   │   │   ├── 📄 scholarships.repository.ts
│   │   │   │   ├── 📄 scholarships.routes.ts
│   │   │   │   ├── 📄 scholarships.schema.ts
│   │   │   │   └── 📁 dto/
│   │   │   │
│   │   │   ├── 📁 service/ (Community Service)
│   │   │   │   ├── 📄 service.controller.ts
│   │   │   │   ├── 📄 service.service.ts
│   │   │   │   ├── 📄 service.repository.ts
│   │   │   │   ├── 📄 service.routes.ts
│   │   │   │   ├── 📄 service.schema.ts
│   │   │   │   └── 📁 dto/
│   │   │   │
│   │   │   ├── 📁 consents/
│   │   │   │   └── [Similar structure]
│   │   │   │
│   │   │   ├── 📁 notifications/
│   │   │   │   └── [Similar structure]
│   │   │   │
│   │   │   ├── 📁 push-tokens/
│   │   │   │   └── [Similar structure]
│   │   │   │
│   │   │   ├── 📁 school-linking/
│   │   │   │   └── [Similar structure]
│   │   │   │
│   │   │   ├── 📁 college-data-sharing/
│   │   │   │   └── [Similar structure]
│   │   │   │
│   │   │   ├── 📁 account-deletion/
│   │   │   │   └── [Similar structure]
│   │   │   │
│   │   │   ├── 📁 analytics/
│   │   │   │   └── [Similar structure]
│   │   │   │
│   │   │   ├── 📁 settings/
│   │   │   │   └── [Similar structure]
│   │   │   │
│   │   │   ├── 📁 readiness/ (College Readiness Scoring)
│   │   │   │   └── [Similar structure]
│   │   │   │
│   │   │   └── 📁 scoring-engine/
│   │   │       └── [Score calculation logic]
│   │   │
│   │
│   ├── 📁 shared/
│   │   │
│   │   ├── 📁 errors/
│   │   │   ├── 📄 app-error.ts       # Base error class
│   │   │   ├── 📄 auth-error.ts      # 401/403 errors
│   │   │   ├── 📄 conflict-error.ts  # 409 errors
│   │   │   ├── 📄 rate-limit-error.ts # 429 errors
│   │   │   └── 📄 validation-error.ts # 400 errors
│   │   │
│   │   ├── 📁 middleware/
│   │   │   ├── 📄 authenticate.ts    # JWT verification & authorization
│   │   │   ├── 📄 auth.ts            # Auth middleware chain
│   │   │   ├── 📄 rate-limiter.ts    # Rate limiting (token bucket)
│   │   │   ├── 📄 redis.ts           # Redis connection & helper
│   │   │   ├── 📄 request-id.ts      # Unique request tracking
│   │   │   └── 📄 audit.ts           # Audit logging middleware
│   │   │
│   │   ├── 📁 repository/
│   │   │   └── 📄 audit.repository.ts # Audit log database operations
│   │   │
│   │   ├── 📁 response/
│   │   │   ├── 📄 error.ts           # Error response formatter
│   │   │   ├── 📄 success.ts         # Success response formatter
│   │   │   ├── 📄 error-codes.ts     # Centralized error codes enum
│   │   │   └── 📄 http-status.ts     # HTTP status codes
│   │   │
│   │   └── 📁 utils/
│   │       ├── 📄 crypto.ts          # Encryption/decryption utilities
│   │       ├── 📄 jwt.ts             # JWT token generation
│   │       ├── 📄 otp.ts             # OTP generation & validation
│   │       ├── 📄 phone.ts           # Phone number formatting
│   │       └── 📄 token.ts           # Token utilities
│   │
│   └── 📁 index.ts                   # Main entry point
│
└── 📁 dist/                           # Compiled JavaScript (generated)
```

### Total: 26 Database Tables, 16+ Modules, 70+ API Endpoints

---

## Core Components

### 1. **Controllers** (`*.controller.ts`)

Handles HTTP request/response lifecycle:
- Parse incoming request
- Validate DTOs
- Call service methods
- Format responses
- Handle errors

```typescript
// Example pattern
export const createExtracurricular = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const studentId = res.locals.studentId;
    const createDto = validateCreateDTO(req.body);
    
    const result = await extracurricularService.create(studentId, createDto);
    
    return successResponse(res, result, 201, "activity_created");
  } catch (error) {
    next(error);
  }
};
```

### 2. **Services** (`*.service.ts`)

Core business logic:
- Complex calculations
- Cross-module logic
- Score recalculation
- Data transformations
- Email/notification triggering

### 3. **Repositories** (`*.repository.ts`)

Database access layer:
- Query execution via Drizzle ORM
- Type-safe queries
- Relationship management
- Pagination handling

### 4. **Routes** (`*.routes.ts`)

Express Router setup:
- Endpoint definitions
- HTTP methods
- Middleware application
- Controller delegation

```typescript
// Example pattern
const router = Router();

router.get(
  "/",
  authenticate,           // JWT middleware
  rateLimit("ec_list"),   // Rate limit
  audit("list_ec"),       // Audit log
  controller.list
);

router.post(
  "/",
  authenticate,
  rateLimit("ec_create"),
  audit("create_ec"),
  validateSchema(createSchema),  // Zod validation
  controller.create
);

export default router;
```

### 5. **Schemas** (`*.schema.ts`)

Zod validation schemas:
- Request body validation
- Field constraints
- Custom validation rules
- Error message customization

### 6. **DTOs** (`dto/request.dto.ts`, `dto/response.dto.ts`)

**Request DTOs:**
- Validate incoming data structure
- Define required/optional fields
- Provide clear error messages

**Response DTOs:**
- Define API response shape
- Strip internal fields (IDs, sensitive data)
- Support pagination

### 7. **Middleware Stack**

#### In Order of Execution:

1. **CORS Middleware** — Allow cross-origin requests
2. **Request ID Middleware** — Generate unique tracking ID
3. **JSON Parser** — Parse application/json bodies (1MB limit)
4. **URL-Encoded Parser** — Parse form data
5. **Rate Limiter** — Token bucket per-endpoint (applied per-route)
6. **JWT Authenticator** — Verify JWT, extract user context (applied per-route)
7. **Role Validator** — Check user roles/permissions (applied per-route)
8. **Audit Logger** — Log sensitive operations (applied per-route)
9. **Score Recalculation Trigger** — Queue score update if needed (applied per-route)

**Middleware Types:**

| Middleware | Purpose | Scope | Triggers |
|-----------|---------|-------|----------|
| `cors` | Enable cross-origin | Global | Always |
| `express.json()` | Parse JSON bodies | Global | Always |
| `requestId` | Track requests uniquely | Global | Always |
| `rateLimiter` | Prevent abuse | Per-route | When configured |
| `authenticate` | Verify JWT | Per-route | When required |
| `audit` | Log sensitive ops | Per-route | When configured |
| `validateSchema` | Zod validation | Per-route | When applied |

---

## API Endpoints

### Summary
- **Total Endpoints:** 70+
- **Authenticated (JWT):** 65+
- **Public (No Auth):** 5 (OTP send/verify, health checks, etc.)
- **Rate Limits:** Per-endpoint configurable
- **Response Format:** Unified JSON with request_id
- **Pagination:** Cursor-based for large lists

### Base URL
```
http://localhost:3000
```

### Default Rate Limits
```
OTP Send/Verify:     100 requests/hour
Login/Signup:        100 requests/hour
Profile View:        120 requests/minute
Profile Update:      30 requests/minute
Extracurricular:     30 requests/minute (List: 120)
Academics:           30 requests/minute
Awards/Honors:       30 requests/minute
Essays:              30 requests/minute
Colleges:            30 requests/minute (Search: 60)
Scholarships:        30 requests/minute (List: 60)
Service:             30 requests/minute (List: 120)
Notifications:       60 requests/minute
```

---

## Authentication & Authorization

### OTP-Based Flow

#### Step 1: Send OTP
```bash
POST /api/v1/auth/student/otp/send
Content-Type: application/json

{
  "phone_number": "+12125551234",
  "purpose": "signup" | "login"
}
```

**Response:**
```json
{
  "success": true,
  "request_id": "uuid",
  "data": {
    "otp_sent": true,
    "phone_masked": "+1212555****",
    "expires_in_seconds": 60
  }
}
```

**OTP Constraints:**
- **Format:** 6 random digits
- **TTL:** 60 seconds
- **Max Attempts:** 5 per window
- **Delivery:** Console log (for testing)

#### Step 2: Verify OTP (for signup)
```bash
POST /api/v1/auth/student/otp/verify
Content-Type: application/json

{
  "phone_number": "+12125551234",
  "otp_code": "123456",
  "purpose": "signup"
}
```

**Response:**
```json
{
  "success": true,
  "request_id": "uuid",
  "data": {
    "verified": true,
    "phone_number": "+12125551234",
    "purpose": "signup"
  }
}
```

#### Step 3: Sign Up (with verified OTP)
```bash
POST /api/v1/auth/student/signup
Content-Type: application/json

{
  "phone_number": "+12125551234",
  "otp_code": "123456",
  "email": "student@example.com",
  "full_name": "John Doe",
  "graduation_year": 2026,
  "date_of_birth": "2005-03-20",
  "high_school_name": "Lincoln High",
  "state_of_residence": "California",
  "confirms_age_13_plus": true,
  "confirms_parental_permission": true,
  "invite_token": "optional_invite_token_here",
  "college_data_share": true
}
```

**Response:**
```json
{
  "success": true,
  "request_id": "uuid",
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "student_id": "student_uuid",
    "role": "student",
    "account_status": "active",
    "school_id": null,
    "email": "student@example.com",
    "full_name": "John Doe",
    "refresh_token_expires_at": "2026-06-12T10:30:00Z"
  }
}
```

### Login Flow

#### Step 1: Send OTP
```bash
POST /api/v1/auth/student/otp/send
{
  "phone_number": "+12125551234",
  "purpose": "login"
}
```

#### Step 2: Verify OTP & Login
```bash
POST /api/v1/auth/student/login
{
  "phone_number": "+12125551234",
  "otp_code": "123456"
}
```

**Response:** (Same as signup)

### JWT Token Structure

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload (Access Token):**
```json
{
  "sub": "student_uuid",
  "role": "student",
  "school_id": null,
  "iat": 1715516400,
  "exp": 1715517300
}
```

**Token Validity:**
- **Access Token:** 15 minutes
- **Refresh Token:** 30 days

### Using the Access Token

Every authenticated request must include:
```bash
Authorization: Bearer {access_token}
```

Example:
```bash
GET /api/v1/students/me/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Refresh Token Flow

When access token expires:
```bash
POST /api/v1/auth/student/token/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGc..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "new_access_token",
    "refresh_token": "new_refresh_token",
    "refresh_token_expires_at": "2026-06-12T10:30:00Z"
  }
}
```

### Logout

```bash
DELETE /api/v1/auth/student/logout
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "refresh_token": "optional_if_revoking_specific_session"
}
```

---

## Error Handling

### Error Response Format

All errors return a consistent JSON structure:

```json
{
  "success": false,
  "request_id": "unique_uuid",
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": {
      "field_name": ["specific error", "another error"]
    }
  }
}
```

### HTTP Status Codes

| Status | Meaning | Example Error Code |
|--------|---------|-------------------|
| 200 | OK | Success response |
| 201 | Created | Resource created |
| 204 | No Content | Deletion successful |
| 400 | Bad Request | VALIDATION_ERROR |
| 401 | Unauthorized | JWT_EXPIRED, OTP_INVALID |
| 403 | Forbidden | FORBIDDEN, INSUFFICIENT_PERMISSIONS |
| 409 | Conflict | PHONE_ALREADY_REGISTERED, COLLEGE_ALREADY_SAVED |
| 429 | Too Many Requests | RATE_LIMIT_EXCEEDED |
| 500 | Internal Server Error | DATABASE_ERROR |

### Comprehensive Error Codes

#### Authentication Errors
```
OTP_INVALID              — OTP code doesn't match or was never sent
OTP_EXPIRED              — OTP window expired (60 seconds)
OTP_TOO_MANY_ATTEMPTS    — 5+ attempts made, try again later
JWT_INVALID              — Token malformed or tampered
JWT_EXPIRED              — Token validity period ended
TOKEN_INVALID            — Refresh token invalid or revoked
PHONE_ALREADY_REGISTERED — Phone already signed up
PHONE_NOT_FOUND          — Phone not registered in system
PHONE_NOT_VERIFIED       — Phone verification OTP not completed
SESSION_INVALID          — Session not found or revoked
SESSION_EXPIRED          — Session expired (30 days)
SESSION_NOT_FOUND        — Refresh token doesn't exist
ACCOUNT_INACTIVE         — Student account disabled
```

#### Authorization Errors
```
FORBIDDEN                — User doesn't have permission
INSUFFICIENT_PERMISSIONS — Role/scope doesn't allow this action
UNAUTHORIZED             — Authentication required
```

#### Validation Errors
```
VALIDATION_ERROR         — Zod schema validation failed
MISSING_REQUIRED_FIELD   — Required field not provided
INVALID_FORMAT           — Format doesn't match expectation (e.g., E.164 phone)
GPA_OUT_OF_RANGE         — GPA must be 0.0 - 4.0
SAT_SCORE_REQUIRED       — SAT score needed (if using SAT)
ACT_SCORE_REQUIRED       — ACT score needed (if using ACT)
BOTH_SCORES_PROVIDED     — Can't use SAT and ACT simultaneously
AGE_CONFIRMATION_REQUIRED — Age 13+ consent required
AGE_GATE_FAILED          — Age confirmation not provided
PARENTAL_CONSENT_REQUIRED — Parental permission needed
```

#### Resource Errors
```
NOT_FOUND                — Requested resource doesn't exist
ACADEMIC_NOT_FOUND       — Student academics record not found
AWARD_NOT_FOUND          — Award record not found
COLLEGE_NOT_FOUND        — College record not found
ESSAY_NOT_FOUND          — Essay record not found
INVITE_TOKEN_INVALID     — Invite token incorrect/expired
INVITE_TOKEN_EXPIRED     — Invite validity window closed
INVITE_TOKEN_USED_UP     — Invite already used
SCHOLARSHIP_NOT_FOUND    — Scholarship not found
SERVICE_NOT_FOUND        — Community service record not found
NOTIFICATION_NOT_FOUND   — Notification not found
```

#### Conflict Errors
```
PHONE_ALREADY_REGISTERED — Phone in use by another account
COLLEGE_ALREADY_SAVED     — College already in student's saved list
SCHOLARSHIP_ALREADY_SAVED — Scholarship already saved
PUSH_TOKEN_ALREADY_EXISTS — Device token already registered
COLLEGE_DATA_SHARING_EXISTS — Data sharing consent already set
```

#### Rate Limit Errors
```
RATE_LIMIT_EXCEEDED      — Too many requests (see Retry-After header)
```

#### Account Deletion Errors
```
DELETION_ALREADY_INITIATED — Deletion process already started
DELETION_CONFIRMED         — Account will be deleted
REACTIVATION_WINDOW_CLOSED — 30-day grace period expired
NO_PENDING_DELETION        — No deletion request exists
```

#### Essay Errors
```
ESSAY_LOCKED             — Essay can't be modified (finalized)
ESSAY_REFLECTION_LOCKED  — Reflection section locked
ESSAY_STATUS_INVALID     — Invalid status transition
ESSAY_PREREQ_NOT_MET     — Prerequisites not complete
ESSAY_ALREADY_FINALIZED  — Essay already finalized
ESSAY_NOT_AVAILABLE      — Essay creation not allowed yet
ESSAY_CONFIRMATION_REQUIRED — Confirmation needed before finalize
```

#### Example Error Response

```json
{
  "success": false,
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "gpa": ["Must be between 0.0 and 4.0"],
      "sat_score": ["Cannot use both SAT and ACT scores"],
      "phone_number": ["Must be in E.164 format (+1xxxxxxxxxx)"]
    }
  }
}
```

---

## Middleware Chain

### Request Flow Diagram

```
Incoming Request
    ↓
[CORS] - Handle cross-origin
    ↓
[Request ID] - Generate unique request_id
    ↓
[JSON Parser] - Parse body (1MB max)
    ↓
[URL-Encoded Parser] - Parse form data
    ↓
Route Router
    ↓
[Rate Limiter] - Check token bucket
    ↓
[JWT Authenticator] - Verify token, extract user
    ↓
[Zod Validator] - Validate request schema
    ↓
[Audit Logger] - Log action metadata
    ↓
Controller Handler
    ↓
Service Layer
    ↓
Repository Layer
    ↓
Database
    ↓
Response Formatter
    ↓
[Score Recalc Trigger] - Queue if needed
    ↓
Response Headers + Body
    ↓
Outgoing HTTP Response
```

### Rate Limiting Details

**Token Bucket Algorithm:**
- Each endpoint has a bucket of tokens
- Token generation rate: `limit / time_window`
- Each request consumes 1 token
- When empty, return 429 with `Retry-After` header

**Configuration Per Endpoint:**

| Endpoint | Limit | Window |
|----------|-------|--------|
| OTP send/verify | 100 | 1 hour |
| Signup/Login | 100 | 1 hour |
| Profile GET | 120 | 1 minute |
| Profile UPDATE | 30 | 1 minute |
| Extracurricular LIST | 120 | 1 minute |
| Extracurricular CRUD | 30 | 1 minute |
| College search | 60 | 1 minute |
| Scholarships | 60 | 1 minute (list only) |
| All other operations | 30 | 1 minute |

**Response Headers:**
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 15
Retry-After: 45
```

---

## Database Schema

### 26 Core Tables

#### Core Student Tables

**students**
- `student_id` (UUID, PK)
- `school_id` (UUID, FK)
- `phone_number` (String, E.164)
- `email` (String)
- `role` (enum: 'student', 'admin')
- `account_status` (enum: 'active', 'inactive', 'suspended')
- `is_active` (Boolean)
- `phone_verified` (Boolean)
- `last_login_at` (Timestamp)
- `created_at`, `updated_at` (Timestamps)

**student_profiles**
- `profile_id` (UUID, PK)
- `student_id` (UUID, FK)
- `full_name` (String)
- `grade` (Integer: 9-12)
- `graduation_year` (Integer)
- `high_school_name` (String)
- `state_of_residence` (String)
- `city` (String, optional)
- `is_profile_complete` (Boolean)
- `profile_completion_pct` (Integer: 0-100)
- `created_at`, `updated_at` (Timestamps)

**student_academics**
- `academic_id` (UUID, PK)
- `student_id` (UUID, FK)
- `unweighted_gpa` (Decimal: 0.0-4.0)
- `course_rigor` (String)
- `sat_score` (Integer: 400-1600)
- `act_score` (Integer: 1-36)
- `created_at`, `updated_at` (Timestamps)

**student_scores**
- `score_id` (UUID, PK)
- `student_id` (UUID, FK)
- `total_score` (Integer)
- `component_scores` (JSON)
- `last_calculated_at` (Timestamp)

#### Activity Tables

**extracurricular_activities**
- `activity_id` (UUID, PK)
- `student_id` (UUID, FK)
- `activity_name` (String)
- `activity_type` (enum: 'club', 'sport', 'job', 'family', 'project', 'research', 'other')
- `years_involved` (Integer)
- `involvement_level` (enum: 'explored', 'consistent', 'key_contributor', 'leader_founder')
- `activity_description` (Text)
- `impact_text` (Text)
- `impact_level` (enum: 'participation_only', 'contributed', 'measurable', 'created_scaled')
- `hours_per_week` (Decimal)
- `display_order` (Integer)
- `created_at`, `updated_at` (Timestamps)

**honors_awards**
- `award_id` (UUID, PK)
- `student_id` (UUID, FK)
- `award_name` (String)
- `award_level` (enum: 'school', 'district', 'state', 'national')
- `frequency` (enum: 'one_time', 'multiple_years', 'annual_since')
- `annual_since_grade` (Integer, optional)
- `display_order` (Integer)
- `created_at`, `updated_at` (Timestamps)

**student_essays**
- `essay_id` (UUID, PK)
- `student_id` (UUID, FK)
- `essay_text` (Text)
- `status` (enum: 'draft', 'in_progress', 'submitted', 'finalized')
- `word_count` (Integer)
- `is_locked` (Boolean)
- `reviewer_confirmed` (Boolean)
- `confirmed_at` (Timestamp, optional)
- `finalized_at` (Timestamp, optional)
- `created_at`, `updated_at` (Timestamps)

**community_service_entries**
- `entry_id` (UUID, PK)
- `student_id` (UUID, FK)
- `service_name` (String)
- `hours` (Decimal)
- `description` (Text)
- `display_order` (Integer)
- `created_at`, `updated_at` (Timestamps)

#### College & Scholarship Tables

**colleges**
- `college_id` (UUID, PK)
- `name` (String)
- `state` (String)
- `major` (String)
- `tuition` (Decimal)
- `acceptance_rate` (Decimal)
- `sat_middle_50_low` (Integer)
- `sat_middle_50_high` (Integer)
- `act_middle_50_low` (Integer)
- `act_middle_50_high` (Integer)
- `created_at`, `updated_at` (Timestamps)

**student_saved_colleges**
- `saved_id` (UUID, PK)
- `student_id` (UUID, FK)
- `college_id` (UUID, FK)
- `major` (String, optional)
- `status` (enum: 'interested', 'shortlist', 'application', 'accepted', 'rejected')
- `fit_score` (Integer: 0-100)
- `saved_at` (Timestamp)

**scholarships**
- `scholarship_id` (UUID, PK)
- `title` (String)
- `amount` (Decimal)
- `deadline` (Date)
- `eligibility_criteria` (Text)
- `description` (Text)
- `created_at`, `updated_at` (Timestamps)

**student_saved_scholarships**
- `saved_id` (UUID, PK)
- `student_id` (UUID, FK)
- `scholarship_id` (UUID, FK)
- `saved_at` (Timestamp)

#### Authentication & Session Tables

**otp_verifications**
- `otp_id` (UUID, PK)
- `phone_number` (String, E.164)
- `code` (String: 6 digits)
- `purpose` (enum: 'signup', 'login')
- `attempts` (Integer)
- `expires_at` (Timestamp)
- `created_at` (Timestamp)

**student_sessions**
- `session_id` (UUID, PK)
- `student_id` (UUID, FK)
- `refresh_token` (String)
- `device_info` (JSON, optional)
- `expires_at` (Timestamp)
- `created_at` (Timestamp)

#### Notification & Consent Tables

**notifications**
- `notification_id` (UUID, PK)
- `student_id` (UUID, FK)
- `title` (String)
- `message` (Text)
- `type` (enum: 'college_update', 'scholarship', 'essay_feedback', 'profile_update', 'system')
- `is_read` (Boolean)
- `created_at` (Timestamp)

**notification_preferences**
- `pref_id` (UUID, PK)
- `student_id` (UUID, FK)
- `notification_type` (String)
- `email_enabled` (Boolean)
- `push_enabled` (Boolean)
- `created_at`, `updated_at` (Timestamps)

**student_consents**
- `consent_id` (UUID, PK)
- `student_id` (UUID, FK)
- `consent_type` (enum: 'age_gate', 'privacy_policy', 'college_data_share')
- `granted` (Boolean)
- `granted_at` (Timestamp)
- `revoked_at` (Timestamp, optional)

**push_tokens**
- `token_id` (UUID, PK)
- `student_id` (UUID, FK)
- `device_token` (String, unique)
- `device_type` (enum: 'ios', 'android')
- `registered_at` (Timestamp)

#### Support Tables

**schools**
- `school_id` (UUID, PK)
- `name` (String)
- `district` (String)
- `state` (String)

**invite_tokens**
- `token_id` (UUID, PK)
- `token` (String, unique)
- `school_id` (UUID, FK)
- `is_used` (Boolean)
- `expires_at` (Timestamp)

**audit_logs**
- `audit_id` (UUID, PK)
- `actor_id` (UUID, FK)
- `action_type` (enum: 'create', 'update', 'delete', 'login', 'logout', 'otp_send', 'otp_verify')
- `resource_type` (String)
- `resource_id` (UUID)
- `ip_address` (String)
- `metadata` (JSON)
- `created_at` (Timestamp)

**analytics_events**
- `event_id` (UUID, PK)
- `student_id` (UUID, FK)
- `event_type` (String)
- `event_data` (JSON)
- `timestamp` (Timestamp)

**feedback_submissions**
- `feedback_id` (UUID, PK)
- `student_id` (UUID, FK)
- `message` (Text)
- `category` (String, optional)
- `rating` (Integer: 1-5, optional)
- `created_at` (Timestamp)

**student_deletion_queue**
- `queue_id` (UUID, PK)
- `student_id` (UUID, FK)
- `initiated_at` (Timestamp)
- `scheduled_at` (Timestamp)
- `status` (enum: 'pending', 'confirmed', 'completed', 'cancelled')
- `confirmed_at` (Timestamp, optional)

**student_deletion_archive**
- `archive_id` (UUID, PK)
- `student_id` (UUID, FK)
- `deleted_at` (Timestamp)
- `archived_data` (JSON)

**cron_execution_logs**
- `log_id` (UUID, PK)
- `job_name` (String)
- `execution_time` (Timestamp)
- `status` (enum: 'success', 'failed')
- `result` (JSON, optional)

---

## Setup & Installation

### Prerequisites
- Node.js 22 LTS or higher
- npm or yarn
- SQL Server (Azure or local)
- Redis (optional, for advanced rate limiting)

### Installation Steps

#### 1. Clone Repository
```bash
git clone <repository-url>
cd unilantern-backend
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Configure Environment
```bash
cp .env.example .env
```

Then edit `.env` with your configuration (see next section).

#### 4. Build TypeScript
```bash
npm run build
```

#### 5. Start Server
```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

The server will start on `http://localhost:3000`

### Available Scripts

```bash
npm run build          # Compile TypeScript
npm run dev            # Start with nodemon (auto-reload)
npm start              # Start production server
npm run type-check     # Run TypeScript compiler check
npm test               # Run test suite (if configured)
npm run lint           # Run ESLint (if configured)
```

---

## Environment Variables

Create a `.env` file in the root directory with these variables:

```env
# Server Configuration
NODE_ENV=development                    # development | test | production
PORT=3000                              # Server port
HOST=127.0.0.1                         # Server host

# Database Configuration
DATABASE_URL=Server=<server>;Database=<db>;User Id=<user>;Password=<pass>;TrustServerCertificate=true;

# JWT Configuration
JWT_SECRET=your-super-secret-key-at-least-32-characters-long
JWT_ACCESS_TTL=15m                     # Access token validity (e.g., 15m, 1h)

# OTP Configuration
OTP_TTL_SECONDS=600                    # OTP validity in seconds (default: 10 min)

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379       # Optional, for advanced rate limiting

# Encryption Configuration (Optional)
DOB_ENCRYPTION_KEY=your-encryption-key-32-chars

# Email Configuration (Optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-email-password
```

### Configuration Details

| Variable | Type | Example | Notes |
|----------|------|---------|-------|
| `NODE_ENV` | string | "production" | Controls logging, error handling |
| `PORT` | number | 3000 | HTTP server port |
| `HOST` | string | "0.0.0.0" | Bind to all interfaces |
| `DATABASE_URL` | string | "Server=..." | SQL Server connection string |
| `JWT_SECRET` | string | 32+ chars | Symmetric key for token signing |
| `JWT_ACCESS_TTL` | string | "15m" | Access token expiry duration |
| `OTP_TTL_SECONDS` | number | 600 | OTP code validity (seconds) |
| `REDIS_URL` | string | "redis://..." | Optional for rate limiting |
| `DOB_ENCRYPTION_KEY` | string | 32+ chars | Optional for encrypting DOB |

### Example .env File

```env
NODE_ENV=development
PORT=3000
HOST=127.0.0.1
DATABASE_URL=Server=localhost;Database=UniLantern;User Id=sa;Password=YourPassword123;TrustServerCertificate=true;Encrypt=true;
JWT_SECRET=MySuper$ecureJWTSecretKey@123456789
JWT_ACCESS_TTL=15m
OTP_TTL_SECONDS=600
REDIS_URL=redis://localhost:6379
```

---

## API Documentation by Module

### Authentication Module
- **Path:** `/api/v1/auth/student`
- **Endpoints:** 8
  - Send OTP, Verify OTP
  - Signup with OTP verification
  - Login with phone + OTP
  - Refresh access token
  - Logout (invalidate sessions)
  - Get current user info
  - Validate invite tokens

### Student Profile Module
- **Path:** `/api/v1/students/me`
- **Endpoints:** 2
  - GET `/profile` — Retrieve student profile
  - PUT `/profile` — Update profile info (name, grade, school, state)

### Academics Module
- **Path:** `/api/v1/students/me/academics`
- **Endpoints:** 2
  - GET `/` — Retrieve GPA, test scores
  - PUT `/` — Update academic records

### Extracurriculars Module
- **Path:** `/api/v1/students/me/extracurriculars`
- **Endpoints:** 6
  - GET `/` — List all activities (paginated)
  - POST `/` — Create activity
  - GET `/:id` — Get single activity
  - PUT `/:id` — Update activity
  - DELETE `/:id` — Delete activity
  - POST `/reorder` — Reorder display order

### Awards & Honors Module
- **Path:** `/api/v1/students/me/awards`
- **Endpoints:** 4
  - GET `/` — List awards
  - POST `/` — Create award
  - PUT `/:id` — Update award
  - DELETE `/:id` — Delete award

### Essays Module
- **Path:** `/api/v1/students/me/essay`
- **Endpoints:** 5
  - GET `/` — View essay status (NOT content)
  - PUT `/content` — Update essay text
  - POST `/status/advance` — Progress essay status
  - POST `/reviewer-confirm` — Confirm reviewer
  - POST `/finalize` — Finalize essay

### Colleges Module
- **Path:** `/api/v1/colleges` & `/api/v1/students/me/colleges/saved`
- **Endpoints:** 7
  - GET `/search` — Search colleges (filter, paginate)
  - GET `/:id` — Get college details
  - GET `/students/me/colleges/saved` — List saved colleges
  - POST `/students/me/colleges/saved` — Save college
  - PATCH `/students/me/colleges/saved/:id` — Update saved college
  - DELETE `/students/me/colleges/saved/:id` — Unsave college
  - GET `/external/fetch` — Fetch from external API (rate-limited: 10/min)

### Scholarships Module
- **Path:** `/api/v1/students/me/scholarships`
- **Endpoints:** 4
  - GET `/` — List scholarships (paginated)
  - GET `/:id` — Get scholarship details
  - POST `/saved` — Save scholarship
  - DELETE `/saved/:id` — Unsave scholarship

### Community Service Module
- **Path:** `/api/v1/students/me/service`
- **Endpoints:** 4
  - GET `/` — List service entries
  - POST `/` — Create service entry
  - PUT `/:id` — Update service entry
  - DELETE `/:id` — Delete service entry

### Notifications Module
- **Path:** `/api/v1/students/me/notifications`
- **Endpoints:** 6
  - GET `/` — List notifications (filtered, paginated)
  - GET `/unread-count` — Count unread
  - GET `/preferences` — List notification preferences
  - PUT `/preferences` — Update preferences
  - POST `/mark-all-read` — Mark all as read
  - PATCH `/:id/read` — Mark single as read

### Push Tokens Module
- **Path:** `/api/v1/students/me/push-token`
- **Endpoints:** 2
  - POST `/` — Register device token
  - DELETE `/` — Deregister device token

### Consents Module
- **Path:** `/api/v1/students/me/consents`
- **Endpoints:** 3
  - GET `/` — List all consents
  - POST `/:type/grant` — Grant consent
  - POST `/:type/revoke` — Revoke consent

### Account Deletion Module
- **Path:** `/api/v1/students/me/account`
- **Endpoints:** 4
  - DELETE `/` — Initiate deletion (sends OTP)
  - POST `/confirm-deletion` — Confirm with OTP
  - POST `/reactivate` — Cancel deletion (within grace period)
  - GET `/deletion-status` — Check deletion status

### School Linking Module
- **Path:** `/api/v1/schools` & `/api/v1/students/me/school`
- **Endpoints:** 4
  - GET `/schools/search` — Search schools
  - POST `/students/me/school/link` — Link to school
  - POST `/students/me/school/merge-confirm` — Confirm merge
  - GET `/students/me/school` — Get linked school

### College Data Sharing Module
- **Path:** `/api/v1/students/me/college-data-sharing`
- **Endpoints:** 1
  - PUT `/` — Update data sharing preference

### Analytics Module
- **Path:** `/api/v1/analytics`
- **Endpoints:** 1
  - POST `/events` — Track event

### Settings & Feedback Module
- **Path:** `/api/v1`
- **Endpoints:** 2
  - POST `/feedback` — Submit feedback
  - (Account deletion handled in Account Deletion module)

### Health Check
- **Path:** `/` or `/health`
- **Endpoints:** 2
  - GET `/` — Welcome message
  - GET `/health` — Health status

---

## DTO Patterns & Validation

### Example: Create Extracurricular DTO

**Request DTO (request.dto.ts):**
```typescript
import { z } from 'zod';

export const createExtracurricularSchema = z.object({
  activity_name: z.string().min(1).max(200),
  activity_type: z.enum([
    'club',
    'sport',
    'job',
    'family',
    'project',
    'research',
    'other',
  ]),
  years_involved: z.number().int().min(0).max(12),
  involvement_level: z.enum([
    'explored',
    'consistent',
    'key_contributor',
    'leader_founder',
  ]),
  activity_description: z.string().max(1000),
  impact_text: z.string().max(500),
  impact_level: z.enum([
    'participation_only',
    'contributed',
    'measurable',
    'created_scaled',
  ]),
  hours_per_week: z.number().min(0).max(168),
});

export type CreateExtracurricularDTO = z.infer<
  typeof createExtracurricularSchema
>;
```

**Response DTO (response.dto.ts):**
```typescript
export interface ExtracurricularResponseDTO {
  activity_id: string;
  activity_name: string;
  activity_type: string;
  years_involved: number;
  involvement_level: string;
  activity_description: string;
  impact_text: string;
  impact_level: string;
  hours_per_week: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Note: Internal fields (student_id, updated_fields array, score_recalc_queued)
// are NOT included in individual responses but shown in list/batch operations
```

### Validation Pattern

```typescript
// In controller
const validateCreateDTO = (data: unknown) => {
  const result = createExtracurricularSchema.safeParse(data);

  if (!result.success) {
    throw new ValidationError(
      'Invalid extracurricular data',
      Object.fromEntries(
        result.error.issues.map((issue) => [
          issue.path.join('.'),
          issue.message,
        ])
      )
    );
  }

  return result.data;
};
```

---

## Common Usage Patterns

### 1. Create a Resource
```typescript
// Request
POST /api/v1/students/me/extracurriculars
Authorization: Bearer {access_token}
{
  "activity_name": "Robotics Club",
  "activity_type": "club",
  "years_involved": 2,
  "involvement_level": "leader_founder",
  "activity_description": "...",
  "impact_text": "...",
  "impact_level": "created_scaled",
  "hours_per_week": 5
}

// Response (201 Created)
{
  "success": true,
  "request_id": "uuid",
  "data": {
    "activity_id": "uuid",
    "display_order": 1,
    "score_recalc_queued": true,
    "created_at": "2026-05-12T10:30:00Z"
  }
}
```

### 2. Update a Resource
```typescript
// Request
PUT /api/v1/students/me/extracurriculars/{activity_id}
Authorization: Bearer {access_token}
{
  "activity_name": "Advanced Robotics Club",
  "involvement_level": "key_contributor"
}

// Response (200 OK)
{
  "success": true,
  "request_id": "uuid",
  "data": {
    "activity_id": "uuid",
    "updated_fields": ["activity_name", "involvement_level"],
    "score_recalc_queued": true,
    "updated_at": "2026-05-12T10:35:00Z"
  }
}
```

### 3. Delete a Resource
```typescript
// Request
DELETE /api/v1/students/me/extracurriculars/{activity_id}
Authorization: Bearer {access_token}

// Response (200 OK)
{
  "success": true,
  "request_id": "uuid",
  "data": {
    "success": true,
    "score_recalc_queued": true
  }
}
```

### 4. List Resources (Cursor Pagination)
```typescript
// Request
GET /api/v1/students/me/extracurriculars?cursor=abc123&limit=10
Authorization: Bearer {access_token}

// Response (200 OK)
{
  "success": true,
  "request_id": "uuid",
  "data": {
    "activities": [
      { "activity_id": "...", "activity_name": "..." },
      ...
    ],
    "next_cursor": "xyz789",
    "has_more": true
  }
}
```

### 5. Get Single Resource
```typescript
// Request
GET /api/v1/students/me/extracurriculars/{activity_id}
Authorization: Bearer {access_token}

// Response (200 OK)
{
  "success": true,
  "request_id": "uuid",
  "data": {
    "activity_id": "...",
    "activity_name": "...",
    // ... full object
  }
}
```

---

## Troubleshooting

### Common Issues

**1. JWT_EXPIRED Error**
- **Cause:** Access token validity period (15 minutes) expired
- **Solution:** Use refresh token to get new access token
- **Endpoint:** `POST /api/v1/auth/student/token/refresh`

**2. OTP_EXPIRED Error**
- **Cause:** OTP validity window (60 seconds) closed
- **Solution:** Request new OTP
- **Endpoint:** `POST /api/v1/auth/student/otp/send`

**3. PHONE_ALREADY_REGISTERED Error**
- **Cause:** Phone number already has an account
- **Solution:** Use different phone or login instead
- **Endpoint:** `POST /api/v1/auth/student/login`

**4. RATE_LIMIT_EXCEEDED Error**
- **Cause:** Too many requests in time window
- **Solution:** Check `Retry-After` header, wait before retrying
- **Headers:** `X-RateLimit-Remaining`, `Retry-After`

**5. VALIDATION_ERROR**
- **Cause:** Request doesn't match schema
- **Solution:** Check error details for specific field issues
- **Response:** Includes `details` object with per-field errors

**6. FORBIDDEN**
- **Cause:** User doesn't own the resource
- **Solution:** Can only access own data (not other students')
- **Example:** Can't update another student's profile

**7. 500 Internal Server Error**
- **Cause:** Unexpected server error
- **Solution:** Check server logs, contact support
- **Include:** `request_id` from response

---

## Additional Resources

### Related Documentation Files
- [BACKEND_EXPLAINED.md](BACKEND_EXPLAINED.md) — Detailed module breakdown
- [Testing_Guide.md](Testing_Guide.md) — Testing instructions
- [unilantern-folder-structure-with-dtos.md](unilantern-folder-structure-with-dtos.md) — Folder structure details

### Postman Collections
- [UniLantern_Backend_API.postman_collection.json](UniLantern_Backend_API.postman_collection.json) — Complete collection (70+ endpoints)
- [postman_environment.json](postman_environment.json) — Environment variables

### Database Scripts
- [unilantern_sqlserver_part1_tables1to15.sql](unilantern_sqlserver_part1_tables1to15.sql) — Table creation (Part 1)
- [unilantern_sqlserver_part2_tables16to25.sql](unilantern_sqlserver_part2_tables16to25.sql) — Table creation (Part 2)

---

## Support & Contribution

For issues, questions, or contributions:
1. Check existing documentation
2. Review error code descriptions in this README
3. Contact the development team
4. Submit issues with `request_id` and error details

---

**Last Updated:** May 12, 2026
**API Version:** v1
**Status:** Production Ready

