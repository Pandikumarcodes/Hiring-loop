import { useState } from 'react'

import { Button } from '../../../components/ui'
import { startGoogleAuthentication } from '../google-navigation'

interface GoogleButtonProps {
  disabled?: boolean
  onStart?: () => void
}

export function GoogleButton({ disabled, onStart }: GoogleButtonProps) {
  const [isNavigating, setIsNavigating] = useState(false)

  function handleGoogleStart() {
    if (disabled || isNavigating) return

    setIsNavigating(true)
    if (onStart) {
      onStart()
      return
    }

    startGoogleAuthentication()
  }

  return (
    <Button
      className="auth-google-button"
      disabled={disabled || isNavigating}
      onClick={handleGoogleStart}
      type="button"
      variant="secondary"
      aria-label={isNavigating ? 'Opening Google sign-in' : undefined}
      aria-busy={isNavigating || undefined}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path
          d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"
          fill="#4285F4"
        />
        <path
          d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.77-5.61-4.14H3.04v2.62A10 10 0 0 0 12 22Z"
          fill="#34A853"
        />
        <path
          d="M6.39 13.85A6 6 0 0 1 6.08 12c0-.64.11-1.27.31-1.85V7.53H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.47l3.35-2.62Z"
          fill="#FBBC05"
        />
        <path
          d="M12 6.01c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.53l3.35 2.62C7.18 7.78 9.39 6.01 12 6.01Z"
          fill="#EA4335"
        />
      </svg>
      Continue with Google
    </Button>
  )
}
