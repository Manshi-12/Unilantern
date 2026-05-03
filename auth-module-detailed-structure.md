# UniLantern — AUTH MODULE — Comprehensive Structure
## 4 Separate User Roles with Independent Tables, Auth Flows, and DTOs

> **Architecture**: Role-based separation means each role has its own:
> - Database table (`student_auth`, `advisor_auth`, `school_admin_auth`, `unilantern_admin_auth`)
> - Service layer with role-specific logic
> - DTO sets (request + response, role-scoped)
> - Controller (handles role-specific validation)
> - Zod schemas (with role-specific constraints)
> - Routes (prefixed by role or disambiguated in controller)
> - Repository (queries against the role's table)

---

## DATABASE TABLES (Schema Reference)

### Table: student_auth
```sql
student_id              INT IDENTITY(1,1) PRIMARY KEY
school_id               INT FK → schools (nullable; until school-linked)
role                    'student' (fixed, CHECK constraint)
account_status          'independent' | 'school_linked'
is_active               BIT
phone_number            VARCHAR(25) UNIQUE, E.164 format
phone_verified          BIT
full_name               VARCHAR(200)
invite_token_used       VARCHAR(500)
last_login_at           DATETIMEOFFSET
created_at, updated_at
```

### Table: advisor_auth
```sql
advisor_id              INT IDENTITY(1,1) PRIMARY KEY
school_id               INT FK → schools (NOT NULL; always school-scoped)
role                    'advisor' (fixed, CHECK constraint)
is_active               BIT
email                   VARCHAR(320) UNIQUE
password_hash           VARCHAR(255) (bcrypt/argon2)
full_name               VARCHAR(200)
last_login_at           DATETIMEOFFSET
created_at, updated_at
```

### Table: school_admin_auth
```sql
school_admin_id         INT IDENTITY(1,1) PRIMARY KEY
school_id               INT FK → schools (NOT NULL)
role                    'school_admin' (fixed, CHECK constraint)
is_active               BIT
email                   VARCHAR(320) UNIQUE
password_hash           VARCHAR(255)
full_name               VARCHAR(200)
last_login_at           DATETIMEOFFSET
created_at, updated_at
```

### Table: unilantern_admin_auth
```sql
admin_id                INT IDENTITY(1,1) PRIMARY KEY
role                    'unilantern_admin' (fixed, CHECK constraint)
is_active               BIT
mfa_enabled             BIT (enforce in production)
email                   VARCHAR(320) UNIQUE
password_hash           VARCHAR(255)
full_name               VARCHAR(200)
last_login_at           DATETIMEOFFSET
created_at, updated_at
```

### Table: otp_verifications
```sql
otp_id                  INT IDENTITY(1,1) PRIMARY KEY
phone_number            VARCHAR(25) (E.164; student signup/login only)
purpose                 'signup' | 'login' | 'password_reset' | 'phone_change'
otp_code_hash           VARCHAR(255) (bcrypt of 6-digit code)
is_used                 BIT
attempts                SMALLINT (rate-limit after 5)
expires_at              DATETIMEOFFSET (SYSDATETIMEOFFSET() + 10min)
created_at              DATETIMEOFFSET
```

### Table: invite_tokens
```sql
token_id                INT IDENTITY(1,1) PRIMARY KEY
school_id               INT FK → schools
created_by_school_admin_id INT FK → school_admin_auth (nullable)
token                   VARCHAR(500) UNIQUE (UUID text)
max_uses                INT (DEFAULT 1 for per-student; 300–500 for school-wide)
times_used              INT
is_active               BIT
expires_at              DATETIMEOFFSET (nullable; NULL = no expiry)
created_at, updated_at
```

---

## FOLDER STRUCTURE

```
src/
├── modules/
│   └── auth/                                # ============================================
│       │                                    # AUTH MODULE — 4 SEPARATE USER ROLES
│       │                                    # ============================================
│       │
│       ├── dto/                             # ── SHARED ENUMS & COMMON TYPES ──
│       │   ├── common.dto.ts                # JwtPayloadDto, TokenResponseDto,
│       │   │                                #   ErrorResponseDto, OtpErrorDto
│       │   │                                # Shared across all roles but not exposed to clients
│       │   │
│       │   │   ── STUDENT SIGNUP/LOGIN DTOs ──
│       │   │
│       │   ├── student/
│       │   │   ├── student-request.dto.ts   # StudentSendOtpRequestDto
│       │   │   │                            #   { phone_number: string (E.164) }
│       │   │   │                            # StudentVerifyOtpRequestDto
│       │   │   │                            #   { phone_number: string, otp_code: string }
│       │   │   │                            # StudentSignupRequestDto
│       │   │   │                            #   { phone_number: string,
│       │   │   │                            #     full_name: string,
│       │   │   │                            #     graduation_year: number,
│       │   │   │                            #     date_of_birth: string (ISO),
│       │   │   │                            #     high_school_name: string,
│       │   │   │                            #     state_of_residence: string,
│       │   │   │                            #     confirms_age_13_plus: boolean (required),
│       │   │   │                            #     confirms_parental_permission: boolean
│       │   │   │                            #       (required if age 13–17; ignored if 18+),
│       │   │   │                            #     invite_token: string,
│       │   │   │                            #     college_data_share: boolean (default true) }
│       │   │   │                            # StudentLoginRequestDto
│       │   │   │                            #   { phone_number: string, otp_code: string }
│       │   │   └── student-response.dto.ts  # StudentSendOtpResponseDto
│       │   │                                #   { expires_in_seconds: number,
│       │   │                                #     phone_masked: string (e.g. '+1•••••2671') }
│       │   │                                # StudentSignupResponseDto
│       │   │                                #   { access_token: string,
│       │   │                                #     student_id: string,
│       │   │                                #     role: 'student',
│       │   │                                #     account_status: 'independent' | 'school_linked',
│       │   │                                #     school_id?: string,
│       │   │                                #     full_name: string }
│       │   │                                # StudentLoginResponseDto (same as signup)
│       │   │                                # StudentMeResponseDto
│       │   │                                #   { student_id: string, full_name: string,
│       │   │                                #     phone_number_masked: string, role: 'student',
│       │   │                                #     account_status: string,
│       │   │                                #     school_id?: string, grade?: number,
│       │   │                                #     graduation_year: number }
│       │   │
│       │   │   ── ADVISOR SIGNUP/LOGIN DTOs ──
│       │   │
│       │   ├── advisor/
│       │   │   ├── advisor-request.dto.ts   # AdvisorLoginRequestDto
│       │   │   │                            #   { email: string, password: string }
│       │   │   │                            # AdvisorSignupRequestDto
│       │   │   │                            #   { email: string, password: string,
│       │   │   │                            #     full_name: string, school_id: string,
│       │   │   │                            #     invite_token?: string (future) }
│       │   │   │                            # AdvisorRefreshTokenRequestDto {} (empty; cookie)
│       │   │   └── advisor-response.dto.ts  # AdvisorLoginResponseDto
│       │   │                                #   { access_token: string,
│       │   │                                #     advisor_id: string, role: 'advisor',
│       │   │                                #     full_name: string, school_id: string,
│       │   │                                #     school_name: string }
│       │   │                                # AdvisorMeResponseDto
│       │   │                                #   { advisor_id: string, full_name: string,
│       │   │                                #     email: string, role: 'advisor',
│       │   │                                #     school_id: string, school_name: string }
│       │   │
│       │   │   ── SCHOOL_ADMIN SIGNUP/LOGIN DTOs ──
│       │   │
│       │   ├── school-admin/
│       │   │   ├── school-admin-request.dto.ts  # SchoolAdminLoginRequestDto
│       │   │   │                            #   { email: string, password: string }
│       │   │   │                            # SchoolAdminSignupRequestDto (self-registration)
│       │   │   │                            #   { school_name: string, school_address: string,
│       │   │   │                            #     school_type: 'public' | 'private' | 'charter',
│       │   │   │                            #     email_domain: string,
│       │   │   │                            #     admin_email: string, admin_full_name: string,
│       │   │   │                            #     admin_password: string }
│       │   │   └── school-admin-response.dto.ts # SchoolAdminLoginResponseDto
│       │   │                                #   { access_token: string,
│       │   │                                #     school_admin_id: string,
│       │   │                                #     role: 'school_admin',
│       │   │                                #     full_name: string,
│       │   │                                #     school_id: string, school_name: string }
│       │   │                                # SchoolAdminMeResponseDto
│       │   │                                #   { school_admin_id: string, full_name: string,
│       │   │                                #     email: string, role: 'school_admin',
│       │   │                                #     school_id: string, school_name: string }
│       │   │
│       │   │   ── UNILANTERN_ADMIN SIGNUP/LOGIN DTOs ──
│       │   │
│       │   └── unilantern-admin/
│       │       ├── unilantern-admin-request.dto.ts  # UnilanternAdminLoginRequestDto
│       │       │                            #   { email: string, password: string,
│       │       │                            #     mfa_code?: string (if mfa_enabled) }
│       │       └── unilantern-admin-response.dto.ts # UnilanternAdminLoginResponseDto
│       │                                    #   { access_token: string,
│       │                                    #     admin_id: string, role: 'unilantern_admin',
│       │                                    #     full_name: string, email: string,
│       │                                    #     mfa_enabled: boolean }
│       │                                    # UnilanternAdminMeResponseDto
│       │                                    #   { admin_id: string, full_name: string,
│       │                                    #     email: string, role: 'unilantern_admin',
│       │                                    #     mfa_enabled: boolean }
│       │
│       ├── schemas/                         # ── ZOD VALIDATION SCHEMAS ──
│       │   ├── student-auth.schema.ts       # sendOtpStudentSchema, verifyOtpSchema,
│       │   │                                # studentSignupSchema (with age_gate + parental_consent logic),
│       │   │                                # studentLoginSchema
│       │   ├── advisor-auth.schema.ts       # advisorLoginSchema, advisorSignupSchema
│       │   ├── school-admin-auth.schema.ts  # schoolAdminLoginSchema, schoolAdminSignupSchema
│       │   └── unilantern-admin-auth.schema.ts # adminLoginSchema (+ mfa code validation)
│       │
│       ├── types/                           # ── INTERNAL TYPES (not DTOs) ──
│       │   ├── auth.types.ts                # OtpPurposeEnum, ReviewerTypeEnum,
│       │   │                                # JwtPayload (sub, role, school_id, iat, exp),
│       │   │                                # AuthToken { accessToken, refreshToken },
│       │   │                                # StudentAccount, AdvisorAccount, etc.
│       │   └── jwt.types.ts                 # JwtPayloadDto, RefreshTokenPayload
│       │
│       ├── repositories/                    # ── DATABASE ACCESS LAYER ──
│       │   │
│       │   ├── student-auth.repository.ts   # findStudentByPhone(phone),
│       │   │                                # findStudentById(student_id),
│       │   │                                # createStudent(payload),
│       │   │                                # updateStudentLastLogin(student_id),
│       │   │                                # updateStudentSchool(student_id, school_id),
│       │   │                                # isPhoneRegistered(phone)
│       │   │
│       │   ├── advisor-auth.repository.ts   # findAdvisorByEmail(email),
│       │   │                                # findAdvisorById(advisor_id),
│       │   │                                # createAdvisor(payload),
│       │   │                                # updateAdvisorLastLogin(advisor_id),
│       │   │                                # isEmailRegistered(email)
│       │   │
│       │   ├── school-admin-auth.repository.ts  # findSchoolAdminByEmail(email),
│       │   │                                # findSchoolAdminById(school_admin_id),
│       │   │                                # createSchoolAdmin(payload),
│       │   │                                # updateSchoolAdminLastLogin(school_admin_id),
│       │   │                                # isEmailRegistered(email)
│       │   │
│       │   ├── unilantern-admin-auth.repository.ts # findAdminByEmail(email),
│       │   │                                # findAdminById(admin_id),
│       │   │                                # createAdmin(payload),
│       │   │                                # updateAdminLastLogin(admin_id),
│       │   │                                # isEmailRegistered(email),
│       │   │                                # setMfaEnabled(admin_id, enabled)
│       │   │
│       │   ├── otp.repository.ts            # findOtpRecord(phone, purpose),
│       │   │                                # createOtpRecord(phone, purpose, hash, expires_at),
│       │   │                                # markOtpAsUsed(otp_id),
│       │   │                                # incrementOtpAttempts(otp_id),
│       │   │                                # deleteExpiredOtps() [nightly job]
│       │   │
│       │   └── invite-token.repository.ts   # findTokenByValue(token),
│       │                                    # validateToken(token),
│       │                                    # incrementTokenUsage(token_id),
│       │                                    # createToken(school_id, max_uses, expires_at)
│       │
│       ├── services/                        # ── BUSINESS LOGIC LAYER ──
│       │   │                                # Each service is ROLE-SPECIFIC
│       │   │
│       │   ├── student-auth.service.ts      # 1. OTP Flow (student only)
│       │   │                                #    sendOtp(phone)
│       │   │                                #    → generates 6-digit code
│       │   │                                #    → hashes with bcrypt
│       │   │                                #    → stores in otp_verifications
│       │   │                                #    → calls Twilio SMS (or mock)
│       │   │                                #    → returns expires_in_seconds
│       │   │                                #
│       │   │                                # 2. OTP Verification
│       │   │                                #    verifyOtp(phone, otp_code)
│       │   │                                #    → checks attempts limit (max 5)
│       │   │                                #    → compares code hash
│       │   │                                #    → marks as_used
│       │   │                                #    → returns phone_verify_token
│       │   │                                #
│       │   │                                # 3. Signup (invite-token required)
│       │   │                                #    signup(payload, phone_verify_token)
│       │   │                                #    → validates invite token
│       │   │                                #    → validates age_13_plus confirmation
│       │   │                                #    → validates parental_permission (if age 13–17)
│       │   │                                #    → checks phone not already registered
│       │   │                                #    → ATOMIC: creates student_auth + student_profile
│       │   │                                #    → creates default consents:
│       │   │                                #         age_13plus → granted
│       │   │                                #         parental_13_17 → granted (if applicable)
│       │   │                                #         college_data_share → granted (default)
│       │   │                                #    → enqueues initial profile scoreRecalc job
│       │   │                                #    → returns access_token + student info
│       │   │                                #
│       │   │                                # 4. Login (phone + OTP)
│       │   │                                #    login(phone, otp_code)
│       │   │                                #    → verifyOtp(phone, otp_code)
│       │   │                                #    → findStudentByPhone()
│       │   │                                #    → checks account is active
│       │   │                                #    → signs JWT access_token
│       │   │                                #    → updates last_login_at
│       │   │                                #    → returns access_token + student info
│       │   │                                #
│       │   │                                # 5. Token Refresh
│       │   │                                #    refreshAccessToken(refresh_token)
│       │   │                                #    → validates refresh_token signature + expiry
│       │   │                                #    → issues new access_token + new refresh_token
│       │   │                                #    → returns via HTTP-only cookie
│       │   │                                #
│       │   │                                # 6. Get Current User
│       │   │                                #    getMe(student_id)
│       │   │                                #    → fetches student + student_profile
│       │   │                                #    → returns StudentMeResponseDto (no DOB!)
│       │   │
│       │   ├── advisor-auth.service.ts      # Email + password login (no OTP)
│       │   │                                # login(email, password)
│       │   │                                #   → findAdvisorByEmail()
│       │   │                                #   → bcrypt.compare(password, password_hash)
│       │   │                                #   → checks is_active
│       │   │                                #   → signs JWT access_token
│       │   │                                #   → updates last_login_at
│       │   │                                #   → returns access_token + advisor info + school_name
│       │   │                                # getMe(advisor_id)
│       │   │                                #   → fetches advisor + school details
│       │   │                                #   → returns AdvisorMeResponseDto
│       │   │
│       │   ├── school-admin-auth.service.ts # Self-registration + login
│       │   │                                # register(school_data, admin_data)
│       │   │                                #   → ATOMIC transaction:
│       │   │                                #   → 1. createSchool(school_name, address, etc.)
│       │   │                                #   → 2. createSchoolAdmin(admin_email, password_hash, etc.)
│       │   │                                #   → FK school_admin → schools
│       │   │                                #   → returns access_token + school/admin info
│       │   │                                # login(email, password)
│       │   │                                #   → findSchoolAdminByEmail()
│       │   │                                #   → bcrypt.compare()
│       │   │                                #   → checks is_active
│       │   │                                #   → signs JWT + updates last_login_at
│       │   │                                #   → returns access_token + admin info + school_name
│       │   │                                # getMe(school_admin_id)
│       │   │                                #   → fetches admin + school details
│       │   │                                #   → returns SchoolAdminMeResponseDto
│       │   │
│       │   └── unilantern-admin-auth.service.ts # Internal admin login only
│       │                                   # login(email, password, mfa_code?)
│       │                                   #   → findAdminByEmail()
│       │                                   #   → bcrypt.compare()
│       │                                   #   → if mfa_enabled: validate mfa_code
│       │                                   #   → signs JWT access_token
│       │                                   #   → updates last_login_at
│       │                                   #   → returns access_token + admin info
│       │                                   # getMe(admin_id)
│       │                                   #   → fetches admin record
│       │                                   #   → returns UnilanternAdminMeResponseDto
│       │
│       ├── middleware/                      # ── EXPRESS MIDDLEWARE ──
│       │   ├── verify-jwt.ts                # Validates JWT signature + expiry
│       │   │                                # Extracts and attaches:
│       │   │                                #   req.user = { sub, role, school_id, iat, exp }
│       │   │                                #   req.requestId = UUID
│       │   │                                # Calls next(); 401 on invalid
│       │   │
│       │   ├── require-role.ts              # Enforces role gating: requireRole('student')
│       │   │                                # Compares req.user.role against allowed roles
│       │   │                                # 403 Forbidden if role mismatch
│       │   │                                # LOGS FAILED ATTEMPT TO AUDIT_LOGS
│       │   │
│       │   ├── require-school-scope.ts      # RBAC: school-scoped access for advisors/school_admins
│       │   │                                # Compares req.user.school_id with:
│       │   │                                #   • query param school_id
│       │   │                                #   • route param school_id
│       │   │                                # 403 if mismatch (CROSS-SCHOOL ACCESS ATTEMPT!)
│       │   │                                # LOGS ATTEMPTED VIOLATION TO AUDIT_LOGS
│       │   │
│       │   ├── rate-limiter.ts              # Redis-backed throttling
│       │   │                                # /auth/otp/send → 5/hour per phone
│       │   │                                # /auth/otp/verify → 5/hour per phone
│       │   │                                # /auth/login → 10/hour per email/phone
│       │   │                                # /auth/signup → 3/hour per IP
│       │   │                                # Returns 429 Too Many Requests + Retry-After
│       │   │
│       │   └── audit-logger.ts              # Immutable INSERT to audit_logs table
│       │                                    # Called AFTER controller succeeds
│       │                                    # Logs: action_type, actor_user_id, actor_role,
│       │                                    #       target_resource, metadata, ip_address, user_agent
│       │
│       ├── controllers/                     # ── HTTP REQUEST HANDLING ──
│       │   │                                # Controllers delegate ALL logic to services
│       │   │                                # They only:
│       │   │                                #   • extract + validate request body/params
│       │   │                                #   • call service
│       │   │                                #   • map service result → response DTO
│       │   │                                #   • return 200/201 with response
│       │   │
│       │   ├── student-auth.controller.ts   # POST /auth/student/otp/send
│       │   │                                # POST /auth/student/otp/verify
│       │   │                                # POST /auth/student/signup
│       │   │                                # POST /auth/student/login
│       │   │                                # POST /auth/student/token/refresh
│       │   │                                # GET /auth/student/me (with verify-jwt middleware)
│       │   │                                # DELETE /auth/student/logout
│       │   │
│       │   ├── advisor-auth.controller.ts   # POST /auth/advisor/login
│       │   │                                # GET /auth/advisor/me
│       │   │                                # DELETE /auth/advisor/logout
│       │   │
│       │   ├── school-admin-auth.controller.ts # POST /auth/school-admin/register
│       │   │                                # POST /auth/school-admin/login
│       │   │                                # GET /auth/school-admin/me
│       │   │                                # DELETE /auth/school-admin/logout
│       │   │
│       │   └── unilantern-admin-auth.controller.ts # POST /auth/admin/login
│       │                                    # GET /auth/admin/me
│       │                                    # DELETE /auth/admin/logout
│       │
│       ├── routes/                          # ── EXPRESS ROUTE DEFINITIONS ──
│       │   │
│       │   ├── student-auth.routes.ts       # router = express.Router()
│       │   │                                # POST /student/otp/send → studentAuthCtrl.sendOtp
│       │   │                                # POST /student/otp/verify → studentAuthCtrl.verifyOtp
│       │   │                                # POST /student/signup → studentAuthCtrl.signup
│       │   │                                # POST /student/login → studentAuthCtrl.login
│       │   │                                # POST /student/token/refresh → studentAuthCtrl.refresh
│       │   │                                # GET /student/me [verify-jwt] → studentAuthCtrl.getMe
│       │   │                                # DELETE /student/logout [verify-jwt] → logout
│       │   │
│       │   ├── advisor-auth.routes.ts       # router = express.Router()
│       │   │                                # POST /advisor/login → advisorAuthCtrl.login
│       │   │                                # GET /advisor/me [verify-jwt] → advisorAuthCtrl.getMe
│       │   │                                # DELETE /advisor/logout [verify-jwt] → logout
│       │   │
│       │   ├── school-admin-auth.routes.ts  # router = express.Router()
│       │   │                                # POST /school-admin/register → schoolAdminCtrl.register
│       │   │                                # POST /school-admin/login → schoolAdminCtrl.login
│       │   │                                # GET /school-admin/me [verify-jwt] → schoolAdminCtrl.getMe
│       │   │                                # DELETE /school-admin/logout [verify-jwt] → logout
│       │   │
│       │   ├── unilantern-admin-auth.routes.ts # router = express.Router()
│       │   │                                # POST /admin/login → adminCtrl.login
│       │   │                                # GET /admin/me [verify-jwt] → adminCtrl.getMe
│       │   │                                # DELETE /admin/logout [verify-jwt] → logout
│       │   │
│       │   └── index.ts                     # Combines all 4 routers:
│       │                                    #   router.use('/auth/student', studentRoutes)
│       │                                    #   router.use('/auth/advisor', advisorRoutes)
│       │                                    #   router.use('/auth/school-admin', schoolAdminRoutes)
│       │                                    #   router.use('/auth/admin', adminRoutes)
│       │                                    #   export default router
│       │
│       ├── utils/                           # ── UTILITY FUNCTIONS ──
│       │   ├── otp.utils.ts                 # generateOtpCode() → 6 digits
│       │   │                                # hashOtpCode(code) → bcrypt
│       │   │                                # verifyOtpCode(code, hash) → bcrypt.compare
│       │   │
│       │   ├── password.utils.ts            # hashPassword(password) → bcrypt (cost >= 12)
│       │   │                                # verifyPassword(password, hash) → bcrypt.compare
│       │   │
│       │   ├── jwt.utils.ts                 # signAccessToken(payload) → JWT (15m TTL)
│       │   │                                # signRefreshToken(payload) → JWT (7d TTL)
│       │   │                                # verifyAccessToken(token) → payload | throws
│       │   │                                # verifyRefreshToken(token) → payload | throws
│       │   │
│       │   ├── phone.utils.ts               # validateE164(phone) → boolean
│       │   │                                # parseE164(phone) → { country, number }
│       │   │                                # maskPhone(phone) → '+1•••••2671'
│       │   │
│       │   ├── encryption.utils.ts          # encryptDob(dateOfBirth) → encrypted string
│       │   │                                # decryptDob(encrypted) → Date
│       │   │                                # (date_of_birth stored encrypted; NEVER in API)
│       │   │
│       │   ├── age.utils.ts                 # calculateAge(dateOfBirth) → number
│       │   │                                # isMinor(dateOfBirth) → boolean (age < 18)
│       │   │                                # requiresParentalConsent(age) → boolean (13–17)
│       │   │
│       │   └── token.utils.ts               # generateInviteToken() → UUID string
│       │                                    # generatePhoneVerifyToken() → short-lived JWT
│       │
│       ├── errors/                          # ── CUSTOM ERROR CLASSES ──
│       │   ├── auth-error.ts                # class AuthError extends AppError
│       │   │                                # { code, message, statusCode }
│       │   ├── otp-error.ts                 # class OtpError extends AuthError
│       │   │                                # OTP_INVALID, OTP_EXPIRED, OTP_TOO_MANY_ATTEMPTS
│       │   ├── invite-error.ts              # class InviteError extends AuthError
│       │   │                                # INVITE_INVALID, INVITE_EXPIRED, INVITE_USED_UP
│       │   └── consent-error.ts             # class ConsentError extends AuthError
│       │                                    # AGE_GATE_FAILED, PARENTAL_CONSENT_REQUIRED
│       │
│       ├── events/                          # ── AUTH EVENT HOOKS (optional) ──
│       │   ├── on-student-signup.ts         # Emitted: student_created
│       │   │                                # Triggers: create_student_profile, send_welcome_email
│       │   │
│       │   ├── on-advisor-login.ts          # Emitted: advisor_login
│       │   │                                # Triggers: audit_log, update_last_login
│       │   │
│       │   └── on-admin-login.ts            # Emitted: admin_login
│       │                                    # Triggers: audit_log, check_mfa
│       │
│       └── index.ts                         # Re-exports:
│                                            # - All DTOs
│                                            # - All services
│                                            # - Auth routes
│                                            # for clean imports in app.ts
│
├── shared/
│   ├── middleware/
│   │   ├── verify-jwt.ts             [USED IN AUTH]
│   │   ├── require-role.ts            [USED IN AUTH]
│   │   ├── require-school-scope.ts    [USED IN AUTH]
│   │   ├── rate-limiter.ts            [USED IN AUTH]
│   │   └── audit-logger.ts            [USED IN AUTH]
│   │
│   ├── errors/
│   │   └── app-error.ts               [BASE CLASS for all auth errors]
│   │
│   ├── response/
│   │   ├── success.ts                 [success(data, status)]
│   │   ├── error.ts                   [error(code, message, status)]
│   │   ├── error-codes.ts             [ENUM of all error codes]
│   │   └── http-status.ts
│   │
│   └── utils/
│       ├── logger.ts                  [Structured logging]
│       └── request-id.ts              [UUID per request]

db/
├── schema/
│   ├── schools.ts                     [Drizzle table definition]
│   ├── student-auth.ts                [Drizzle table definition]
│   ├── advisor-auth.ts                [Drizzle table definition]
│   ├── school-admin-auth.ts           [Drizzle table definition]
│   ├── unilantern-admin-auth.ts       [Drizzle table definition]
│   ├── otp-verifications.ts           [Drizzle table definition]
│   └── invite-tokens.ts               [Drizzle table definition]
│
├── migrations/
│   └── [auto-generated from Drizzle]
│
└── seeds/
    └── seed-admin.ts                  [Create initial unilantern_admin account]
```

---

## KEY FLOWS

### 1. STUDENT SIGNUP (Phone + OTP)

```
POST /auth/student/otp/send
  → StudentAuthController.sendOtp(phone_number)
    → StudentAuthService.sendOtp(phone)
      → rate-limiter: check 5/hour limit per phone ✓
      → StudentAuthRepository.isPhoneRegistered(phone)
      → OtpUtils.generateOtpCode() → "123456"
      → OtpUtils.hashOtpCode("123456") → bcrypt hash
      → OtpRepository.createOtpRecord(phone, 'signup', hash, expires_at)
      → TwilioService.sendSms(phone, "Your OTP is: 123456")
      → return { expires_in_seconds: 600 }
    → StudentAuthController maps → StudentSendOtpResponseDto
    → AuditLogger: logs 'otp_sent' action
    → return 200 { expires_in_seconds, phone_masked }

POST /auth/student/otp/verify
  → StudentAuthController.verifyOtp(phone, otp_code)
    → rate-limiter: check 5/hour limit per phone ✓
    → StudentAuthService.verifyOtp(phone, otp_code)
      → OtpRepository.findOtpRecord(phone, 'signup')
      → OtpUtils.verifyOtpCode(otp_code, hash) → boolean
      → if false: increment attempts; throw OtpError INVALID
      → if attempts > 5: throw OtpError TOO_MANY_ATTEMPTS
      → if expires_at < now: throw OtpError EXPIRED
      → OtpRepository.markOtpAsUsed(otp_id)
      → return phone_verify_token (short-lived JWT)
    → AuditLogger: logs 'otp_verified' action
    → return 200 { phone_verify_token }

POST /auth/student/signup
  → StudentAuthController.signup(payload, phone_verify_token)
    → rate-limiter: check 3/hour limit per IP ✓
    → StudentAuthService.signup(payload, phone_verify_token)
      → verify phone_verify_token signature ✓
      → validate age_13_plus confirmation = true ✓
      → if age 13–17: validate parental_permission = true ✓
      → StudentAuthRepository.isPhoneRegistered(phone) = false ✓
      → validate invite_token exists + is_active + times_used < max_uses ✓
      → ATOMIC TRANSACTION:
        → 1. StudentAuthRepository.createStudent({
              phone_number, full_name, phone_verified: true,
              account_status: 'independent', is_active: true
            })
              → returns student_id
        → 2. StudentProfileRepository.createProfile({
              student_id, graduation_year, high_school_name,
              state_of_residence, grade, onboarding_step: 1,
              profile_complete: false
            })
        → 3. ConsentRepository.createDefaultConsents(student_id, {
              age_13plus: granted,
              parental_13_17: granted (if applicable),
              college_data_share: granted
            })
        → 4. InviteTokenRepository.incrementTokenUsage(token_id)
      → STORE encrypted date_of_birth in student_profiles (NEVER in API response)
      → JwtUtils.signAccessToken({ sub: student_id, role: 'student' })
        → returns access_token
      → enqueue ScoreRecalcJob(student_id) [async — doesn't block]
      → return StudentSignupResponseDto
    → AuditLogger: logs 'student_signup' action with metadata
    → return 201 { access_token, student_id, account_status, school_id?, full_name }

POST /auth/student/login
  → StudentAuthController.login(phone, otp_code)
    → rate-limiter: check 10/hour limit per phone ✓
    → StudentAuthService.verifyOtp(phone, otp_code) [reuses otp flow]
    → StudentAuthService.login(phone)
      → StudentAuthRepository.findStudentByPhone(phone)
      → validate is_active = true ✓
      → StudentAuthRepository.updateStudentLastLogin(student_id)
      → JwtUtils.signAccessToken({ sub: student_id, role: 'student' })
      → return StudentLoginResponseDto
    → AuditLogger: logs 'student_login' action
    → return 200 { access_token, student_id, account_status, school_id? }
```

### 2. ADVISOR LOGIN (Email + Password)

```
POST /auth/advisor/login
  → AdvisorAuthController.login(email, password)
    → rate-limiter: check 10/hour limit per email ✓
    → AdvisorAuthService.login(email, password)
      → AdvisorAuthRepository.findAdvisorByEmail(email)
      → if not found: throw AuthError 'EMAIL_NOT_FOUND'
      → PasswordUtils.verifyPassword(password, password_hash)
      → if false: throw AuthError 'PASSWORD_INCORRECT'
      → validate is_active = true ✓
      → AdvisorAuthRepository.updateAdvisorLastLogin(advisor_id)
      → fetch School details
      → JwtUtils.signAccessToken({ sub: advisor_id, role: 'advisor', school_id })
      → return AdvisorLoginResponseDto
    → AuditLogger: logs 'advisor_login' action
    → return 200 { access_token, advisor_id, full_name, school_id, school_name }
```

### 3. SCHOOL_ADMIN SELF-REGISTRATION

```
POST /auth/school-admin/register
  → SchoolAdminController.register(school_data, admin_data)
    → rate-limiter: check 3/hour limit per IP ✓
    → SchoolAdminService.register(school_data, admin_data)
      → validate school_type IN ['public', 'private', 'charter'] ✓
      → check email_domain NOT UNIQUE ✓ (can have multiple admins at same school)
      → check admin_email NOT registered in advisor_auth or admin_auth ✓
      → ATOMIC TRANSACTION:
        → 1. SchoolRepository.createSchool({
              school_name, address, state, school_type,
              email_domain, school_status: 'trial'
            })
              → returns school_id
        → 2. SchoolAdminRepository.createSchoolAdmin({
              school_id, email: admin_email,
              password_hash: PasswordUtils.hashPassword(password),
              full_name: admin_full_name,
              is_active: true
            })
              → returns school_admin_id
      → JwtUtils.signAccessToken({ sub: school_admin_id, role: 'school_admin', school_id })
      → return SchoolAdminSignupResponseDto
    → AuditLogger: logs 'school_admin_register' action with school_id
    → return 201 { access_token, school_admin_id, school_id, school_name }
```

### 4. UNILANTERN_ADMIN LOGIN (Email + Password + Optional MFA)

```
POST /auth/admin/login
  → UnilanternAdminController.login(email, password, mfa_code?)
    → rate-limiter: check 10/hour limit per IP ✓
    → UnilanternAdminService.login(email, password, mfa_code)
      → UnilanternAdminRepository.findAdminByEmail(email)
      → if not found: throw AuthError 'EMAIL_NOT_FOUND'
      → PasswordUtils.verifyPassword(password, password_hash)
      → if false: throw AuthError 'PASSWORD_INCORRECT'
      → if mfa_enabled && !mfa_code: throw AuthError 'MFA_REQUIRED'
      → if mfa_enabled && mfa_code: validate MFA code [integration]
      → validate is_active = true ✓
      → UnilanternAdminRepository.updateAdminLastLogin(admin_id)
      → JwtUtils.signAccessToken({ sub: admin_id, role: 'unilantern_admin' })
      → return UnilanternAdminLoginResponseDto
    → AuditLogger: logs 'admin_login' action
    → return 200 { access_token, admin_id, full_name, email, mfa_enabled }
```

---

## RATE LIMITS

| Endpoint | Limit | Per |
|---|---|---|
| `/auth/student/otp/send` | 5/hour | phone_number |
| `/auth/student/otp/verify` | 5/hour | phone_number |
| `/auth/student/login` | 10/hour | phone_number |
| `/auth/student/signup` | 3/hour | IP address |
| `/auth/advisor/login` | 10/hour | email |
| `/auth/school-admin/register` | 3/hour | IP address |
| `/auth/school-admin/login` | 10/hour | email |
| `/auth/admin/login` | 10/hour | IP address |

---

## ERROR CODES (ENUM)

```typescript
enum AuthErrorCode {
  // OTP errors
  OTP_INVALID = 'OTP_INVALID',
  OTP_EXPIRED = 'OTP_EXPIRED',
  OTP_TOO_MANY_ATTEMPTS = 'OTP_TOO_MANY_ATTEMPTS',
  
  // Student signup errors
  PHONE_ALREADY_REGISTERED = 'PHONE_ALREADY_REGISTERED',
  AGE_CONFIRMATION_REQUIRED = 'AGE_CONFIRMATION_REQUIRED',
  AGE_GATE_FAILED = 'AGE_GATE_FAILED',  // < 13 years old
  PARENTAL_CONSENT_REQUIRED = 'PARENTAL_CONSENT_REQUIRED',
  
  // Invite token errors
  INVITE_TOKEN_INVALID = 'INVITE_TOKEN_INVALID',
  INVITE_TOKEN_EXPIRED = 'INVITE_TOKEN_EXPIRED',
  INVITE_TOKEN_USED_UP = 'INVITE_TOKEN_USED_UP',
  
  // Email/password errors
  EMAIL_NOT_FOUND = 'EMAIL_NOT_FOUND',
  EMAIL_ALREADY_REGISTERED = 'EMAIL_ALREADY_REGISTERED',
  PASSWORD_INCORRECT = 'PASSWORD_INCORRECT',
  PASSWORD_WEAK = 'PASSWORD_WEAK',
  
  // Account status errors
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  
  // JWT/Token errors
  JWT_INVALID = 'JWT_INVALID',
  JWT_EXPIRED = 'JWT_EXPIRED',
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',
  
  // MFA errors
  MFA_REQUIRED = 'MFA_REQUIRED',
  MFA_CODE_INVALID = 'MFA_CODE_INVALID',
  
  // Rate limiting
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // School/admin errors
  SCHOOL_NOT_FOUND = 'SCHOOL_NOT_FOUND',
  SCHOOL_ADMIN_NOT_FOUND = 'SCHOOL_ADMIN_NOT_FOUND',
  ADVISOR_NOT_FOUND = 'ADVISOR_NOT_FOUND',
}
```

---

## SECURITY GUARDRAILS

1. **OTP Hashing** — bcrypt cost ≥ 10 (not plain text)
2. **Password Hashing** — bcrypt cost ≥ 12 or argon2id
3. **JWT Signing** — RS256 (RSA) or HS256 (HMAC) with strong secret
4. **Refresh Token** — HTTP-only Secure cookie; never in localStorage
5. **Access Token** — In-memory on frontend; 15-minute TTL
6. **DOB Encryption** — AES-256-GCM; decrypted only for age gate logic
7. **Phone Verification** — SMS OTP; rate-limited to 5 attempts
8. **Cross-School Access** — Checked in `require-school-scope` middleware; logged
9. **Audit Logging** — All auth actions logged; immutable INSERT-only table
10. **HTTPS Only** — Enforced in production; cookies must be Secure + SameSite

---

## TESTING STRATEGY

### Unit Tests
- `student-auth.service.test.ts` — OTP flow, signup atomic transaction, age gate
- `advisor-auth.service.test.ts` — Email/password login, bcrypt verify
- `school-admin-auth.service.test.ts` — Self-registration, school creation
- `jwt.utils.test.ts` — Token signing/verification, expiry
- `otp.utils.test.ts` — OTP generation, hash verify

### Integration Tests
- `student-signup.integration.test.ts` — Full flow: OTP → verify → signup
- `student-login.integration.test.ts` — Phone + OTP login
- `advisor-login.integration.test.ts` — Email + password login
- `school-admin-register.integration.test.ts` — Self-registration flow
- `rate-limiter.integration.test.ts` — Throttling enforcement
- `rbac.integration.test.ts` — Cross-role access attempt (403)

### E2E Tests
- Student signup journey (no Postman — actual test client)
- Advisor dashboard login
- School admin self-registration

---

## IMPLEMENTATION CHECKLIST

- [x] Create 4 separate auth tables (student_auth, advisor_auth, etc.)
- [x] Create OTP + invite_tokens tables
- [x] Drizzle schema definitions + migrations
- [x] DTO structure (4 roles × 2 DTOs each = 8 request + 8 response)
- [x] Zod schemas with role-specific validation
- [x] Repositories for each role + OTP + invites
- [x] Services for each role (business logic)
- [x] Controllers for each role (HTTP handling)
- [x] Routes for each role (Express router)
- [x] Middleware: verify-jwt, require-role, require-school-scope, rate-limiter
- [x] Error classes + error codes
- [x] Utilities: OTP, password, JWT, phone, encryption, age
- [x] Event hooks (optional; for future extensibility)
- [x] Audit logging (immutable INSERT-only)
- [x] Unit + integration tests
- [x] Rate limiting (Redis counters)
- [x] Security guardrails (bcrypt costs, HTTPS, HTTP-only cookies)
