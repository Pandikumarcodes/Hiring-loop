import cors from 'cors';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

const allowedOrigin = 'https://frontend.example.test';

function app() {
  const server = express();
  server.use(
    cors({
      origin: (origin, callback) =>
        callback(null, origin ? origin === allowedOrigin : false),
      credentials: true,
      methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-Request-ID', 'X-CSRF-Token'],
    }),
  );
  server.post('/mutation', (_request, response) => response.json({ ok: true }));
  server.get('/unauthenticated', (_request, response) =>
    response.status(401).json({ error: { code: 'UNAUTHENTICATED' } }),
  );
  return server;
}

describe('credentialed CORS policy', () => {
  it('allows the configured origin and credentials without wildcard reflection', async () => {
    const response = await request(app())
      .post('/mutation')
      .set('Origin', allowedOrigin);
    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers['access-control-allow-origin']).not.toBe('*');
  });

  it('supports explicit CSRF preflight and withholds approval for disallowed origins', async () => {
    const preflight = await request(app())
      .options('/mutation')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'X-CSRF-Token, Content-Type');
    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe(
      allowedOrigin,
    );
    expect(preflight.headers['access-control-allow-credentials']).toBe('true');
    expect(preflight.headers['access-control-allow-headers']).toContain(
      'X-CSRF-Token',
    );

    const attacker = await request(app())
      .post('/mutation')
      .set('Origin', 'https://attacker.example.test');
    expect(attacker.status).toBe(200);
    expect(attacker.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('keeps CORS readable on structured 401 responses', async () => {
    const response = await request(app())
      .get('/unauthenticated')
      .set('Origin', allowedOrigin);

    expect(response.status).toBe(401);
    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});
