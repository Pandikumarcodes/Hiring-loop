export function createLogoutSession({
  authRepository,
  clock = () => new Date(),
}) {
  return async function logoutSession({ sessionId, userId }) {
    await authRepository.revokeSessionById({
      sessionId,
      userId,
      revokedAt: clock(),
    });
  };
}

export function createRevokeAllSessions({
  authRepository,
  clock = () => new Date(),
}) {
  return async function revokeAllSessions({ userId }) {
    await authRepository.revokeAllSessionsForUser({
      userId,
      revokedAt: clock(),
    });
  };
}
