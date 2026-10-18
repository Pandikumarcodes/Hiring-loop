import { afterEach, describe, expect, it } from 'vitest';

import { createAwsS3ApplicationStorage } from '../../../src/modules/applications/storage/aws-s3-application-storage.js';

const originalCredentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
};

afterEach(() => {
  for (const [key, value] of Object.entries({
    AWS_ACCESS_KEY_ID: originalCredentials.accessKeyId,
    AWS_SECRET_ACCESS_KEY: originalCredentials.secretAccessKey,
    AWS_SESSION_TOKEN: originalCredentials.sessionToken,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('AWS resume upload signing', () => {
  it('signs a one-time conditional PUT without using real credentials or storage', async () => {
    process.env.AWS_ACCESS_KEY_ID = 'TESTACCESSKEY';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key-not-valid';
    delete process.env.AWS_SESSION_TOKEN;

    const storage = createAwsS3ApplicationStorage({
      bucket: 'fake-resume-bucket',
      region: 'us-east-1',
      expiresIn: 600,
    });
    const result = await storage.createSignedPutUrl({
      objectKey: 'organizations/org/application-uploads/upload',
      mimeType: 'application/pdf',
    });
    const signedUrl = new URL(result.url);

    expect(signedUrl.searchParams.get('X-Amz-SignedHeaders')).toContain(
      'if-none-match',
    );
    expect(result.requiredHeaders).toEqual({
      'Content-Type': 'application/pdf',
      'If-None-Match': '*',
    });
    expect(signedUrl.searchParams.get('X-Amz-Credential')).toContain(
      'TESTACCESSKEY',
    );
  });

  it('preserves accepted bytes when the fake object store receives a replay', async () => {
    const objects = new Map();
    const fakeStorage = {
      async put({ objectKey, bytes, headers }) {
        if (headers['If-None-Match'] !== '*')
          throw new Error('Missing conditional write header');
        if (objects.has(objectKey)) {
          const error = new Error('Precondition failed');
          error.statusCode = 412;
          throw error;
        }
        objects.set(objectKey, Buffer.from(bytes));
      },
    };
    const key = 'organizations/org/application-uploads/upload';
    const acceptedBytes = Buffer.from('%PDF-accepted');

    await fakeStorage.put({
      objectKey: key,
      bytes: acceptedBytes,
      headers: { 'If-None-Match': '*' },
    });
    await expect(
      fakeStorage.put({
        objectKey: key,
        bytes: Buffer.from('%PDF-replacement'),
        headers: { 'If-None-Match': '*' },
      }),
    ).rejects.toMatchObject({ statusCode: 412 });

    expect(objects.get(key)).toEqual(acceptedBytes);
  });
});
