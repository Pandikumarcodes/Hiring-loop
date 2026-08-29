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

const environmentInputSchema = z.object({
  NODE_ENV: environmentSchema,
  PORT: portSchema,
});

const parsedEnvironment = environmentInputSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
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
});
