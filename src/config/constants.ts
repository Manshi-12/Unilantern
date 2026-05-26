// =====================================
// BCRYPT
// =====================================

export const BCRYPT_COST = 10;

// =====================================
// JWT
// =====================================

export const JWT_ACCESS_TTL = "15m";
export const JWT_REFRESH_TTL = "7d";

// =====================================
// COOKIES
// =====================================

export const COOKIE_ACCESS = "access_token";
export const COOKIE_REFRESH = "refresh_token";

// =====================================
// OTP
// =====================================

export const OTP_TTL_SECONDS = 300;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_CODE_LENGTH = 6;

/** Short-lived JWT returned from POST /otp/verify; used by /signup and /login. */
export const PHONE_VERIFY_TOKEN_TTL_SECONDS = 600;

export const OTP_PURPOSE = {
  SIGNUP: "signup",
  LOGIN: "login",
  PHONE_CHANGE: "phone_change",
} as const;

// =====================================
// REFRESH TOKEN TTL
// =====================================

export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// =====================================
// ROLES
// =====================================

export const ROLES = {
  ADVISOR: "advisor",
} as const;

export const STUDENT_ROLE = "student" as const;

// =====================================
// ACCOUNT STATUS
// =====================================

export const ACCOUNT_STATUS = {
  INDEPENDENT: "independent",
  SCHOOL_LINKED: "school_linked",
} as const;

// =====================================
// RATE LIMITS
// =====================================

export const RATE_LIMITS = {

  // --- Advisor module ---
  LOGIN:           { limit: 100, window: 3600 }, // NOTE: student module had limit: 10 — confirm correct value with team
  REGISTER:        { limit: 100, window: 3600 },
  CHANGE_PASSWORD: { limit: 100, window: 3600 },
  REFRESH_TOKEN:   { limit: 100, window: 3600 },

  // --- Student module ---
  OTP_SEND:        { limit: 5,   window: 3600 },
  OTP_VERIFY:      { limit: 10,  window: 3600 },
  SIGNUP:          { limit: 3,   window: 3600 },
  PROFILE_VIEW:    { limit: 120, window: 60 },
  PROFILE_UPDATE:  { limit: 30,  window: 60 },
  EC_LIST:         { limit: 120, window: 60 },
  EC_GET:          { limit: 120, window: 60 },
  EC_CREATE:       { limit: 30,  window: 60 },
  EC_UPDATE:       { limit: 30,  window: 60 },
  EC_DELETE:       { limit: 30,  window: 60 },
  EC_REORDER:      { limit: 30,  window: 60 },
  SERVICE_LIST:    { limit: 120, window: 60 },
  SERVICE_WRITE:   { limit: 30,  window: 60 },
  SCHOLARSHIPS_LIST:  { limit: 60,  window: 60 },
  SCHOLARSHIPS_GET:   { limit: 120, window: 60 },
  SCHOLARSHIPS_WRITE: { limit: 30,  window: 60 },

} as const;