import { stringifySetCookie } from 'cookie';

export function createSessionCookieSerializer({
  cookieName,
  cookieSecure,
  cookieSameSite,
  ttlSeconds,
}) {
  return function serializeSessionCookie(rawSecret, expiresAt) {
    return stringifySetCookie({
      name: cookieName,
      value: rawSecret,
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      path: '/',
      maxAge: ttlSeconds,
      expires: expiresAt,
    });
  };
}

export function createSessionCookieClearer({
  cookieName,
  cookieSecure,
  cookieSameSite,
}) {
  return function clearSessionCookie() {
    return stringifySetCookie({
      name: cookieName,
      value: '',
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });
  };
}
