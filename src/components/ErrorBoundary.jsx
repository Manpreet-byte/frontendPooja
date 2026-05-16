import React from 'react';
import { api } from '../api/client';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '', stack: '', componentStack: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ?? 'Something went wrong.' };
  }

  componentDidCatch(error, info) {
    // Populate debug info for local development.
    if (!this.state.stack) {
      // eslint-disable-next-line react/no-did-catch-set-state
      this.setState({
        stack: String(error?.stack ?? ''),
        componentStack: String(info?.componentStack ?? ''),
      });
    }
    if (typeof window !== 'undefined') {
      // Keep it developer-friendly without breaking the UI.
      // eslint-disable-next-line no-console
      console.error('App crashed:', error, info);
      api.analytics
        .track({
          event_type: 'frontend_crash',
          entity_type: 'ui',
          entity_id: null,
          metadata: {
            message: error?.message ?? '',
            stack: String(error?.stack ?? '').slice(0, 2000),
            componentStack: String(info?.componentStack ?? '').slice(0, 2000),
            href: window.location.href,
          },
        })
        .catch(() => null);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="section">
        <div className="container">
          <div className="panel">
            <h2 className="h2" style={{ margin: 0 }}>We hit a snag</h2>
            <p className="muted" style={{ marginTop: 10, marginBottom: 12 }}>
              {this.state.message}
            </p>
            {import.meta?.env?.DEV ? (
              <details style={{ marginBottom: 12 }}>
                <summary>Debug details</summary>
                {this.state.stack ? (
                  <pre style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>
                    {this.state.stack}
                    {'\n'}
                    {this.state.componentStack}
                  </pre>
                ) : null}
              </details>
            ) : null}
            <button className="button button-solid" type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      </main>
    );
  }
}
