import { z } from 'zod';

// ─── 1.1 Register Step 1 ────────────────────────────────────────────────────
export const registerStep1Schema = z.object({
  school_name: z.string().min(1).max(300),
  address:     z.string().min(1).max(500),
  school_type: z.enum(['public', 'private', 'charter']),
  state:       z.string().min(1),
  city:        z.string().min(1).max(150),
  email_domain: z.string().min(1),
});

// ─── 1.2 Register Step 2 ────────────────────────────────────────────────────
export const registerStep2Schema = z.object({
  registration_id: z.number().int().positive(),
  full_name:       z.string().min(1).max(200),
  email:           z.string().email(),
  phone_number:    z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),
  job_title:       z.string().max(150).optional(),
});

// ─── 1.4 Register Step 3 ────────────────────────────────────────────────────
const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

  export const registerStep3Schema = z.object({
    registration_id:  z.number().int().positive(),
    full_name:        z.string().min(1).max(200),
    password:         passwordSchema,
    confirm_password: z.string(),
  }).refine(data => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

// ─── 1.5 Login ───────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// ─── 1.8 Change Password ─────────────────────────────────────────────────────
export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password:     passwordSchema,
  confirm_password: z.string(),
}).refine(data => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

// ─── 1.9 Forgot Password ─────────────────────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

// ─── 1.10 Reset Password ─────────────────────────────────────────────────────
export const resetPasswordSchema = z.object({
  reset_token:      z.string().min(1),
  new_password:     passwordSchema,
  confirm_password: z.string(),
}).refine(data => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});






