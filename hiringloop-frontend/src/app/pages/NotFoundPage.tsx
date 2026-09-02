import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="status-page" aria-labelledby="not-found-title">
      <p className="eyebrow">404</p>
      <h1 id="not-found-title">Page not found</h1>
      <p>The address does not match a page in this frontend foundation.</p>
      <Link className="ui-button ui-button--primary" to="/">
        Return to foundation home
      </Link>
    </section>
  )
}
