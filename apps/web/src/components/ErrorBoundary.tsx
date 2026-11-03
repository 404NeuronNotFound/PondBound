import { Component } from 'react';
import type { ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    if (this.state.failed) {
      return (
        <section className="message-panel error-panel" role="alert" aria-labelledby="error-heading">
          <p className="eyebrow">A small detour</p>
          <h1 id="error-heading">We hit a snag.</h1>
          <p>This part of Pondbound couldn’t open. Reload the page to try again.</p>
          <div className="actions">
            <button className="button" onClick={() => window.location.reload()}>
              Reload page
            </button>
            <a className="text-link" href="/">
              Back to the start
            </a>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}
