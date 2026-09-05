import { describe, expect, it, vi } from 'vitest';

import {
  createConsoleEmailDelivery,
  createEmailDelivery,
  createSendGridEmailDelivery,
  EmailDeliveryError,
} from '../../../src/modules/auth/email/email-delivery.js';

describe('email delivery provider selection', () => {
  it('selects the console provider in development', () => {
    const logger = { log: vi.fn() };
    const delivery = createEmailDelivery({
      provider: 'console',
      environment: 'development',
      frontendOrigin: 'http://localhost:5173',
      logger,
      sendGrid: {},
    });

    expect(delivery.sendInvitation).toBeTypeOf('function');
  });

  it('selects SendGrid when configured', () => {
    const client = { setApiKey: vi.fn(), send: vi.fn() };
    const delivery = createEmailDelivery({
      provider: 'sendgrid',
      environment: 'production',
      frontendOrigin: 'https://app.hiringloop.test',
      sendGrid: {
        client,
        apiKey: 'SG.test-key',
        from: 'sender@example.test',
        frontendOrigin: 'https://app.hiringloop.test',
      },
    });

    expect(delivery.sendInvitation).toBeTypeOf('function');
    expect(client.setApiKey).toHaveBeenCalledWith('SG.test-key');
  });

  it('rejects console selection outside development', () => {
    expect(() =>
      createEmailDelivery({
        provider: 'console',
        environment: 'production',
        frontendOrigin: 'https://app.hiringloop.test',
        sendGrid: {},
      }),
    ).toThrow('only available in development');
  });
});

describe('console email delivery', () => {
  it('prints invitation details and the raw URL without a token hash', async () => {
    const logger = { log: vi.fn() };
    const delivery = createConsoleEmailDelivery({
      frontendOrigin: 'http://localhost:5173',
      logger,
      environment: 'development',
    });

    await delivery.sendInvitation({
      email: 'invited@example.com',
      organizationName: 'Acme',
      role: 'RECRUITER',
      expiresAt: new Date('2026-09-11T00:00:00.000Z'),
      invitationToken: 'raw-token',
    });

    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('To: invited@example.com'),
    );
    const output = logger.log.mock.calls[0][0];
    expect(output).toContain('Organization: Acme');
    expect(output).toContain('Role: RECRUITER');
    expect(output).toContain('Expires: 2026-09-11T00:00:00.000Z');
    expect(output).toContain(
      'http://localhost:5173/invitations/accept?token=raw-token',
    );
    expect(output).not.toContain('tokenHash');
  });
});

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

  it('sends an invitation acceptance link without including the token hash', async () => {
    const client = { setApiKey: vi.fn(), send: vi.fn(async () => []) };
    const delivery = createSendGridEmailDelivery({
      client,
      apiKey: 'SG.test-key',
      from: 'HiringLoop <no-reply@hiringloop.test>',
      frontendOrigin: 'https://app.hiringloop.test',
    });

    await delivery.sendInvitation({
      email: 'user@example.test',
      organizationName: 'Acme Hiring',
      role: 'RECRUITER',
      expiresAt: new Date('2026-09-11T00:00:00.000Z'),
      invitationToken: 'raw/token?value',
    });

    expect(client.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.test',
        subject: 'Invitation to join Acme Hiring on HiringLoop',
        text: expect.stringContaining(
          'https://app.hiringloop.test/invitations/accept?token=raw%2Ftoken%3Fvalue',
        ),
      }),
    );
    const message = client.send.mock.calls[0][0];
    expect(message.text).not.toContain('tokenHash');
    expect(message.html).not.toContain('tokenHash');
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
