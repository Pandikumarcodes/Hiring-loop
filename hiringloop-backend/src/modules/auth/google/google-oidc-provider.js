import * as oidc from 'openid-client';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const GOOGLE_OIDC_TRANSACTION_COOKIE = 'hiringloop_google_oidc';
export const GOOGLE_OIDC_TRANSACTION_TTL_SECONDS = 10 * 60;

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function encodeTransaction(transaction, secret) {
  const payload = Buffer.from(JSON.stringify(transaction)).toString(
    'base64url',
  );
  return `${payload}.${sign(payload, secret)}`;
}

function decodeTransaction(value, secret) {
  if (typeof value !== 'string') return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload, secret);
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return null;
  try {
    const transaction = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );
    return transaction.expiresAt > Date.now() ? transaction : null;
  } catch {
    return null;
  }
}

export function createGoogleOidcProvider({
  clientId,
  clientSecret,
  redirectUri,
  issuer = 'https://accounts.google.com',
  transactionSecret = clientSecret,
  discovery = oidc.discovery,
  authorizationUrl = oidc.buildAuthorizationUrl,
  authorizationCodeGrant = oidc.authorizationCodeGrant,
  generateState = oidc.randomState,
  generateNonce = oidc.randomNonce,
  generateCodeVerifier = oidc.randomPKCECodeVerifier,
  calculateCodeChallenge = oidc.calculatePKCECodeChallenge,
}) {
  let configurationPromise;
  const configuration = () => {
    configurationPromise ??= discovery(new URL(issuer), clientId, clientSecret);
    return configurationPromise;
  };

  return {
    transactionCookieName: GOOGLE_OIDC_TRANSACTION_COOKIE,
    transactionCookieMaxAge: GOOGLE_OIDC_TRANSACTION_TTL_SECONDS,
    async start() {
      const state = generateState();
      const nonce = generateNonce();
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await calculateCodeChallenge(codeVerifier);
      const transaction = {
        state,
        nonce,
        codeVerifier,
        expiresAt: Date.now() + GOOGLE_OIDC_TRANSACTION_TTL_SECONDS * 1000,
      };
      const url = authorizationUrl(await configuration(), {
        redirect_uri: redirectUri,
        scope: 'openid email',
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });
      return {
        url: url.href,
        cookieValue: encodeTransaction(transaction, transactionSecret),
      };
    },
    async callback({ callbackUrl, cookieValue }) {
      const transaction = decodeTransaction(cookieValue, transactionSecret);
      if (!transaction) throw new Error('OIDC transaction invalid');
      const url = new URL(callbackUrl);
      const tokens = await authorizationCodeGrant(await configuration(), url, {
        expectedState: transaction.state,
        expectedNonce: transaction.nonce,
        pkceCodeVerifier: transaction.codeVerifier,
        idTokenExpected: true,
      });
      const claims = tokens.claims();
      if (
        !claims ||
        typeof claims.sub !== 'string' ||
        typeof claims.email !== 'string' ||
        claims.email_verified !== true
      ) {
        throw new Error('OIDC identity claims invalid');
      }
      return {
        providerSubject: claims.sub,
        email: claims.email,
        emailVerified: true,
      };
    },
  };
}

export function serializeGoogleTransactionCookie(
  value,
  { secure = false } = {},
) {
  return `${GOOGLE_OIDC_TRANSACTION_COOKIE}=${value}; Max-Age=${GOOGLE_OIDC_TRANSACTION_TTL_SECONDS}; Path=/api/v1/auth/google; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

export function clearGoogleTransactionCookie({ secure = false } = {}) {
  return `${GOOGLE_OIDC_TRANSACTION_COOKIE}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/api/v1/auth/google; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}
