import { ChevronUp, LogOut } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../shared/components/ui'

export function AccountMenu({
  email,
  pending,
  onLogout,
}: {
  email: string
  pending: boolean
  onLogout: () => void
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Open account menu for ${email}`}
          className="flex min-h-12 w-full min-w-0 items-center gap-3 rounded-control p-2 text-left hover:bg-surface-muted focus-visible:outline-3 focus-visible:outline-primary-dark focus-visible:outline-offset-2"
        >
          <Avatar>
            <AvatarFallback>{email[0]?.toUpperCase() ?? 'P'}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-text-secondary">Account</span>
            <span className="block truncate text-sm font-semibold">
              {email}
            </span>
          </span>
          <ChevronUp
            className="h-4 w-4 shrink-0 text-text-secondary"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        aria-label="Account menu"
        aria-labelledby={undefined}
        className="w-72"
      >
        <div className="px-3 py-3">
          <p className="text-xs text-text-secondary">Signed in account</p>
          <p className="mt-1 text-sm font-semibold [overflow-wrap:anywhere]">
            {email}
          </p>
        </div>
        <DropdownMenuSeparator className="my-1 h-px bg-border" />
        <DropdownMenuItem
          disabled={pending}
          onSelect={onLogout}
          className="gap-3"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          {pending ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
