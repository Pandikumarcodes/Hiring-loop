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
        <div className="auth-layout__brand-copy">
          <p className="auth-layout__statement">
            Hire better.
            <br />
            Move faster.
            <br />
            Stay aligned.
          </p>
          <p className="auth-layout__positioning">
            Structured hiring for modern teams.
          </p>
          <ul className="auth-layout__benefits">
            <li>Clear hiring pipelines</li>
            <li>Structured collaboration</li>
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
