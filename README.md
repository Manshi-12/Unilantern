# UniLantern Backend API

UniLantern is a Node.js, Express, TypeScript, and SQL Server backend for a student college-readiness platform. It supports student authentication, profile setup, academics, extracurriculars, awards, essays, service, college search, scholarships, consents, notifications, analytics, and the Lantern Readiness Index.

The API is organized around student workflows. A student signs up with phone OTP verification, creates a profile, adds readiness data across multiple modules, and receives a calculated readiness band with category-level feedback.

## Current Status

- Runtime: Node.js / Express 5 / TypeScript
- Database: Microsoft SQL Server through the `mssql/msnodesqlv8` driver
- Validation: Zod request schemas
- Auth: OTP verification, JWT access tokens, refresh-token sessions
- Scoring: Central asynchronous scoring orchestrator
- API collection: `UniLantern Student Backend API.postman_collection.json`
- SQL schema scripts: `unilantern_sqlserver_part1_tables1to15.sql` and `unilantern_sqlserver_part2_tables16to25.sql`

## Core Concepts

### Authentication

Student auth uses OTP-first phone verification.

1. Send an OTP with `POST /api/v1/auth/student/otp/send`.
2. Verify the OTP with `POST /api/v1/auth/student/otp/verify`.
3. Use the returned `phone_verify_token` for signup or login.
4. Authenticated requests use `Authorization: Bearer <access_token>`.
5. Refresh tokens are stored in `student_sessions` and can be rotated with `POST /api/v1/auth/student/token/refresh`.

There are two auth middleware entry points for compatibility, but `verifyJWT` is the canonical implementation. Both auth paths populate:

- `res.locals.user`
- `res.locals.userId`
- `res.locals.studentId`
- `res.locals.role`
- `res.locals.schoolId`

### Signup Profile Creation

Signup creates both the `students` row and the `student_profiles` row in one transaction. Profile data is not lazily auto-created later, because scoring depends on real signup/profile values such as `graduation_year` and `grade`.

Signup/profile fields include:

- `full_name`
- `grade` when provided
- `graduation_year`
- `date_of_birth`
- `high_school_name`
- `state_of_residence`
- consent flags

### Consent Source of Truth

College data sharing is stored in `student_consents` with `consent_type = 'college'`. The college-data-sharing endpoint reads and writes that same consent row, so it stays consistent with the broader consents module.

### Rate Limiting

The current rate limiter uses an in-memory `Map`. This is acceptable for local development and a single Node.js process, but it is not a production multi-process store. Before production traffic, replace it with a shared store such as Redis or a DB-backed limiter.

## Readiness Scoring

Readiness scoring is centralized in:

- `src/modules/student/scoring/scoring.orchestrator.ts`

The orchestrator reads all profile inputs, calls the individual scorers, writes `student_scores`, and inserts a snapshot into `student_score_history` when the student has a grade.

Scoring inputs:

- Academics: GPA, rigor, SAT/ACT status
- Extracurriculars: depth, duration, involvement, impact, metrics, leadership, early strength
- Essay: grade-aware status score
- Awards: level and frequency with diminishing weights
- Service: hours, action type, leadership, duration

Scoring output:

- Category normalized values and contributions
- Category bands
- Overall `total_score`
- Overall readiness band
- On-track/ahead overlay
- Primary limiter
- Trend direction in history
- Signal flags such as standout awards, founder EC, academic strength, and independent impact

Write endpoints that queue recalculation:

- Student profile updates
- Academics updates
- Extracurricular create/update/delete
- Awards create/update/delete
- Essay content/status/finalize changes
- Service create/update/delete
- Manual readiness recalculation

## Project Structure

```text
src/
  app.ts
  server.ts
  config/
    constants.ts
    env.ts
  db/
    client.ts
    schema/
  shared/
    errors/
    middleware/
    repository/
    response/
    utils/
  modules/
    auth/student/
    student/
      academics/
      account-deletion/
      analytics/
      awards/
      college-data-sharing/
      colleges/
      consents/
      essay/
      extracurriculars/
      notifications/
      push-tokens/
      readiness/
      scholarships/
      school-linking/
      scoring/
      service/
      settings/
      student_profile/
```

Each feature generally follows this shape:

```text
module.routes.ts       Express routes and middleware
module.controller.ts   HTTP request/response handling
module.service.ts      Business logic
module.repository.ts   SQL Server access
module.schema.ts       Zod validation
module.types.ts        Internal TypeScript types
dto/                   Request and response DTO shapes
```

## Main API Groups

### Health

- `GET /`
- `GET /health`

### Student Auth

Base path: `/api/v1/auth/student`

- `POST /otp/send`
- `POST /otp/verify`
- `POST /invite/validate`
- `POST /signup`
- `POST /login`
- `POST /token/refresh`
- `DELETE /logout`
- `GET /me`

### Student Profile

- `GET /api/v1/students/me/profile`
- `PUT /api/v1/students/me/profile`

### Academics

Base path: `/api/v1/students/me/academics`

- `GET /`
- `PUT /`

### Extracurriculars

Base path: `/api/v1/students/me/extracurriculars`

- `GET /`
- `POST /`
- `GET /:activity_id`
- `PUT /:activity_id`
- `DELETE /:activity_id`
- `POST /reorder`

### Awards

Base path: `/api/v1/students/me/awards`

- `GET /`
- `POST /`
- `PUT /:award_id`
- `DELETE /:award_id`

### Essay

Base path: `/api/v1/students/me/essay`

- `GET /`
- `PUT /content`
- `POST /status/advance`
- `POST /reviewer-confirm`
- `POST /finalize`

### Community Service

- `GET /api/v1/students/me/service`
- `POST /api/v1/students/me/service`
- `PUT /api/v1/students/me/service/:service_id`
- `DELETE /api/v1/students/me/service/:service_id`

### Readiness

Base path: `/api/v1/students/me/readiness`

- `GET /`
- `GET /history`
- `GET /improvement`
- `POST /recalculate`

### Consents and College Data Sharing

- `GET /api/v1/students/me/consents`
- `POST /api/v1/students/me/consents/:consent_type/grant`
- `POST /api/v1/students/me/consents/:consent_type/revoke`
- `GET /api/v1/students/me/college-data-sharing`
- `PUT /api/v1/students/me/college-data-sharing`

### Colleges and Scholarships

- `GET /api/v1/colleges/search`
- `GET /api/v1/colleges/:college_id`
- `GET /api/v1/students/me/colleges/saved`
- `POST /api/v1/students/me/colleges/saved`
- `DELETE /api/v1/students/me/colleges/saved/:college_id`
- Scholarship routes are mounted under `/api/v1` through the scholarships module.

### Other Student Modules

- Settings
- School linking
- Analytics
- Notifications
- Push tokens
- Account deletion

## Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file with the required values:

```env
NODE_ENV=development
PORT=3000
HOST=127.0.0.1
DATABASE_URL=Data Source=YOUR_SQL_SERVER;Initial Catalog=YOUR_DATABASE;
JWT_SECRET=replace_with_at_least_32_characters
JWT_ACCESS_TTL=15m
OTP_TTL_SECONDS=300
REDIS_URL=
DOB_ENCRYPTION_KEY=
```

Run in development:

```bash
npm run dev
```

Build TypeScript:

```bash
npm run build
```

Run compiled output:

```bash
npm run serve
```

## Database

The schema constants live in `src/db/schema`. SQL Server setup scripts are included in the repository:

- `unilantern_sqlserver_part1_tables1to15.sql`
- `unilantern_sqlserver_part2_tables16to25.sql`

Important tables:

- `students`
- `student_profiles`
- `student_sessions`
- `otp_verifications`
- `student_consents`
- `student_academics`
- `extracurricular_activities`
- `honors_awards`
- `student_essays`
- `community_service_entries`
- `student_scores`
- `student_score_history`
- `colleges`
- `scholarships`
- `notifications`
- `push_tokens`
- `audit_logs`

## Error Format

Most errors return a consistent JSON envelope through the shared error handler. Zod validation errors return field-level details. Application errors use typed error codes from `src/shared/response/error-codes.ts`.

## Postman

Use `UniLantern Student Backend API.postman_collection.json` for manual API testing.

Suggested flow:

1. Set `base_url` to `http://localhost:3000`.
2. Send OTP for signup.
3. Verify OTP and store `phone_verify_token`.
4. Signup and store `access_token` and `refresh_token`.
5. Add profile, academics, extracurriculars, awards, essay, and service data.
6. Call readiness endpoints.

## Production Checklist

Before production traffic:

- Replace the in-memory rate limiter with a shared persistent limiter.
- Use a production SMS provider instead of console OTP logging.
- Store secrets outside `.env` files.
- Confirm SQL indexes and constraints match the deployed scripts.
- Run `npm run build`.
- Review readiness-score formulas against the latest product proposal.
- Confirm Postman examples match deployed environment variables.
