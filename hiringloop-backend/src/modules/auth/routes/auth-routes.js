import express from 'express';

import { validateRequest } from '../../../middleware/validate-request.js';
import {
  registrationRequestSchema,
  resendVerificationRequestSchema,
  verifyEmailRequestSchema,
  loginRequestSchema,
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
  changePasswordRequestSchema,
} from '../schemas/auth-schemas.js';
import { createAuthController } from '../controllers/auth-controller.js';

export function createAuthRouter({
  registerUser,
  verifyEmail,
  resendVerification,
  loginUser,
  serializeSessionCookie,
  authenticateSession,
  clearSessionCookie,
  logoutSession,
  revokeAllSessions,
  forgotPassword,
  resetPassword,
  changePassword,
  googleOidcProvider,
  loginWithGoogle,
  googleRedirectUri,
  frontendOrigin,
  secureCookies,
  serializeGoogleTransactionCookie,
  clearGoogleTransactionCookie,
  requireCsrf,
  createCsrfToken,
  rateLimiters = {},
}) {
  const router = express.Router();
  const rateLimit = (middleware) =>
    middleware ?? ((_request, _response, next) => next());
  const controller = createAuthController({
    registerUser,
    verifyEmail,
    resendVerification,
    loginUser,
    serializeSessionCookie,
    clearSessionCookie,
    logoutSession,
    revokeAllSessions,
    getCurrentUser: (request) => request.auth.user,
    forgotPassword,
    resetPassword,
    changePassword,
    googleOidcProvider,
    loginWithGoogle,
    googleRedirectUri,
    frontendOrigin,
    secureCookies,
    serializeGoogleTransactionCookie,
    clearGoogleTransactionCookie,
    createCsrfToken,
  });

  if (googleOidcProvider) {
    router.get(
      '/google/start',
      rateLimit(rateLimiters.googleStartRateLimiter),
      controller.googleStart,
    );
    router.get(
      '/google/callback',
      rateLimit(rateLimiters.googleCallbackRateLimiter),
      controller.googleCallback,
    );
  }

  router.post(
    '/login',
    validateRequest({ body: loginRequestSchema }),
    rateLimit(rateLimiters.loginIpRateLimiter),
    rateLimit(rateLimiters.loginIdentityRateLimiter),
    controller.login,
  );
  if (forgotPassword) {
    router.post(
      '/password/forgot',
      validateRequest({ body: forgotPasswordRequestSchema }),
      rateLimit(rateLimiters.forgotPasswordRateLimiter),
      controller.forgotPassword,
    );
  }
  if (resetPassword) {
    router.post(
      '/password/reset',
      validateRequest({ body: resetPasswordRequestSchema }),
      rateLimit(rateLimiters.resetPasswordRateLimiter),
      controller.resetPassword,
    );
  }
  if (authenticateSession) {
    router.get('/me', authenticateSession, controller.me);
    router.get('/csrf', authenticateSession, controller.csrf);
    if (logoutSession) {
      router.post(
        '/logout',
        authenticateSession,
        requireCsrf ?? ((_request, _response, next) => next()),
        controller.logout,
      );
    }
    if (revokeAllSessions) {
      router.post(
        '/sessions/revoke-all',
        authenticateSession,
        requireCsrf ?? ((_request, _response, next) => next()),
        controller.revokeAllSessions,
      );
    }
    if (changePassword) {
      router.post(
        '/password/change',
        authenticateSession,
        requireCsrf ?? ((_request, _response, next) => next()),
        validateRequest({ body: changePasswordRequestSchema }),
        rateLimit(rateLimiters.passwordChangeRateLimiter),
        controller.changePassword,
      );
    }
  }
  router.post(
    '/verification/resend',
    validateRequest({ body: resendVerificationRequestSchema }),
    rateLimit(rateLimiters.verificationResendRateLimiter),
    controller.resendVerification,
  );
  router.post(
    '/register',
    validateRequest({ body: registrationRequestSchema }),
    rateLimit(rateLimiters.registrationRateLimiter),
    controller.register,
  );
  router.post(
    '/verify-email',
    validateRequest({ body: verifyEmailRequestSchema }),
    controller.verifyEmail,
  );

  return router;
}
