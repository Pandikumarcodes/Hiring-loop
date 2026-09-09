import { queryOptions, useQuery } from '@tanstack/react-query'
import {
  getPreferences,
  listNotifications,
  unreadCount,
} from '../api/notifications.api'
import { notificationKeys } from './query-keys'
export const notificationsQueryOptions = (
  org: string,
  page: number,
  enabled = true,
) =>
  queryOptions({
    queryKey: notificationKeys.list(org, page),
    queryFn: ({ signal }) => listNotifications(org, page, signal),
    enabled,
    meta: { clearOnAuthChange: true },
  })
export const unreadQueryOptions = (org: string, enabled = true) =>
  queryOptions({
    queryKey: notificationKeys.unread(org),
    queryFn: ({ signal }) => unreadCount(org, signal),
    enabled,
    meta: { clearOnAuthChange: true },
  })
export const preferencesQueryOptions = (org: string, enabled = true) =>
  queryOptions({
    queryKey: notificationKeys.preferences(org),
    queryFn: ({ signal }) => getPreferences(org, signal),
    enabled,
    meta: { clearOnAuthChange: true },
  })
export const useNotifications = (org: string, page: number, enabled = true) =>
  useQuery(notificationsQueryOptions(org, page, enabled))
export const useUnreadCount = (org: string, enabled = true) =>
  useQuery(unreadQueryOptions(org, enabled))
export const useNotificationPreferences = (org: string, enabled = true) =>
  useQuery(preferencesQueryOptions(org, enabled))
