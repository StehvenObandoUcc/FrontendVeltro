import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const ERROR_TITLE = 'Application Crashed';
const ERROR_DESCRIPTION = 'An unexpected rendering error occurred. Please refresh to retry.';
const RELOAD_LABEL = 'Refresh and retry';

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Global Error Boundary Catcher]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;
      return (
        <div className="error-boundary-screen">
          <h1 className="error-boundary-title">{ERROR_TITLE}</h1>
          <p className="error-boundary-description">{ERROR_DESCRIPTION}</p>
          <pre className="error-boundary-message">
            {this.state.error?.message ?? 'Unknown error'}
          </pre>
          {isDev && (
            <pre className="error-boundary-stack">
              {this.state.error?.stack}
            </pre>
          )}
          <button className="error-boundary-reload" onClick={() => window.location.reload()}>
            {RELOAD_LABEL}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
