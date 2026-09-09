import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runAuthenticatedAuthMutation } from '../../auth/hooks/authenticated-mutation'
import {
  markAllNotificationsRead,
  markNotificationRead,
  putPreferences,
} from '../api/notifications.api'
import { notificationKeys } from './query-keys'
import type { NotificationPreferenceDto } from '../types/notifications.types'
export function useNotificationMutations(org: string) {
  const client = useQueryClient()
  const invalidate = () => {
    void client.invalidateQueries({ queryKey: ['notifications', org] })
  }
  const read = useMutation({
    mutationFn: (id: string) =>
      runAuthenticatedAuthMutation(client, (csrf) =>
        markNotificationRead(org, id, csrf),
      ),
    onSuccess: invalidate,
  })
  const all = useMutation({
    mutationFn: () =>
      runAuthenticatedAuthMutation(client, (csrf) =>
        markAllNotificationsRead(org, csrf),
      ),
    onSuccess: invalidate,
  })
  const preferences = useMutation({
    mutationFn: (items: NotificationPreferenceDto[]) =>
      runAuthenticatedAuthMutation(client, (csrf) =>
        putPreferences(org, items, csrf),
      ),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: notificationKeys.preferences(org) }),
  })
  return { read, all, preferences }
}
