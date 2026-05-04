# Unilantern Student Auth — API Testing Guide

**Base URL:** `http://localhost:3000/api/v1/auth/student`  
**Content-Type:** `application/json`  
**OTP valid for:** 60 seconds  
**JWT access token valid for:** 15 minutes

---

## Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/register` | Step 1 — submit profile, receive OTP on phone |
| `POST` | `/register/verify` | Step 2 — verify OTP → account created → JWT |
| `POST` | `/login` | Step 1 — submit phone, receive OTP |
| `POST` | `/login/verify` | Step 2 — verify OTP → JWT |

---

## REGISTRATION FLOW

### Step 1 — Submit Profile Details

**POST** `/register`

Submit all details upfront. Backend validates, stores temporarily, sends OTP to phone.

#### Adult (18+)
```json
{
  "phone_number": "+12125551234",
  "full_name": "John Doe",
  "graduation_year": 2026,
  "date_of_birth": "2005-03-20",
  "high_school_name": "Lincoln High School",
  "state_of_residence": "California",
  "confirms_age_13_plus": true,
  "confirms_parental_permission": false,
  "college_data_share": true
}
```

#### Minor (13–17) — parental permission required
```json
{
  "phone_number": "+12125551234",
  "full_name": "Jane Minor",
  "graduation_year": 2027,
  "date_of_birth": "2010-06-15",
  "high_school_name": "Westwood Middle School",
  "state_of_residence": "Texas",
  "confirms_age_13_plus": true,
  "confirms_parental_permission": true,
  "college_data_share": true
}
```

**Success `200`**
```json
{
  "otp_sent": true,
  "phone_masked": "+1212***1234",
  "expires_in_seconds": 60
}
```

> OTP printed in server console (dev):  
> `[otp:dev] phone=+12125551234 code=492817`  
> You have **60 seconds** to verify.

**Errors**

| HTTP | error | Cause |
|---|---|---|
| `409` | `PHONE_ALREADY_REGISTERED` | Phone already has an account |
| `403` | `AGE_GATE_FAILED` | DOB makes student under 13 |
| `400` | `AGE_CONFIRMATION_REQUIRED` | `confirms_age_13_plus` is false |
| `403` | `PARENTAL_CONSENT_REQUIRED` | Age 13–17 but `confirms_parental_permission` is false |
| `422` | `VALIDATION_ERROR` | Invalid fields — see `fields[]` in response |

---

### Step 2 — Verify OTP → Account Created

**POST** `/register/verify`

```json
{
  "phone_number": "+12125551234",
  "otp_code": "492817"
}
```

**Success `201`** — account inserted into DB, JWT returned
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "student_id": "1",
  "role": "student",
  "account_status": "independent",
  "school_id": null,
  "full_name": "John Doe"
}
```

**DB rows written on success:**

`students`
```
role           = 'student'     ← always fixed by DB CHECK constraint
is_active      = 1             ← auto
phone_verified = 1             ← auto (OTP verified)
account_status = 'independent' ← 'school_linked' if invite_token provided
created_at     = now()
updated_at     = now()
```

`student_profiles`
```
graduation_year    = from Step 1
date_of_birth      = from Step 1
high_school_name   = from Step 1
state_of_residence = from Step 1
profile_complete   = 0  ← DB default
onboarding_step    = 0  ← DB default
```

`student_consents` (3 rows)
```
consent_type='age_13plus'     status='granted'          source='signup'
consent_type='parental_13_17' status='granted'|'revoked' source='signup'
consent_type='college'        status='granted'|'revoked' source='signup'
```

**Errors**

| HTTP | error | Cause |
|---|---|---|
| `401` | `OTP_EXPIRED` | OTP older than 60s or already used |
| `401` | `OTP_INVALID` | Wrong code |
| `401` | `OTP_EXPIRED` | Registration session expired (Step 1 done >60s ago) |
| `429` | `OTP_TOO_MANY_ATTEMPTS` | 5 failed attempts — redo Step 1 |

---

## LOGIN FLOW

### Step 1 — Send OTP

**POST** `/login`

```json
{
  "phone_number": "+12125551234"
}
```

**Success `200`**
```json
{
  "otp_sent": true,
  "phone_masked": "+1212***1234",
  "expires_in_seconds": 60
}
```

**Errors**

| HTTP | error | Cause |
|---|---|---|
| `404` | `PHONE_NOT_FOUND` | No account for this number |
| `403` | `ACCOUNT_INACTIVE` | Account disabled |

---

### Step 2 — Verify OTP → Logged In

**POST** `/login/verify`

```json
{
  "phone_number": "+12125551234",
  "otp_code": "382910"
}
```

**Success `200`** — `last_login_at` updated in DB
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "student_id": "1",
  "role": "student",
  "account_status": "independent",
  "school_id": null,
  "full_name": "John Doe"
}
```

**Errors**

| HTTP | error | Cause |
|---|---|---|
| `404` | `PHONE_NOT_FOUND` | No account for this number |
| `401` | `OTP_EXPIRED` | OTP older than 60s |
| `401` | `OTP_INVALID` | Wrong code |
| `429` | `OTP_TOO_MANY_ATTEMPTS` | 5 failed attempts |

---

## Field Rules

| Field | Rule |
|---|---|
| `phone_number` | E.164 format — starts with `+`, e.g. `+12125551234` |
| `otp_code` | Exactly 6 digits as string, e.g. `"492817"` |
| `full_name` | 1–200 chars |
| `graduation_year` | Integer, 2026–2032 |
| `date_of_birth` | `YYYY-MM-DD`, student must be ≥ 13 years old |
| `high_school_name` | 1–200 chars |
| `state_of_residence` | 1–100 chars |
| `confirms_age_13_plus` | Must be `true` |
| `confirms_parental_permission` | Must be `true` if age 13–17 |
| `college_data_share` | Optional, default `true` |
| `invite_token` | Optional, `null` or omit if not available |

---

## Error Response Shape

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message"
}
```

Validation errors:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid input",
  "fields": [
    { "field": "date_of_birth", "message": "date_of_birth must be YYYY-MM-DD" },
    { "field": "graduation_year", "message": "graduation_year must be >= 2026" }
  ]
}
```

---

## Rate Limits

| Endpoint | Limit | Per |
|---|---|---|
| `POST /register` | 3 requests | per hour per IP |
| `POST /register/verify` | 5 requests | per hour per phone |
| `POST /login` | 5 requests | per hour per phone |
| `POST /login/verify` | 10 requests | per hour per IP |
