import 'dotenv/config';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../../../src/app.js';

describe('application auth CORS behavior', () => {
  it('keeps the allowed frontend origin on unauthenticated /me responses', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Origin', 'http://localhost:5173');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers['access-control-allow-origin']).not.toBe('*');
  });
});
