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
const INVITATION_PATH = '/invitations/accept';

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

export function invitationAcceptanceUrl(frontendOrigin, token) {
  const origin = frontendOrigin.endsWith('/')
    ? frontendOrigin
    : `${frontendOrigin}/`;
  return new URL(
    `${INVITATION_PATH.slice(1)}?token=${encodeURIComponent(token)}`,
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
    async sendInvitation({
      email,
      organizationName,
      role,
      expiresAt,
      invitationToken,
    }) {
      const url = invitationAcceptanceUrl(frontendOrigin, invitationToken);
      const expiration = new Date(expiresAt).toISOString();
      try {
        await client.send({
          to: email,
          from,
          subject: `Invitation to join ${organizationName} on HiringLoop`,
          text: [
            `You have been invited to join ${organizationName} on HiringLoop.`,
            '',
            `Your workspace role will be ${role}.`,
            `Accept the invitation here: ${url}`,
            `This invitation expires on ${expiration}.`,
            '',
            'If you did not expect this invitation, you can ignore this email.',
          ].join('\n'),
          html: `<p>You have been invited to join ${organizationName} on HiringLoop.</p><p>Your workspace role will be ${role}.</p><p><a href="${url}">Accept invitation</a></p><p>This invitation expires on ${expiration}.</p><p>If you did not expect this invitation, you can ignore this email.</p>`,
        });
      } catch (error) {
        throw providerFailure(error);
      }
    },
  };
}

function developmentEmailLog({
  email,
  subject,
  organizationName,
  role,
  expiresAt,
  url,
}) {
  return [
    '[DEV EMAIL]',
    `To: ${email}`,
    `Subject: ${subject}`,
    ...(organizationName ? [`Organization: ${organizationName}`] : []),
    ...(role ? [`Role: ${role}`] : []),
    ...(expiresAt ? [`Expires: ${new Date(expiresAt).toISOString()}`] : []),
    'Invitation URL:',
    url,
  ].join('\n');
}

export function createConsoleEmailDelivery({
  frontendOrigin,
  logger = console,
  environment,
}) {
  if (!frontendOrigin || environment !== 'development') {
    throw new Error(
      'Console email delivery requires a frontend origin and explicit development mode',
    );
  }

  return {
    async sendEmailVerification({ email, verificationToken }) {
      logger.log(
        developmentEmailLog({
          email,
          subject: 'Verify your HiringLoop email address',
          url: verificationUrl(frontendOrigin, verificationToken),
        }),
      );
    },
    async sendPasswordReset({ email, resetToken, resetUrl }) {
      logger.log(
        developmentEmailLog({
          email,
          subject: 'Reset your HiringLoop password',
          url: resetUrl ?? passwordResetUrl(frontendOrigin, resetToken),
        }),
      );
    },
    async sendInvitation({
      email,
      organizationName,
      role,
      expiresAt,
      invitationToken,
    }) {
      logger.log(
        developmentEmailLog({
          email,
          subject: `Invitation to join ${organizationName} on HiringLoop`,
          organizationName,
          role,
          expiresAt,
          url: invitationAcceptanceUrl(frontendOrigin, invitationToken),
        }),
      );
    },
  };
}

export function createEmailDelivery({
  provider,
  environment,
  frontendOrigin,
  sendGrid,
  logger = console,
}) {
  if (provider === 'console') {
    if (environment !== 'development') {
      throw new Error(
        'Console email delivery is only available in development',
      );
    }
    return createConsoleEmailDelivery({
      frontendOrigin,
      logger,
      environment,
    });
  }

  if (provider === 'sendgrid') {
    return createSendGridEmailDelivery(sendGrid);
  }

  throw new Error(`Unsupported email provider: ${provider}`);
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
    async sendInvitation(message) {
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
    async sendInvitation() {
      throw new EmailDeliveryError();
    },
  };
}
