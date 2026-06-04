const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

/**
 * Send advisor invite email.
 * Fire-and-forget — replace body with actual mailer (SendGrid, Resend, SES).
 */
export const sendAdvisorInviteEmail = async (
  to:        string,
  full_name: string,
  rawToken: string, 
): Promise<void> => {
  const link = `${FRONTEND_URL}/advisor/accept-invite?token=${rawToken}`; 
  // TODO: replace with actual mailer call
  // await mailer.sendTemplate('advisor-invite', to, { full_name, link });
  console.log(`[GovernanceEmail] Invite → ${to} | link: ${link}`);
};




