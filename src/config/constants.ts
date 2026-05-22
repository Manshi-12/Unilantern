export const OTP_TTL_SECONDS = 300;
export const OTP_MAX_ATTEMPTS = 5;

/** Short-lived JWT returned from POST /otp/verify; used by /signup and /login. */
export const PHONE_VERIFY_TOKEN_TTL_SECONDS = 600;
export const OTP_CODE_LENGTH = 6;
export const BCRYPT_COST = 10;

export const JWT_ACCESS_TTL = "15m";

export const RATE_LIMITS = {
  OTP_SEND:      { limit: 5,   window: 3600 },
  OTP_VERIFY:    { limit: 10,  window: 3600 },
  SIGNUP:        { limit: 3,   window: 3600 },
  LOGIN:         { limit: 10,  window: 3600 },
  PROFILE_VIEW:  { limit: 120, window: 60 },
  PROFILE_UPDATE:{ limit: 30,  window: 60 },
  EC_LIST:       { limit: 120, window: 60 },
  EC_GET:        { limit: 120, window: 60 },
  EC_CREATE:     { limit: 30,  window: 60 },
  EC_UPDATE:     { limit: 30,  window: 60 },
  EC_DELETE:     { limit: 30,  window: 60 },
  EC_REORDER:    { limit: 30,  window: 60 },
  SERVICE_LIST:  { limit: 120, window: 60 },
  SERVICE_WRITE: { limit: 30,  window: 60 },
  SCHOLARSHIPS_LIST:  { limit: 60,  window: 60 },
  SCHOLARSHIPS_GET:   { limit: 120, window: 60 },
  SCHOLARSHIPS_WRITE: { limit: 30,  window: 60 },
} as const;

export const STUDENT_ROLE = "student" as const;
export const ACCOUNT_STATUS = {
  INDEPENDENT: "independent",
  SCHOOL_LINKED: "school_linked",
} as const;

export const OTP_PURPOSE = {
  SIGNUP: "signup",
  LOGIN: "login",
  PHONE_CHANGE: "phone_change",
} as const;

export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
