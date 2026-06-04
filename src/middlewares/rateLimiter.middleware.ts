import rateLimit from 'express-rate-limit';

/**
 * Rate limiters — §1.7 Global Rate Limit Defaults
 * Uses express-rate-limit. In production, swap the default memory store
 * for a Redis store (e.g. rate-limit-redis) so limits are shared across
 * multiple server instances.
 */

// POST /auth/school-admin/login — 10 per email per hour
// Note: express-rate-limit keys by IP by default.
// For per-email limiting, use a custom keyGenerator reading req.body.email.
export const loginRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, //changed from 10 to 20 attempts for dev purpose
  keyGenerator: (req) => req.body?.email ?? req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Please try again later.',
        request_id: (req as any).requestId,
        details: {},
      },
    });
  },
});


// GET /school-admin/sections — 120 per admin per minute (§1.7)
export const dashboardSectionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many dashboard requests. Please slow down.',
        request_id: (req as any).requestId,
        details: {},
      },
    });
  },
});

// POST /auth/school-admin/register/* — 5 per IP per hour
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many registration attempts. Please try again later.',
        request_id: (req as any).requestId,
        details: {},
      },
    });
  },
});

// GET /auth/school-admin/verify-email — 20 per IP per hour
export const verifyEmailRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many verification attempts.',
        request_id: (req as any).requestId,
        details: {},
      },
    });
  },
});

// POST /auth/school-admin/refresh — 30 per admin per hour
export const refreshRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many token refresh attempts.',
        request_id: (req as any).requestId,
        details: {},
      },
    });
  },
});

// POST /auth/school-admin/change-password — 5 per admin per day
export const changePasswordRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many password change attempts. Try again tomorrow.',
        request_id: (req as any).requestId,
        details: {},
      },
    });
  },
});

// POST /auth/school-admin/forgot-password — 5 per email per hour
export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body?.email ?? req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many password reset requests.',
        request_id: (req as any).requestId,
        details: {},
      },
    });
  },
});

// POST /auth/school-admin/reset-password — 10 per IP per hour
export const resetPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many password reset attempts.',
        request_id: (req as any).requestId,
        details: {},
      },
    });
  },
});

// POST /auth/school-admin/logout — 10 per admin per minute
export const logoutRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many logout requests.',
        request_id: (req as any).requestId,
        details: {},
      },
    });
  },
});

export const calibrationRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many calibration requests. Please try again later.',
          request_id: (req as any).requestId,
          details: {},
        },
      });
    },
  });

  // /school-admin/governance — 60 per admin per hour
export const governanceRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many governance requests. Please try again later.',
        request_id: (req as any).requestId,
        details: {},
      },
    });
  },
});


export const studentsRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many requests, please try again later.',
});
// POST invite/resend — 10 per admin per hour
export const advisorInviteRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `advisor-invite:${(req as any).jwtPayload?.adminId ?? req.ip}`,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many invite requests. Please try again later.',
        request_id: (req as any).requestId,
        details: {},
      },
    });
  },
});
// /school-admin/notifications — 120 per admin per hour
export const notificationsRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code:       'RATE_LIMIT_EXCEEDED',
        message:    'Too many notification requests. Please try again later.',
        request_id: (req as any).requestId,
        details:    {},
      },
    });
  },
});

// /school-admin/profile + sessions — 60 per admin per hour
export const profileRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code:       'RATE_LIMIT_EXCEEDED',
        message:    'Too many profile requests. Please try again later.',
        request_id: (req as any).requestId,
        details:    {},
      },
    });
  },
});
// POST /v1/school-admin/feedback — 10 per hour per user
export const feedbackRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      10,
  keyGenerator: (req) => `feedback:${(req as any).jwtPayload?.adminId ?? req.ip}`,
  handler: (_req, res) => res.status(429).json({
    error: {
      code:    'RATE_LIMIT_EXCEEDED',
      message: 'Too many feedback submissions. Please try again later.',
      details: {},
    },
  }),
});
// POST /v1/school-admin/exports — 10 per school per hour
export const exportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `export:${(req as any).jwtPayload?.schoolId ?? req.ip}`,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code:       'RATE_LIMIT_EXCEEDED',
        message:    'Too many export requests. Please try again later.',
        request_id: (req as any).requestId,
        details:    {},
      },
    });
  },
});

// GET /v1/school-admin/exports/:exportId/download — 20 per school per hour
export const exportDownloadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => `export-download:${(req as any).jwtPayload?.schoolId ?? req.ip}`,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code:       'RATE_LIMIT_EXCEEDED',
        message:    'Too many download requests. Please try again later.',
        request_id: (req as any).requestId,
        details:    {},
      },
    });
  },
});
