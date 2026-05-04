export const OTP_TTL_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_CODE_LENGTH = 6;
export const BCRYPT_COST = 10;

export const JWT_ACCESS_TTL = "15m";

export const RATE_LIMITS = {
  OTP_SEND:      { limit: 100, window: 3600 },
  OTP_VERIFY:    { limit: 100, window: 3600 },
  SIGNUP:        { limit: 100, window: 3600 },
  LOGIN:         { limit: 100, window: 3600 },
  PROFILE_VIEW:  { limit: 120, window: 60 },
  PROFILE_UPDATE:{ limit: 30,  window: 60 },
  EC_LIST:       { limit: 120, window: 60 },
  EC_GET:        { limit: 120, window: 60 },
  EC_CREATE:     { limit: 30,  window: 60 },
  EC_UPDATE:     { limit: 30,  window: 60 },
  EC_DELETE:     { limit: 30,  window: 60 },
  EC_REORDER:    { limit: 30,  window: 60 },
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
