import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CameraErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Camera Error Boundary]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '1.5rem',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            border: '1px solid #fca5a5',
            borderRadius: '12px',
            backgroundColor: '#fef2f2',
            color: '#7f1d1d',
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#991b1b' }}>
            Error de camara
          </h2>
          <p style={{ margin: 0, marginBottom: '1rem' }}>
            No se pudo acceder a la camara. Verifica los permisos.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '0.625rem 1rem',
              cursor: 'pointer',
              backgroundColor: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
            }}
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
