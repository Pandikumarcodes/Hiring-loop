import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { errorHandler } from '../src/middleware/error-handler.js';
import { validateRequest } from '../src/middleware/validate-request.js';

function createFixture({ body, params, query, handler }) {
  const fixture = express();
  fixture.use(express.json());
  fixture.post(
    '/users/:userId',
    validateRequest({ body, params, query }),
    handler,
  );
  fixture.use(errorHandler);
  return fixture;
}

describe('HTTP request validation boundary', () => {
  it('passes parsed body values to the controller', async () => {
    const fixture = createFixture({
      body: z.object({ age: z.coerce.number().int() }),
      handler: (request, response) => response.json(request.validated.body),
    });

    const response = await request(fixture)
      .post('/users/example')
      .send({ age: '42' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ age: 42 });
  });

  it('maps invalid body input to a safe validation error', async () => {
    const fixture = createFixture({
      body: z.object({ email: z.string().email() }),
      handler: (_request, response) => response.json({ status: 'ok' }),
    });

    const response = await request(fixture)
      .post('/users/example')
      .send({ email: 'not-an-email', password: 'do-not-reflect-me' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('Request validation failed');
    expect(response.body.error.details).toEqual([
      { path: ['email'], message: 'Invalid email address' },
    ]);
    expect(JSON.stringify(response.body)).not.toContain('do-not-reflect-me');
    expect(JSON.stringify(response.body)).not.toContain('ZodError');
    expect(response.body.error).not.toHaveProperty('stack');
  });

  it('passes parsed route params to the controller', async () => {
    const fixture = createFixture({
      params: z.object({ userId: z.string().min(3) }),
      handler: (request, response) => response.json(request.validated.params),
    });

    const response = await request(fixture).post('/users/abc').send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: 'abc' });
  });

  it('rejects invalid route params with structured validation details', async () => {
    const fixture = createFixture({
      params: z.object({ userId: z.string().min(3) }),
      handler: (_request, response) => response.json({ status: 'ok' }),
    });

    const response = await request(fixture).post('/users/x').send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details[0].path).toEqual(['userId']);
    expect(response.body.error.details[0]).toHaveProperty('message');
  });

  it('passes explicitly coerced query values to the controller', async () => {
    const fixture = createFixture({
      query: z.object({ page: z.coerce.number().int().positive() }),
      handler: (request, response) => response.json(request.validated.query),
    });

    const response = await request(fixture).post('/users/example?page=2');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ page: 2 });
  });

  it('rejects invalid query values without global coercion', async () => {
    const fixture = createFixture({
      query: z.object({ page: z.number().int().positive() }),
      handler: (_request, response) => response.json({ status: 'ok' }),
    });

    const response = await request(fixture).post('/users/example?page=2');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details[0].path).toEqual(['page']);
  });

  it('stores parsed values for multiple locations in one predictable boundary', async () => {
    const fixture = createFixture({
      body: z.object({ active: z.coerce.boolean() }),
      params: z.object({ userId: z.string() }),
      query: z.object({ page: z.coerce.number().int() }),
      handler: (request, response) => response.json(request.validated),
    });

    const response = await request(fixture)
      .post('/users/abc?page=3')
      .send({ active: 'true' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      body: { active: true },
      params: { userId: 'abc' },
      query: { page: 3 },
    });
  });
});
