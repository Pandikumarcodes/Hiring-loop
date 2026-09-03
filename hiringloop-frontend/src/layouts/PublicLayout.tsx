import { Link, Outlet } from 'react-router-dom'

export function PublicLayout() {
  return (
    <div className="site-frame">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="HiringLoop foundation home">
          HiringLoop
        </Link>
        <nav aria-label="Foundation navigation">
          <Link to="/">Home</Link>
          <Link to="/app">App shell</Link>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">Frontend foundation</footer>
    </div>
  )
}
