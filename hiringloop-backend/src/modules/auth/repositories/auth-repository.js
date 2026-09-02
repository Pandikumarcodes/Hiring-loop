import { Prisma } from '@prisma/client';

import { generateEntityId } from '../../../utils/ids.js';

export const EMAIL_VERIFICATION_PURPOSE = 'EMAIL_VERIFICATION';
export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const AUTH_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_PURPOSE = 'PASSWORD_RESET';
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
export const GOOGLE_PROVIDER = 'GOOGLE';

export function isUniqueConstraintError(error) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

export function createAuthRepository(prisma) {
  return {
    async findUserByEmail(email) {
      return prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, emailVerifiedAt: true },
      });
    },

    async findLoginIdentityByEmail(email) {
      return prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          emailVerifiedAt: true,
          passwordCredential: { select: { passwordHash: true } },
        },
      });
    },

    async findProviderIdentity({ provider, providerSubject }) {
      return prisma.authProviderIdentity.findUnique({
        where: { provider_providerSubject: { provider, providerSubject } },
        select: {
          user: { select: { id: true, email: true, emailVerifiedAt: true } },
        },
      });
    },

    async createGoogleIdentity({
      email,
      emailVerifiedAt,
      providerSubject,
      now,
    }) {
      const userId = generateEntityId();
      return prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: { id: userId, email, emailVerifiedAt },
          select: { id: true, email: true, emailVerifiedAt: true },
        });
        await transaction.authProviderIdentity.create({
          data: {
            id: generateEntityId(),
            userId: user.id,
            provider: GOOGLE_PROVIDER,
            providerSubject,
            createdAt: now,
          },
        });
        return user;
      });
    },

    async findPasswordResetIdentityByEmail(email) {
      return prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          passwordCredential: { select: { id: true } },
        },
      });
    },

    async replacePasswordResetToken({ userId, tokenHash, now, expiresAt }) {
      return prisma.$transaction(async (transaction) => {
        await transaction.authToken.updateMany({
          where: {
            userId,
            purpose: PASSWORD_RESET_PURPOSE,
            consumedAt: null,
            expiresAt: { gt: now },
          },
          data: { consumedAt: now },
        });

        return transaction.authToken.create({
          data: {
            id: generateEntityId(),
            userId,
            purpose: PASSWORD_RESET_PURPOSE,
            tokenHash,
            expiresAt,
          },
          select: { id: true, userId: true, expiresAt: true },
        });
      });
    },

    async findPasswordResetTokenByHash(tokenHash) {
      return prisma.authToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          userId: true,
          purpose: true,
          expiresAt: true,
          consumedAt: true,
          user: {
            select: {
              id: true,
              passwordCredential: { select: { id: true } },
            },
          },
        },
      });
    },

    async consumePasswordResetAndChangePassword({
      tokenId,
      userId,
      passwordHash,
      now,
    }) {
      return prisma.$transaction(async (transaction) => {
        const consumed = await transaction.authToken.updateMany({
          where: {
            id: tokenId,
            userId,
            purpose: PASSWORD_RESET_PURPOSE,
            consumedAt: null,
            expiresAt: { gt: now },
          },
          data: { consumedAt: now },
        });
        if (consumed.count !== 1) return false;

        await transaction.authToken.updateMany({
          where: {
            userId,
            purpose: PASSWORD_RESET_PURPOSE,
            consumedAt: null,
            expiresAt: { gt: now },
            id: { not: tokenId },
          },
          data: { consumedAt: now },
        });
        await transaction.passwordCredential.update({
          where: { userId },
          data: { passwordHash, passwordChangedAt: now },
        });
        await transaction.authSession.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: now },
        });
        return true;
      });
    },

    async findPasswordCredentialByUserId(userId) {
      return prisma.passwordCredential.findUnique({
        where: { userId },
        select: { id: true, passwordHash: true },
      });
    },

    async changePasswordAndRotateSession({
      userId,
      passwordHash,
      sessionSecretHash,
      expiresAt,
      now,
    }) {
      return prisma.$transaction(async (transaction) => {
        await transaction.passwordCredential.update({
          where: { userId },
          data: { passwordHash, passwordChangedAt: now },
        });
        await transaction.authSession.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: now },
        });
        return transaction.authSession.create({
          data: {
            id: generateEntityId(),
            userId,
            sessionSecretHash,
            expiresAt,
            createdAt: now,
            revokedAt: null,
          },
          select: { id: true, userId: true, expiresAt: true },
        });
      });
    },

    async createSession({ userId, sessionSecretHash, expiresAt, now }) {
      return prisma.authSession.create({
        data: {
          id: generateEntityId(),
          userId,
          sessionSecretHash,
          expiresAt,
          createdAt: now,
          revokedAt: null,
        },
        select: { id: true, userId: true, expiresAt: true },
      });
    },

    async findSessionIdentityByHash(sessionSecretHash) {
      return prisma.authSession.findUnique({
        where: { sessionSecretHash },
        select: {
          id: true,
          userId: true,
          expiresAt: true,
          revokedAt: true,
          user: {
            select: { id: true, email: true, emailVerifiedAt: true },
          },
        },
      });
    },

    async revokeSessionById({ sessionId, userId, revokedAt }) {
      return prisma.authSession.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt },
      });
    },

    async revokeAllSessionsForUser({ userId, revokedAt }) {
      return prisma.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt },
      });
    },

    async createRegistrationIdentity({
      email,
      passwordHash,
      tokenHash,
      now,
      expiresAt,
    }) {
      const tokenId = generateEntityId();
      const userId = generateEntityId();

      return prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: { id: userId, email },
        });

        await transaction.passwordCredential.create({
          data: {
            id: generateEntityId(),
            userId: user.id,
            passwordHash,
            passwordChangedAt: now,
          },
        });

        await transaction.authToken.create({
          data: {
            id: tokenId,
            userId: user.id,
            purpose: EMAIL_VERIFICATION_PURPOSE,
            tokenHash,
            expiresAt,
          },
        });

        return { user, tokenHash };
      });
    },

    async invalidateActiveEmailVerificationTokens(userId, now) {
      return prisma.authToken.updateMany({
        where: {
          userId,
          purpose: EMAIL_VERIFICATION_PURPOSE,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });
    },

    async replaceEmailVerificationToken({ userId, tokenHash, now, expiresAt }) {
      return prisma.$transaction(async (transaction) => {
        await transaction.authToken.updateMany({
          where: {
            userId,
            purpose: EMAIL_VERIFICATION_PURPOSE,
            consumedAt: null,
            expiresAt: { gt: now },
          },
          data: { consumedAt: now },
        });

        return transaction.authToken.create({
          data: {
            id: generateEntityId(),
            userId,
            purpose: EMAIL_VERIFICATION_PURPOSE,
            tokenHash,
            expiresAt,
          },
        });
      });
    },

    async findTokenByHash(tokenHash) {
      return prisma.authToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });
    },

    async consumeEmailVerificationToken({ tokenId, userId, now }) {
      return prisma.$transaction(async (transaction) => {
        const consumed = await transaction.authToken.updateMany({
          where: {
            id: tokenId,
            userId,
            purpose: EMAIL_VERIFICATION_PURPOSE,
            consumedAt: null,
            expiresAt: { gt: now },
          },
          data: { consumedAt: now },
        });

        if (consumed.count !== 1) return false;

        await transaction.user.update({
          where: { id: userId },
          data: { emailVerifiedAt: now },
        });
        return true;
      });
    },
  };
}
