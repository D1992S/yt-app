import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" aria-live="assertive" style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ color: '#dc2626', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Wystąpił nieoczekiwany błąd
          </h1>
          <pre
            aria-label="Szczegóły błędu"
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '1rem',
              overflow: 'auto',
              fontSize: '0.875rem',
              color: '#991b1b',
            }}
          >
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            aria-label="Spróbuj ponownie załadować aplikację"
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Spróbuj ponownie
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
