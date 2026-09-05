import { z } from 'zod';

const environmentSchema = z
  .enum(['development', 'test', 'production'])
  .default('development');

const portSchema = z.preprocess(
  (value) => (value === undefined ? '3000' : value),
  z
    .string()
    .regex(/^\d+$/, 'must be a whole number')
    .transform(Number)
    .refine(
      (port) => port >= 1 && port <= 65535,
      'must be between 1 and 65535',
    ),
);

const optionalUrlSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().url().optional(),
);

const optionalSecretSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

const optionalEmailSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().email().optional(),
);

const emailProviderSchema = z.enum(['sendgrid', 'console']).default('sendgrid');

const frontendOriginSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z
    .string()
    .url()
    .refine(
      (value) => ['http:', 'https:'].includes(new URL(value).protocol),
      'must use http or https',
    )
    .optional(),
);

const environmentInputSchema = z.object({
  NODE_ENV: environmentSchema,
  PORT: portSchema,

  DATABASE_URL: optionalUrlSchema,
  TEST_DATABASE_URL: optionalUrlSchema,

  FRONTEND_ORIGIN: frontendOriginSchema,
  AUTH_CSRF_SECRET: optionalSecretSchema,

  EMAIL_PROVIDER: emailProviderSchema,
  SENDGRID_API_KEY: optionalSecretSchema,
  AUTH_EMAIL_FROM: optionalEmailSchema,

  GOOGLE_OIDC_CLIENT_ID: optionalSecretSchema,
  GOOGLE_OIDC_CLIENT_SECRET: optionalSecretSchema,
  GOOGLE_OIDC_REDIRECT_URI: optionalUrlSchema,
});

const parsedEnvironment = environmentInputSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,

  DATABASE_URL: process.env.DATABASE_URL,
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,

  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
  AUTH_CSRF_SECRET: process.env.AUTH_CSRF_SECRET,

  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  AUTH_EMAIL_FROM: process.env.AUTH_EMAIL_FROM,

  GOOGLE_OIDC_CLIENT_ID: process.env.GOOGLE_OIDC_CLIENT_ID,
  GOOGLE_OIDC_CLIENT_SECRET: process.env.GOOGLE_OIDC_CLIENT_SECRET,
  GOOGLE_OIDC_REDIRECT_URI: process.env.GOOGLE_OIDC_REDIRECT_URI,
});

if (!parsedEnvironment.success) {
  const details = parsedEnvironment.error.issues
    .map(
      (issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`,
    )
    .join('; ');

  throw new Error(`Configuration error: ${details}`);
}

const {
  NODE_ENV,
  EMAIL_PROVIDER,
  SENDGRID_API_KEY,
  AUTH_EMAIL_FROM,
  FRONTEND_ORIGIN,
  AUTH_CSRF_SECRET,
  GOOGLE_OIDC_CLIENT_ID,
  GOOGLE_OIDC_CLIENT_SECRET,
  GOOGLE_OIDC_REDIRECT_URI,
} = parsedEnvironment.data;

/*
|--------------------------------------------------------------------------
| SendGrid
|--------------------------------------------------------------------------
|
| FRONTEND_ORIGIN is shared application configuration and must NOT by itself
| enable SendGrid.
|
| SendGrid is considered configured only when one of its actual credentials
| is provided.
|
*/

const sendGridCredentials = [SENDGRID_API_KEY, AUTH_EMAIL_FROM];

const sendGridConfigured = sendGridCredentials.some(Boolean);

const sendGridValues = [SENDGRID_API_KEY, AUTH_EMAIL_FROM, FRONTEND_ORIGIN];

if (
  EMAIL_PROVIDER === 'sendgrid' &&
  (process.env.EMAIL_PROVIDER !== undefined ||
    NODE_ENV === 'production' ||
    sendGridConfigured) &&
  !sendGridValues.every(Boolean)
) {
  throw new Error(
    'Configuration error: SENDGRID_API_KEY, AUTH_EMAIL_FROM, and FRONTEND_ORIGIN are required for SendGrid email delivery',
  );
}

if (NODE_ENV === 'production' && EMAIL_PROVIDER === 'console') {
  throw new Error(
    'Configuration error: EMAIL_PROVIDER=console is not allowed in production',
  );
}

/*
|--------------------------------------------------------------------------
| Google OIDC
|--------------------------------------------------------------------------
*/

const googleValues = [
  GOOGLE_OIDC_CLIENT_ID,
  GOOGLE_OIDC_CLIENT_SECRET,
  GOOGLE_OIDC_REDIRECT_URI,
];

const googleConfigured = googleValues.some(Boolean);

if (googleConfigured && !googleValues.every(Boolean)) {
  throw new Error(
    'Configuration error: GOOGLE_OIDC_CLIENT_ID, GOOGLE_OIDC_CLIENT_SECRET, and GOOGLE_OIDC_REDIRECT_URI are required for Google authentication',
  );
}

/*
|--------------------------------------------------------------------------
| Production requirements
|--------------------------------------------------------------------------
*/

if (NODE_ENV === 'production' && !FRONTEND_ORIGIN) {
  throw new Error(
    'Configuration error: FRONTEND_ORIGIN is required in production',
  );
}

if (NODE_ENV !== 'test' && !FRONTEND_ORIGIN) {
  throw new Error(
    'Configuration error: FRONTEND_ORIGIN is required for browser authentication',
  );
}

if (NODE_ENV !== 'test' && !parsedEnvironment.data.DATABASE_URL) {
  throw new Error(
    'Configuration error: DATABASE_URL is required for the authentication server',
  );
}

if (
  NODE_ENV !== 'test' &&
  (!AUTH_CSRF_SECRET || AUTH_CSRF_SECRET.length < 32)
) {
  throw new Error(
    `Configuration error: AUTH_CSRF_SECRET must contain at least 32 characters in ${NODE_ENV}`,
  );
}

/*
|--------------------------------------------------------------------------
| Exported application configuration
|--------------------------------------------------------------------------
*/

export const config = Object.freeze({
  environment: NODE_ENV,

  email: Object.freeze({
    provider: EMAIL_PROVIDER,
    environment: NODE_ENV,
    frontendOrigin: FRONTEND_ORIGIN,
    sendGrid: Object.freeze({
      apiKey: SENDGRID_API_KEY,
      from: AUTH_EMAIL_FROM,
      frontendOrigin: FRONTEND_ORIGIN,
    }),
  }),

  port: parsedEnvironment.data.PORT,

  databaseUrl: parsedEnvironment.data.DATABASE_URL,

  testDatabaseUrl: parsedEnvironment.data.TEST_DATABASE_URL,

  frontendOrigin: FRONTEND_ORIGIN,

  authCsrfSecret:
    AUTH_CSRF_SECRET ??
    (NODE_ENV === 'test' ? 'test-only-auth-csrf-secret-change-me' : undefined),

  sendGrid: Object.freeze({
    enabled: sendGridValues.every(Boolean),
    apiKey: SENDGRID_API_KEY,
    from: AUTH_EMAIL_FROM,
    frontendOrigin: FRONTEND_ORIGIN,
  }),

  googleOidc: Object.freeze({
    enabled: googleValues.every(Boolean),
    clientId: GOOGLE_OIDC_CLIENT_ID,
    clientSecret: GOOGLE_OIDC_CLIENT_SECRET,
    redirectUri: GOOGLE_OIDC_REDIRECT_URI,
    issuer: 'https://accounts.google.com',
  }),

  authSession: Object.freeze({
    ttlSeconds: 7 * 24 * 60 * 60,

    cookieName:
      NODE_ENV === 'production'
        ? '__Host-hiringloop_session'
        : 'hiringloop_session',

    cookieSecure: NODE_ENV === 'production',

    cookieSameSite: NODE_ENV === 'production' ? 'none' : 'lax',
  }),
});
