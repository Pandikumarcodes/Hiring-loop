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

const environmentInputSchema = z.object({
  NODE_ENV: environmentSchema,
  PORT: portSchema,
  DATABASE_URL: optionalUrlSchema,
  TEST_DATABASE_URL: optionalUrlSchema,
});

const parsedEnvironment = environmentInputSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
});

if (!parsedEnvironment.success) {
  const details = parsedEnvironment.error.issues
    .map(
      (issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`,
    )
    .join('; ');

  throw new Error(`Configuration error: ${details}`);
}

export const config = Object.freeze({
  environment: parsedEnvironment.data.NODE_ENV,
  port: parsedEnvironment.data.PORT,
  databaseUrl: parsedEnvironment.data.DATABASE_URL,
  testDatabaseUrl: parsedEnvironment.data.TEST_DATABASE_URL,
});
