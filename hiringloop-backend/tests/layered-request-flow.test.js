import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createFoundationController } from './fixtures/layered-request-flow/controller.js';
import { createFoundationApp } from './fixtures/layered-request-flow/router.js';
import { createFoundationUseCase } from './fixtures/layered-request-flow/service.js';
import { createInMemoryRepository } from './fixtures/layered-request-flow/repository.js';

const fixtureDirectory = path.dirname(fileURLToPath(import.meta.url));

function createComposedFixture() {
  const repository = createInMemoryRepository();
  const save = vi.spyOn(repository, 'save');
  const useCase = createFoundationUseCase({ repository });
  const execute = vi.spyOn(useCase, 'execute');
  const controller = createFoundationController({ useCase });
  const controllerSpy = vi.fn(controller);
  const app = createFoundationApp({ controller: controllerSpy });

  return { app, controllerSpy, execute, save };
}

describe('layered request-flow foundation', () => {
  it('composes route, validation, controller, use case, and repository', async () => {
    const { app, controllerSpy, execute, save } = createComposedFixture();

    const response = await request(app)
      .post('/api/v1/boundary-fixture')
      .send({ name: '  Boundary example  ', ignored: 'not returned' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 'fixture-1',
      name: 'Boundary example',
    });
    expect(controllerSpy).toHaveBeenCalledOnce();
    expect(controllerSpy.mock.calls[0][0].validated.body).toEqual({
      name: 'Boundary example',
    });
    expect(execute).toHaveBeenCalledWith({ name: 'Boundary example' });
    expect(save).toHaveBeenCalledWith({ name: 'Boundary example' });
  });

  it('stops the flow at validation', async () => {
    const { app, controllerSpy, execute, save } = createComposedFixture();

    const response = await request(app)
      .post('/api/v1/boundary-fixture')
      .send({ name: '', secret: 'must not be reflected' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(controllerSpy).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(JSON.stringify(response.body)).not.toContain(
      'must not be reflected',
    );
  });

  it('propagates an application error to the centralized handler', async () => {
    const { app, controllerSpy, execute, save } = createComposedFixture();

    const response = await request(app)
      .post('/api/v1/boundary-fixture')
      .send({ name: 'conflict' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: 'CONFLICT',
        message: 'A matching foundation fixture already exists',
        requestId: null,
      },
    });
    expect(controllerSpy).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledWith({ name: 'conflict' });
    expect(save).not.toHaveBeenCalled();
  });

  it('maps an unexpected service rejection to a generic internal error', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    try {
      const { app, execute, save } = createComposedFixture();
      const response = await request(app)
        .post('/api/v1/boundary-fixture')
        .send({ name: 'unexpected' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          requestId: null,
        },
      });
      expect(JSON.stringify(response.body)).not.toContain(
        'fixture-only unexpected failure',
      );
      expect(execute).toHaveBeenCalledWith({ name: 'unexpected' });
      expect(save).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledOnce();
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe('layer dependency direction', () => {
  it('keeps Express and Prisma at their intended boundaries', () => {
    const readFixture = (fileName) =>
      fs.readFileSync(
        path.join(fixtureDirectory, 'fixtures/layered-request-flow', fileName),
        'utf8',
      );
    const controllerSource = readFixture('controller.js');
    const serviceSource = readFixture('service.js');
    const repositorySource = readFixture('repository.js');

    expect(controllerSource).not.toContain('@prisma/client');
    expect(controllerSource).not.toContain('request.body');
    expect(controllerSource).toContain('request.validated.body');
    expect(serviceSource).not.toMatch(/from ['"]express['"]/);
    expect(serviceSource).not.toContain('@prisma/client');
    expect(serviceSource).toContain('repository.save({ name })');
    expect(repositorySource).not.toContain('@prisma/client');
  });
});
