export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'current-user'] as const,
  csrf: () => [...authKeys.all, 'csrf'] as const,
}
