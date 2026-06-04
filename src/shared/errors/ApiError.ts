/**
 * ApiError — typed HTTP error class.
 * Static factories map 1:1 to every error code in the API spec.
 */
export class ApiError extends Error {
  statusCode: number;
  code: string;
  details: Record<string, unknown>;

  constructor(statusCode: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code       = code;
    this.details    = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  // ─── 400 Bad Request ────────────────────────────────────────────────────────
  static badRequest(code: string, message: string, details?: Record<string, unknown>) {
    return new ApiError(400, code, message, details);
  }
  static validationError(details?: Record<string, unknown>) {
    return new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed.', details);
  }
  static passwordTooWeak() {
    return new ApiError(400, 'PASSWORD_TOO_WEAK', 'Password does not meet complexity requirements.');
  }
  static passwordMismatch() {
    return new ApiError(400, 'PASSWORD_MISMATCH', 'Passwords do not match.');
  }
  static emailNotVerified() {
    return new ApiError(400, 'EMAIL_NOT_VERIFIED', 'Email token not yet validated — complete Step 2 first.');
  }
  static emailDomainMismatch() {
    return new ApiError(400, 'EMAIL_DOMAIN_MISMATCH', 'Admin email domain does not match the school email domain.');
  }

  // ─── 401 Unauthorized ───────────────────────────────────────────────────────
  static unauthorized(code: string, message: string) {
    return new ApiError(401, code, message);
  }
  static tokenInvalid() {
    return new ApiError(401, 'TOKEN_INVALID', 'Access token is missing, expired, or malformed.');
  }
  static invalidCredentials() {
    return new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }
  static currentPasswordIncorrect() {
    return new ApiError(401, 'CURRENT_PASSWORD_INCORRECT', 'Current password is incorrect.');
  }
  static refreshTokenInvalid() {
    return new ApiError(401, 'REFRESH_TOKEN_INVALID', 'Refresh token is missing, expired, or revoked.');
  }

  // ─── 403 Forbidden ──────────────────────────────────────────────────────────
  static forbidden(code = 'FORBIDDEN', message = 'Access denied.') {
    return new ApiError(403, code, message);
  }
  static accountInactive() {
    return new ApiError(403, 'ACCOUNT_INACTIVE', 'Admin account is deactivated or registration is not complete.');
  }

  // ─── 404 Not Found ──────────────────────────────────────────────────────────
  static notFound(code: string, message: string) {
    return new ApiError(404, code, message);
  }
  static registrationNotFound() {
    return new ApiError(404, 'REGISTRATION_NOT_FOUND', 'Registration ID does not exist or has expired.');
  }
  static tokenNotFound() {
    return new ApiError(404, 'TOKEN_NOT_FOUND', 'Token does not exist.');
  }

  // ─── 409 Conflict ───────────────────────────────────────────────────────────
  static conflict(code: string, message: string) {
    return new ApiError(409, code, message);
  }
  static domainAlreadyRegistered() {
    return new ApiError(409, 'DOMAIN_ALREADY_REGISTERED', 'This email domain is already linked to an active school.');
  }
  static emailAlreadyRegistered() {
    return new ApiError(409, 'EMAIL_ALREADY_REGISTERED', 'Email is already linked to an active admin account.');
  }
  static registrationAlreadyComplete() {
    return new ApiError(409, 'REGISTRATION_ALREADY_COMPLETE', 'Admin account is already active.');
  }

  // ─── 410 Gone ───────────────────────────────────────────────────────────────
  static gone(code: string, message: string) {
    return new ApiError(410, code, message);
  }
  static tokenExpired() {
    return new ApiError(410, 'TOKEN_EXPIRED', 'Token has expired.');
  }
  static tokenAlreadyUsed() {
    return new ApiError(410, 'TOKEN_ALREADY_USED', 'Token was previously consumed.');
  }

  // ─── 429 Too Many Requests ──────────────────────────────────────────────────
  static rateLimitExceeded() {
    return new ApiError(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests. Please try again later.');
  }

  // ─── 500 Internal ───────────────────────────────────────────────────────────
  static internal(message = 'An unexpected server error occurred.') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}
