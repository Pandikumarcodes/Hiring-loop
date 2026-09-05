import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { BrandMark } from '../features/auth/components/BrandMark'

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="auth-shell flex min-h-0 flex-col bg-surface text-text-primary lg:grid lg:min-h-dvh lg:grid-cols-[minmax(22rem,42%)_minmax(0,58%)]">
      <a
        className="skip-link absolute left-4 top-[-5rem] z-50 bg-surface px-4 py-3 focus:top-4"
        href="#auth-main"
      >
        Skip to main content
      </a>
      <aside
        className="flex min-w-0 flex-col border-b border-teal-200 bg-primary-soft px-4 py-4 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-8"
        aria-label="About HiringLoop"
      >
        <Link
          className="inline-flex text-primary-dark"
          to="/"
          aria-label="HiringLoop home"
        >
          <BrandMark />
        </Link>
        <div className="w-full max-w-lg py-5 sm:py-6 lg:my-auto lg:py-10">
          <div
            className="mb-5 rounded-card border border-border bg-surface p-3 shadow-lg sm:mb-6 sm:p-4 lg:mb-8 lg:p-5"
            aria-hidden="true"
          >
            <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-text-secondary sm:text-xs">
              <span>Hiring workspace</span>
              <span className="shrink-0 rounded-full bg-primary-soft px-2 py-1 text-primary-dark">
                On track
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border py-3 sm:py-4">
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-text-secondary sm:text-xs">
                  Open role
                </span>
                <strong className="block truncate text-xs sm:text-sm">
                  Full-Stack Engineer
                </strong>
              </div>
              <span className="shrink-0 text-[10px] text-text-secondary sm:text-xs">
                12 candidates
              </span>
            </div>
            <div className="py-3 sm:py-4">
              <span className="text-[10px] font-bold text-text-secondary sm:text-xs">
                Candidate pipeline
              </span>
              <div className="mt-2 flex min-w-0 items-center gap-1">
                <span className="min-w-0 flex-1 truncate rounded border border-teal-200 bg-primary-soft px-1.5 py-1 text-[9px] font-bold text-primary-dark sm:px-2 sm:text-[10px]">
                  Applied
                </span>
                <span className="h-px flex-1 bg-border" />
                <span className="min-w-0 flex-1 truncate rounded border border-border bg-background px-1.5 py-1 text-[9px] text-text-secondary sm:px-2 sm:text-[10px]">
                  Screen
                </span>
                <span className="h-px flex-1 bg-border" />
                <span className="min-w-0 flex-1 truncate rounded border border-border bg-background px-1.5 py-1 text-[9px] text-text-secondary sm:px-2 sm:text-[10px]">
                  Interview
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-border pt-3 text-[11px] font-bold sm:text-xs">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-[10px] text-white">
                3
              </span>
              <span>Team aligned</span>
              <span className="ml-auto hidden text-xs font-normal text-text-secondary sm:inline">
                3 interviews scheduled
              </span>
            </div>
          </div>
          <p className="hidden text-xl font-semibold tracking-tight sm:block">
            Hiring, organized.
          </p>
          <p className="mt-2 hidden max-w-md leading-6 text-text-secondary sm:block">
            Keep jobs, candidates, interviews, and decisions in one clear
            workspace.
          </p>
          <ul className="mt-5 hidden gap-3 text-sm sm:grid">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Structured hiring workflows
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Clear team collaboration
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Better hiring decisions
            </li>
          </ul>
        </div>
      </aside>
      <main
        className="flex min-w-0 items-start justify-center px-4 py-8 outline-none sm:px-8 lg:items-center lg:px-16 lg:py-16"
        id="auth-main"
        tabIndex={-1}
      >
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}
