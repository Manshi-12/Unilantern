/**
 * AuthEmailService — email dispatch stubs for the auth module.
 *
 * Replace the bodies below with your actual transactional email provider
 * (e.g. SendGrid, Resend, AWS SES). The async retry queue (BullMQ) should
 * wrap these calls per §1.10 async failure policy.
 *
 * Both functions are fire-and-forget from the service layer — failures are
 * caught and handed off to the retry queue so the API always returns 200.
 */

const APP_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

/**
 * 1.2 — Send email verification link to the registering admin.
 * Link format: {FRONTEND_URL}/verify-email?token={token}
 */
export const sendVerificationEmail = async (to: string, token: string): Promise<void> => {
  const link = `${FRONTEND_URL}/verify-email?token=${token}`;
  // TODO: replace with actual mailer call
  // await mailer.sendTemplate('verify-email', to, { link, expires_in: '24 hours' });
  console.log(`[AuthEmail] Verification email → ${to} | link: ${link}`);
};

/**
 * 1.9 — Send password reset link to the admin's registered email.
 * Link format: {FRONTEND_URL}/reset-password?token={token}
 * ALWAYS returns void — never throws (enumeration protection).
 */
export const sendPasswordResetEmail = async (to: string, token: string): Promise<void> => {
  const link = `${FRONTEND_URL}/reset-password?token=${token}`;
  // TODO: replace with actual mailer call
  // await mailer.sendTemplate('reset-password', to, { link, expires_in: '1 hour' });
  console.log(`[AuthEmail] Password reset email → ${to} | link: ${link}`);
};






