import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { default: app } = await import('../../../src/app.js');
const { disconnectDatabase, getPrismaClient } =
  await import('../../../src/database/client.js');

describe('composed authentication browser lifecycle', () => {
  let prisma;
  const email = `browser-${randomUUID()}@example.test`;
  const password = 'a deterministic password';
  const origin = 'http://localhost:5173';

  beforeAll(async () => {
    prisma = getPrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await disconnectDatabase();
  });

  it('registers, authenticates, issues CSRF, logs out, and creates a fresh session', async () => {
    const registered = await request(app)
      .post('/api/v1/auth/register')
      .set('Origin', origin)
      .send({ email, password });
    expect(registered.status).toBe(202);

    const firstLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send({ email, password });
    expect(firstLogin.status).toBe(200);
    const firstCookie = firstLogin.headers['set-cookie'][0];

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Origin', origin)
      .set('Cookie', firstCookie);
    expect(me.status).toBe(200);

    const csrf = await request(app)
      .get('/api/v1/auth/csrf')
      .set('Origin', origin)
      .set('Cookie', firstCookie);
    expect(csrf.status).toBe(200);

    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .set('Origin', origin)
      .set('Cookie', firstCookie)
      .set('X-CSRF-Token', csrf.body.data.csrfToken);
    expect(logout.status).toBe(204);

    const oldSession = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', firstCookie);
    expect(oldSession.status).toBe(401);

    const secondLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send({ email, password });
    expect(secondLogin.status).toBe(200);
    expect(secondLogin.headers['set-cookie'][0]).not.toBe(firstCookie);

    const secondMe = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', secondLogin.headers['set-cookie'][0]);
    expect(secondMe.status).toBe(200);
    expect(secondMe.body.data.user.emailVerified).toBe(false);
  });
});
