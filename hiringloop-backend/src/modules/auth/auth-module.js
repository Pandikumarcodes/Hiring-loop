import { config } from '../../config/env.js';
import { getPrismaClient } from '../../database/client.js';
import { passwordHasher } from './password/argon2-password-hasher.js';
import {
  authSecretGenerator,
  authSecretHasher,
} from './secrets/auth-secret.js';
import { createAuthRepository } from './repositories/auth-repository.js';
import {
  createNonDeliveringEmailDelivery,
  createInMemoryEmailDelivery,
  createSendGridEmailDelivery,
} from './email/email-delivery.js';
import { createRegisterUser } from './use-cases/register-user.js';
import { createVerifyEmail } from './use-cases/verify-email.js';
import { createResendVerification } from './use-cases/resend-verification.js';
import { createLoginUser } from './use-cases/login-user.js';
import { createSessionCookieSerializer } from './http/session-cookie.js';
import { createSessionCookieClearer } from './http/session-cookie.js';
import { createAuthenticateSession } from '../../middleware/authenticate-session.js';
import { createAuthRouter } from './routes/auth-routes.js';
import {
  createLogoutSession,
  createRevokeAllSessions,
} from './use-cases/logout-session.js';
import { createForgotPassword } from './use-cases/forgot-password.js';
import { createResetPassword } from './use-cases/reset-password.js';
import { createChangePassword } from './use-cases/change-password.js';
import { createHiringLoopSession } from './use-cases/create-hiringloop-session.js';
import { createLoginWithGoogle } from './use-cases/login-with-google.js';
import {
  createGoogleOidcProvider,
  serializeGoogleTransactionCookie,
  clearGoogleTransactionCookie,
} from './google/google-oidc-provider.js';
import { createCsrfToken, createRequireCsrf } from '../../middleware/csrf.js';
import { authRateLimiters } from '../../middleware/rate-limit.js';

const emailDelivery =
  config.environment === 'test'
    ? createInMemoryEmailDelivery()
    : config.sendGrid.enabled
      ? createSendGridEmailDelivery(config.sendGrid)
      : createNonDeliveringEmailDelivery();
const databaseUrl =
  config.environment === 'test' ? config.testDatabaseUrl : config.databaseUrl;
const repository = databaseUrl
  ? createAuthRepository(getPrismaClient())
  : {
      async findUserByEmail() {
        throw new Error('Authentication database is not configured');
      },
      async findLoginIdentityByEmail() {
        throw new Error('Authentication database is not configured');
      },
      async findProviderIdentity() {
        throw new Error('Authentication database is not configured');
      },
      async createGoogleIdentity() {
        throw new Error('Authentication database is not configured');
      },
      async findPasswordResetIdentityByEmail() {
        throw new Error('Authentication database is not configured');
      },
      async replacePasswordResetToken() {
        throw new Error('Authentication database is not configured');
      },
      async findPasswordResetTokenByHash() {
        throw new Error('Authentication database is not configured');
      },
      async consumePasswordResetAndChangePassword() {
        throw new Error('Authentication database is not configured');
      },
      async findPasswordCredentialByUserId() {
        throw new Error('Authentication database is not configured');
      },
      async changePasswordAndRotateSession() {
        throw new Error('Authentication database is not configured');
      },
      async createSession() {
        throw new Error('Authentication database is not configured');
      },
      async findSessionIdentityByHash() {
        throw new Error('Authentication database is not configured');
      },
      async revokeSessionById() {
        throw new Error('Authentication database is not configured');
      },
      async revokeAllSessionsForUser() {
        throw new Error('Authentication database is not configured');
      },
    };

export const authEmailDelivery = emailDelivery;
const createSession = createHiringLoopSession({
  authRepository: repository,
  authSecretGenerator,
  authSecretHasher,
});
const googleOidcProvider = config.googleOidc.enabled
  ? createGoogleOidcProvider(config.googleOidc)
  : null;
export const authRouter = createAuthRouter({
  registerUser: createRegisterUser({
    authRepository: repository,
    passwordHasher,
    authSecretGenerator,
    authSecretHasher,
    emailDelivery,
  }),
  verifyEmail: createVerifyEmail({
    authRepository: repository,
    authSecretHasher,
  }),
  resendVerification: createResendVerification({
    authRepository: repository,
    authSecretGenerator,
    authSecretHasher,
    emailDelivery,
  }),
  forgotPassword: createForgotPassword({
    authRepository: repository,
    authSecretGenerator,
    authSecretHasher,
    emailDelivery,
    frontendOrigin: config.sendGrid.frontendOrigin,
  }),
  resetPassword: createResetPassword({
    authRepository: repository,
    passwordHasher,
    authSecretHasher,
  }),
  changePassword: createChangePassword({
    authRepository: repository,
    passwordHasher,
    authSecretGenerator,
    authSecretHasher,
  }),
  loginUser: createLoginUser({
    authRepository: repository,
    passwordHasher,
    authSecretGenerator,
    authSecretHasher,
  }),
  googleOidcProvider,
  loginWithGoogle: googleOidcProvider
    ? createLoginWithGoogle({ authRepository: repository, createSession })
    : null,
  googleRedirectUri: config.googleOidc.redirectUri,
  frontendOrigin: config.frontendOrigin ?? 'http://localhost:5173',
  secureCookies: config.authSession.cookieSecure,
  serializeGoogleTransactionCookie,
  clearGoogleTransactionCookie,
  requireCsrf: createRequireCsrf({ secret: config.authCsrfSecret }),
  createCsrfToken: ({ sessionId }) =>
    createCsrfToken({ secret: config.authCsrfSecret, sessionId }),
  logoutSession: createLogoutSession({ authRepository: repository }),
  revokeAllSessions: createRevokeAllSessions({ authRepository: repository }),
  serializeSessionCookie: createSessionCookieSerializer(config.authSession),
  clearSessionCookie: createSessionCookieClearer(config.authSession),
  authenticateSession: createAuthenticateSession({
    authRepository: repository,
    authSecretHasher,
    cookieName: config.authSession.cookieName,
    clearSessionCookie: createSessionCookieClearer(config.authSession),
  }),
  rateLimiters: authRateLimiters,
});
