import { createHash } from 'node:crypto';

import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

import { rateLimitError } from '../errors/application-error.js';
import { normalizeEmail } from '../modules/auth/domain/normalize-email.js';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export const AUTH_RATE_LIMIT_POLICIES = Object.freeze({
  login: Object.freeze({ limit: 10, windowMs: 15 * MINUTE_MS }),
  register: Object.freeze({ limit: 5, windowMs: HOUR_MS }),
  verificationResend: Object.freeze({ limit: 5, windowMs: HOUR_MS }),
  forgotPassword: Object.freeze({ limit: 5, windowMs: HOUR_MS }),
  resetPassword: Object.freeze({ limit: 10, windowMs: 15 * MINUTE_MS }),
  googleStart: Object.freeze({ limit: 20, windowMs: 15 * MINUTE_MS }),
  googleCallback: Object.freeze({ limit: 30, windowMs: 15 * MINUTE_MS }),
  passwordChange: Object.freeze({ limit: 10, windowMs: 15 * MINUTE_MS }),
});

function emailFingerprint(request) {
  const email = request.body?.email;
  if (typeof email !== 'string') return null;

  try {
    return createHash('sha256')
      .update(normalizeEmail(email), 'utf8')
      .digest('hex');
  } catch {
    return null;
  }
}

function clientIp(request) {
  return ipKeyGenerator(
    request.ip ?? request.socket?.remoteAddress ?? 'unknown',
  );
}

function ipKey(request) {
  return `ip:${clientIp(request)}`;
}

function ipAndEmailKey(request) {
  const fingerprint = emailFingerprint(request);
  return fingerprint
    ? `ip:${clientIp(request)}:email:${fingerprint}`
    : ipKey(request);
}

function userAndIpKey(request) {
  const userId = request.auth?.userId;
  return userId ? `user:${userId}:${ipKey(request)}` : ipKey(request);
}

function createLimiter(name, policy, keyGenerator, overrides = {}) {
  return rateLimit({
    ...policy,
    ...overrides,
    identifier: `auth-${name}`,
    keyGenerator,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    statusCode: 429,
    message: 'Too many requests. Please try again later.',
    handler: (_request, _response, next) => next(rateLimitError()),
  });
}

/**
 * Build isolated named infrastructure limiters. The default store is the
 * express-rate-limit MemoryStore; a distributed Store can replace it later.
 * `overrides` exists for isolated tests and never changes production policy.
 */
export function createAuthRateLimiters({ policyOverrides = {} } = {}) {
  const policy = (name) => ({
    ...AUTH_RATE_LIMIT_POLICIES[name],
    ...(policyOverrides[name] ?? {}),
  });

  return {
    loginIpRateLimiter: createLimiter(
      'login-ip',
      policy('login'),
      ipKey,
      policyOverrides['login-ip'],
    ),
    loginIdentityRateLimiter: createLimiter(
      'login-identity',
      policy('login'),
      ipAndEmailKey,
      policyOverrides['login-identity'],
    ),
    registrationRateLimiter: createLimiter(
      'register',
      policy('register'),
      ipKey,
      policyOverrides.register,
    ),
    verificationResendRateLimiter: createLimiter(
      'verification-resend',
      policy('verificationResend'),
      ipAndEmailKey,
      policyOverrides.verificationResend,
    ),
    forgotPasswordRateLimiter: createLimiter(
      'forgot-password',
      policy('forgotPassword'),
      ipAndEmailKey,
      policyOverrides.forgotPassword,
    ),
    resetPasswordRateLimiter: createLimiter(
      'reset-password',
      policy('resetPassword'),
      ipKey,
      policyOverrides.resetPassword,
    ),
    googleStartRateLimiter: createLimiter(
      'google-start',
      policy('googleStart'),
      ipKey,
      policyOverrides.googleStart,
    ),
    googleCallbackRateLimiter: createLimiter(
      'google-callback',
      policy('googleCallback'),
      ipKey,
      policyOverrides.googleCallback,
    ),
    passwordChangeRateLimiter: createLimiter(
      'password-change',
      policy('passwordChange'),
      userAndIpKey,
      policyOverrides.passwordChange,
    ),
  };
}

export const authRateLimiters = createAuthRateLimiters();
