export const notificationKeys = {
  list: (org: string, page: number) => ['notifications', org, page] as const,
  unread: (org: string) => ['notifications', org, 'unread-count'] as const,
  preferences: (org: string) => ['notification-preferences', org] as const,
}
