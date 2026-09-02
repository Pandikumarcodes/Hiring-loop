import { describe, expect, it, vi } from 'vitest';

import {
  createSendGridEmailDelivery,
  EmailDeliveryError,
} from '../../../src/modules/auth/email/email-delivery.js';

describe('SendGrid email verification delivery', () => {
  it('initializes once and sends the configured verification message', async () => {
    const client = { setApiKey: vi.fn(), send: vi.fn(async () => []) };
    const delivery = createSendGridEmailDelivery({
      client,
      apiKey: 'SG.test-key',
      from: 'HiringLoop <no-reply@hiringloop.test>',
      frontendOrigin: 'https://app.hiringloop.test',
    });

    await delivery.sendEmailVerification({
      email: 'user@example.test',
      verificationToken: 'token with / and ? chars',
    });

    expect(client.setApiKey).toHaveBeenCalledOnce();
    expect(client.setApiKey).toHaveBeenCalledWith('SG.test-key');
    expect(client.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.test',
        from: 'HiringLoop <no-reply@hiringloop.test>',
        subject: 'Verify your HiringLoop email address',
        text: expect.stringContaining(
          'https://app.hiringloop.test/verify-email?token=token%20with%20%2F%20and%20%3F%20chars',
        ),
        html: expect.stringContaining(
          'https://app.hiringloop.test/verify-email?token=token%20with%20%2F%20and%20%3F%20chars',
        ),
      }),
    );
  });

  it('maps provider failures without retaining provider details', async () => {
    const client = {
      setApiKey: vi.fn(),
      send: vi.fn(async () => {
        const error = new Error('secret provider response');
        error.code = 401;
        error.response = { body: { secret: 'do-not-expose' } };
        throw error;
      }),
    };
    const delivery = createSendGridEmailDelivery({
      client,
      apiKey: 'SG.test-key',
      from: 'no-reply@hiringloop.test',
      frontendOrigin: 'https://app.hiringloop.test',
    });

    await expect(
      delivery.sendEmailVerification({
        email: 'user@example.test',
        verificationToken: 'raw-secret',
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: 'EmailDeliveryError',
        category: 'sendgrid-error',
        status: 401,
        message: 'Email delivery failed',
      }),
    );
    try {
      await delivery.sendEmailVerification({
        email: 'user@example.test',
        verificationToken: 'raw-secret',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(EmailDeliveryError);
      expect(error).not.toHaveProperty('response');
      expect(JSON.stringify(error)).not.toContain('raw-secret');
      expect(JSON.stringify(error)).not.toContain('do-not-expose');
    }
  });
});
