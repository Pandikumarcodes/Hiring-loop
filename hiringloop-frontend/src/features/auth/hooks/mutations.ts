import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  changePassword,
  forgotPassword,
  login,
  logout,
  register,
  resendVerification,
  resetPassword,
  revokeAllSessions,
  verifyEmail,
} from '../api/auth.api'
import { runAuthenticatedAuthMutation } from './authenticated-mutation'
import { authKeys } from './query-keys'
import type { AuthUserDto } from '../types/auth.types'

function useClearSessionState() {
  const queryClient = useQueryClient()

  return async () => {
    await queryClient.cancelQueries({ queryKey: authKeys.all })
    queryClient.setQueryData<AuthUserDto | null>(authKeys.currentUser(), null)
    queryClient.removeQueries({ queryKey: authKeys.csrf(), exact: true })
  }
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: login,
    onSuccess: async ({ user }) => {
      await queryClient.cancelQueries({ queryKey: authKeys.all })
      queryClient.removeQueries({ queryKey: authKeys.csrf(), exact: true })
      queryClient.setQueryData(authKeys.currentUser(), user)
    },
  })
}

export function useRegister() {
  return useMutation({ mutationFn: register })
}

export function useVerifyEmail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: verifyEmail,
    onSuccess: async () => {
      const currentUser = queryClient.getQueryData<AuthUserDto | null>(
        authKeys.currentUser(),
      )
      if (currentUser) {
        await queryClient.invalidateQueries({
          queryKey: authKeys.currentUser(),
          exact: true,
        })
      }
    },
  })
}

export function useResendVerification() {
  return useMutation({ mutationFn: resendVerification })
}

export function useForgotPassword() {
  return useMutation({ mutationFn: forgotPassword })
}

export function useResetPassword() {
  const clearSessionState = useClearSessionState()

  return useMutation({
    mutationFn: resetPassword,
    onSuccess: clearSessionState,
  })
}

export function useChangePassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof changePassword>[0]) =>
      runAuthenticatedAuthMutation(queryClient, (csrfToken) =>
        changePassword(input, csrfToken),
      ),
    onSuccess: async ({ user }) => {
      await queryClient.cancelQueries({
        queryKey: authKeys.currentUser(),
        exact: true,
      })
      queryClient.setQueryData(authKeys.currentUser(), user)
      queryClient.removeQueries({ queryKey: authKeys.csrf(), exact: true })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const clearSessionState = useClearSessionState()

  return useMutation({
    mutationFn: () =>
      runAuthenticatedAuthMutation(queryClient, (csrfToken) =>
        logout(csrfToken),
      ),
    onSuccess: clearSessionState,
  })
}

export function useRevokeAllSessions() {
  const queryClient = useQueryClient()
  const clearSessionState = useClearSessionState()

  return useMutation({
    mutationFn: () =>
      runAuthenticatedAuthMutation(queryClient, (csrfToken) =>
        revokeAllSessions(csrfToken),
      ),
    onSuccess: clearSessionState,
  })
}
