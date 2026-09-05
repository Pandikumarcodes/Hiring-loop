import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'

import { BrandMark } from '../features/auth/components/BrandMark'

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="auth-layout">
      <a className="skip-link" href="#auth-main">
        Skip to main content
      </a>
      <aside className="auth-layout__brand-panel" aria-label="About HiringLoop">
        <Link
          className="auth-layout__brand-link"
          to="/"
          aria-label="HiringLoop home"
        >
          <BrandMark />
        </Link>
        <div className="auth-workflow" aria-hidden="true">
          <div className="auth-workflow__topline">
            <span>Hiring workspace</span>
            <span className="auth-workflow__status">On track</span>
          </div>
          <div className="auth-workflow__role">
            <div>
              <span className="auth-workflow__eyebrow">Open role</span>
              <strong>Full-Stack Engineer</strong>
            </div>
            <span className="auth-workflow__count">12 candidates</span>
          </div>
          <div className="auth-workflow__pipeline">
            <span className="auth-workflow__eyebrow">Candidate pipeline</span>
            <div className="auth-workflow__steps">
              <span className="auth-workflow__step auth-workflow__step--active">
                Applied
              </span>
              <span className="auth-workflow__connector" />
              <span className="auth-workflow__step">Screen</span>
              <span className="auth-workflow__connector" />
              <span className="auth-workflow__step">Interview</span>
              <span className="auth-workflow__connector" />
              <span className="auth-workflow__step">Decision</span>
            </div>
          </div>
          <div className="auth-workflow__footer">
            <span className="auth-workflow__avatar">3</span>
            <span>Team aligned</span>
            <span className="auth-workflow__meeting">
              3 interviews scheduled
            </span>
          </div>
        </div>
        <div className="auth-layout__brand-copy">
          <p className="auth-layout__statement">Hiring, organized.</p>
          <p className="auth-layout__positioning">
            Keep jobs, candidates, interviews, and decisions in one clear
            workspace.
          </p>
          <ul className="auth-layout__benefits">
            <li>Structured hiring workflows</li>
            <li>Clear team collaboration</li>
            <li>Better hiring decisions</li>
          </ul>
        </div>
      </aside>
      <main className="auth-layout__main" id="auth-main" tabIndex={-1}>
        <div className="auth-layout__form-panel">{children}</div>
      </main>
    </div>
  )
}
