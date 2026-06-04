import crypto from 'crypto';

/** Returns a cryptographically random hex token of the specified byte length. */
export const generateToken = (bytes = 32): string =>
  crypto.randomBytes(bytes).toString('hex');

/** Masks an email address — first char + *** + @domain */
export const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const masked = local.length <= 1 ? local : `${local[0]}***`;
  return `${masked}@${domain}`;
};
