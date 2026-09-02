import { z } from 'zod';

export const registrationRequestSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(12).max(128),
});

export const resendVerificationRequestSchema = z.object({
  email: z.string().email().max(320),
});

export const verifyEmailRequestSchema = z.object({
  token: z.string().min(1).max(512),
});

export const loginRequestSchema = z.object({
  email: z.string().trim().email().max(320),
  // Login deliberately does not enforce registration's minimum. Existing
  // credentials must reach Argon2 verification before being classified.
  password: z.string().max(128),
});

export const forgotPasswordRequestSchema = z.object({
  email: z.string().trim().email().max(320),
});

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1).max(512),
  newPassword: z.string().min(12).max(128),
});

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
});
