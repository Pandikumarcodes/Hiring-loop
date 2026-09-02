import sendGridClient from '@sendgrid/mail';

export class EmailDeliveryError extends Error {
  constructor({ category = 'provider-error', status } = {}) {
    super('Email delivery failed');
    this.name = 'EmailDeliveryError';
    this.category = category;
    this.status = Number.isInteger(status) ? status : undefined;
  }
}

const VERIFICATION_PATH = '/verify-email';
const PASSWORD_RESET_PATH = '/reset-password';

function verificationUrl(frontendOrigin, token) {
  const origin = frontendOrigin.endsWith('/')
    ? frontendOrigin
    : `${frontendOrigin}/`;
  return new URL(
    `${VERIFICATION_PATH.slice(1)}?token=${encodeURIComponent(token)}`,
    origin,
  ).toString();
}

export function passwordResetUrl(frontendOrigin, token) {
  const origin = frontendOrigin.endsWith('/')
    ? frontendOrigin
    : `${frontendOrigin}/`;
  return new URL(
    `${PASSWORD_RESET_PATH.slice(1)}?token=${encodeURIComponent(token)}`,
    origin,
  ).toString();
}

function providerFailure(error) {
  return new EmailDeliveryError({
    category: 'sendgrid-error',
    status: error?.code,
  });
}

export function createSendGridEmailDelivery({
  client = sendGridClient,
  apiKey,
  from,
  frontendOrigin,
}) {
  if (!apiKey || !from || !frontendOrigin) {
    throw new Error(
      'SendGrid email delivery requires API key, sender address, and frontend origin',
    );
  }

  client.setApiKey(apiKey);

  return {
    async sendEmailVerification({ email, verificationToken }) {
      const url = verificationUrl(frontendOrigin, verificationToken);
      try {
        await client.send({
          to: email,
          from,
          subject: 'Verify your HiringLoop email address',
          text: [
            'Verify your HiringLoop email address',
            '',
            `Use this link to verify your email address: ${url}`,
            '',
            'This link expires in 24 hours.',
            'If you did not request this account, you can ignore this email.',
          ].join('\n'),
          html: `<p>Verify your HiringLoop email address.</p><p><a href="${url}">Verify email address</a></p><p>This link expires in 24 hours.</p><p>If you did not request this account, you can ignore this email.</p>`,
        });
      } catch (error) {
        throw providerFailure(error);
      }
    },
    async sendPasswordReset({ email, resetToken, resetUrl }) {
      const url = resetUrl ?? passwordResetUrl(frontendOrigin, resetToken);
      try {
        await client.send({
          to: email,
          from,
          subject: 'Reset your HiringLoop password',
          text: [
            'Reset your HiringLoop password',
            '',
            `Use this link to reset your password: ${url}`,
            '',
            'This link expires in 30 minutes.',
            'If you did not request a password reset, you can ignore this email.',
          ].join('\n'),
          html: `<p>Reset your HiringLoop password.</p><p><a href="${url}">Reset password</a></p><p>This link expires in 30 minutes.</p><p>If you did not request a password reset, you can ignore this email.</p>`,
        });
      } catch (error) {
        throw providerFailure(error);
      }
    },
  };
}

export function createInMemoryEmailDelivery() {
  const messages = [];

  return {
    messages,
    async sendEmailVerification(message) {
      messages.push({ ...message });
    },
    async sendPasswordReset(message) {
      messages.push({ ...message });
    },
  };
}

export function createNonDeliveringEmailDelivery() {
  return {
    async sendEmailVerification() {
      throw new EmailDeliveryError();
    },
    async sendPasswordReset() {
      throw new EmailDeliveryError();
    },
  };
}
