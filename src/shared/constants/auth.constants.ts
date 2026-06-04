export const AUTH_CONSTANTS = {
  // Token lifetimes (seconds)
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN: 86_400, // 24 hours
  PASSWORD_RESET_TOKEN_EXPIRES_IN: 3_600,      // 1 hour

  // bcrypt
  BCRYPT_ROUNDS: 12,

  // JWT cookie lifetimes (ms)
  ACCESS_TOKEN_TTL_MS: 15 * 60 * 1_000,
  REFRESH_TOKEN_TTL_MS: 7 * 24 * 60 * 60 * 1_000,
  ACCESS_TOKEN_EXPIRES_IN_SECONDS: 900,

  // Registration
  REGISTRATION_STATUS: {
    PENDING_VERIFICATION: 'pending_verification',
    PENDING: 'pending',
    ACTIVE: 'active',
  },

  // Audit events
  AUDIT_EVENTS: {
    ADMIN_LOGIN: 'ADMIN_LOGIN',
    ADMIN_LOGOUT: 'ADMIN_LOGOUT',
    PASSWORD_CHANGED: 'PASSWORD_CHANGED',
    PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
    PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  },

  // Token types stored in email_verification_tokens
  TOKEN_TYPE: {
    EMAIL_VERIFICATION: 'email_verification',
    PASSWORD_RESET: 'password_reset',
  },
} as const;
