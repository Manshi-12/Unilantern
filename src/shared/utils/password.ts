import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, BCRYPT_ROUNDS);

export const comparePassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

/** Minimum 10 chars, at least one uppercase, one lowercase, one digit */
export const isPasswordStrong = (password: string): boolean =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/.test(password);
