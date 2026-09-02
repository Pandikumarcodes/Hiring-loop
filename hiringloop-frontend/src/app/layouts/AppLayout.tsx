import { Link, Outlet } from 'react-router-dom'

export function AppLayout() {
  return (
    <div className="app-frame">
      <header className="app-header">
        <Link className="brand" to="/">
          HiringLoop
        </Link>
        <nav aria-label="Application shell navigation">
          <Link to="/">Return home</Link>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
