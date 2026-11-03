import { Suspense, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoadingState } from '../components/LoadingState';
import { ServerStatus } from '../components/ServerStatus';

export function AppShell() {
  const { pathname } = useLocation();
  const content = useRef<HTMLElement>(null);
  useEffect(() => {
    const path = pathname.replace(/\/+$/, '') || '/';
    const title = path === '/' ? 'A quiet beginning' : path === '/play' ? 'Pond preview' : 'Page not found';
    document.title = `${title} · Pondbound`;
    content.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <Link to="/" className="wordmark" aria-label="Pondbound home">PONDBOUND<span className="wordmark-dot" aria-hidden="true">.</span></Link>
        <nav className="site-nav" aria-label="Main navigation">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/play">Pond preview</NavLink>
        </nav>
      </header>
      <main id="main-content" ref={content} tabIndex={-1}>
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<LoadingState label="Opening your next stop…" />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <footer className="site-footer">
        <span>A quiet beginning. A world still growing.</span>
        <ServerStatus />
      </footer>
    </div>
  );
}
