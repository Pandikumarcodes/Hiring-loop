import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const node = process.execPath;
const moduleUrl = new URL('../../src/config/env.js', import.meta.url).href;
const baseEnvironment = {
  NODE_ENV: 'development',
  PORT: '3000',
  FRONTEND_ORIGIN: 'http://localhost:5173',
};

function load(environment) {
  const result = spawnSync(
    node,
    ['--input-type=module', '-e', `import(${JSON.stringify(moduleUrl)})`],
    {
      encoding: 'utf8',
      env: environment,
    },
  );
  return result;
}

describe('runtime environment configuration', () => {
  it.each([
    ['missing', undefined],
    ['short', 'short-secret'],
  ])(
    'rejects %s development CSRF configuration at startup',
    (_name, secret) => {
      const environment = { ...baseEnvironment };
      if (secret !== undefined) environment.AUTH_CSRF_SECRET = secret;
      const result = load(environment);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('AUTH_CSRF_SECRET');
    },
  );

  it('accepts a valid development CSRF secret', () => {
    const result = load({
      ...baseEnvironment,
      AUTH_CSRF_SECRET: 'a'.repeat(32),
    });
    expect(result.status).toBe(0);
  });

  it('uses only the controlled fallback for test configuration', () => {
    const result = load({ ...baseEnvironment, NODE_ENV: 'test' });
    expect(result.status).toBe(0);
  });

  it('does not enable SendGrid from FRONTEND_ORIGIN alone', () => {
    const result = load({
      ...baseEnvironment,
      AUTH_CSRF_SECRET: 'a'.repeat(32),
    });
    expect(result.status).toBe(0);
  });

  it.each([
    ['SENDGRID_API_KEY', { SENDGRID_API_KEY: 'key' }],
    ['AUTH_EMAIL_FROM', { AUTH_EMAIL_FROM: 'sender@example.com' }],
  ])('rejects %s without the other SendGrid values', (_name, values) => {
    const result = load({
      ...baseEnvironment,
      AUTH_CSRF_SECRET: 'a'.repeat(32),
      ...values,
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('SendGrid');
  });

  it('accepts complete SendGrid configuration', () => {
    const result = load({
      ...baseEnvironment,
      AUTH_CSRF_SECRET: 'a'.repeat(32),
      SENDGRID_API_KEY: 'key',
      AUTH_EMAIL_FROM: 'sender@example.com',
    });
    expect(result.status).toBe(0);
  });
});
