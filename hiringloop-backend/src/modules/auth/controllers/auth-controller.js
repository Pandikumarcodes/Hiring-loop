import { parseCookie } from 'cookie';

export function createAuthController({
  registerUser,
  verifyEmail,
  resendVerification,
  loginUser,
  serializeSessionCookie,
  clearSessionCookie,
  logoutSession,
  revokeAllSessions,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword,
  googleOidcProvider,
  loginWithGoogle,
  googleRedirectUri,
  frontendOrigin,
  secureCookies = false,
  serializeGoogleTransactionCookie,
  clearGoogleTransactionCookie,
  createCsrfToken,
}) {
  const googleLoginRedirect = (reason) =>
    `${frontendOrigin}/login?oauth=${reason}`;
  return {
    googleStart: async (request, response, next) => {
      try {
        const result = await googleOidcProvider.start();
        response.append(
          'Set-Cookie',
          serializeGoogleTransactionCookie(result.cookieValue, {
            secure: secureCookies,
          }),
        );
        response.redirect(result.url);
      } catch (error) {
        next(error);
      }
    },
    googleCallback: async (request, response) => {
      try {
        const query = new URLSearchParams(request.query).toString();
        const identity = await googleOidcProvider.callback({
          callbackUrl: `${googleRedirectUri}${query ? `?${query}` : ''}`,
          cookieValue: parseCookie(request.headers.cookie ?? '')
            .hiringloop_google_oidc,
        });
        const result = await loginWithGoogle(identity);
        response.append(
          'Set-Cookie',
          clearGoogleTransactionCookie({ secure: secureCookies }),
        );
        response.append(
          'Set-Cookie',
          serializeSessionCookie(result.rawSessionSecret, result.expiresAt),
        );
        response.redirect(`${frontendOrigin}/app`);
      } catch (error) {
        response.append(
          'Set-Cookie',
          clearGoogleTransactionCookie({ secure: secureCookies }),
        );
        if (
          error?.code === 'CONFLICT' &&
          error?.details?.reason === 'ACCOUNT_LINKING_REQUIRED'
        ) {
          response.redirect(googleLoginRedirect('account-linking-required'));
          return;
        }
        response.redirect(googleLoginRedirect('authentication-failed'));
      }
    },
    register: async (request, response, next) => {
      try {
        const result = await registerUser(request.validated.body);
        response.status(202).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
    verifyEmail: async (request, response, next) => {
      try {
        const result = await verifyEmail(request.validated.body);
        response.status(200).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
    resendVerification: async (request, response, next) => {
      try {
        const result = await resendVerification(request.validated.body);
        response.status(202).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
    forgotPassword: async (request, response, next) => {
      try {
        const result = await forgotPassword(request.validated.body);
        response.status(202).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
    resetPassword: async (request, response, next) => {
      try {
        const result = await resetPassword(request.validated.body);
        response.status(200).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
    changePassword: async (request, response, next) => {
      try {
        const result = await changePassword({
          ...request.validated.body,
          userId: request.auth.userId,
        });
        response.append(
          'Set-Cookie',
          serializeSessionCookie(result.rawSessionSecret, result.expiresAt),
        );
        response.status(200).json({
          data: { user: getCurrentUser(request) },
        });
      } catch (error) {
        next(error);
      }
    },
    login: async (request, response, next) => {
      try {
        const result = await loginUser(request.validated.body);
        response.append(
          'Set-Cookie',
          serializeSessionCookie(result.rawSessionSecret, result.expiresAt),
        );
        response.status(200).json({ data: { user: result.user } });
      } catch (error) {
        next(error);
      }
    },
    me: (request, response) => {
      response.status(200).json({ data: { user: getCurrentUser(request) } });
    },
    csrf: (request, response) => {
      response.status(200).json({
        data: {
          csrfToken: createCsrfToken({ sessionId: request.auth.sessionId }),
        },
      });
    },
    logout: async (request, response, next) => {
      try {
        await logoutSession({
          sessionId: request.auth.sessionId,
          userId: request.auth.userId,
        });
        response.append('Set-Cookie', clearSessionCookie());
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
    revokeAllSessions: async (request, response, next) => {
      try {
        await revokeAllSessions({ userId: request.auth.userId });
        response.append('Set-Cookie', clearSessionCookie());
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  };
}
