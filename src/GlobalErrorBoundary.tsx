import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

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
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif', width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2' }}>
          <h1 style={{ color: '#991b1b', fontSize: '2rem', marginBottom: '1rem' }}>¡Aplicación Colapsada!</h1>
          <p style={{ color: '#7f1d1d', marginBottom: '1rem', maxWidth: '600px' }}>
            Un componente interno generó un error inesperado al dibujar la pantalla (probablemente un intento de leer una lista vacía).
          </p>
          <pre style={{ textAlign: 'left', background: '#fff', padding: '1rem', overflowX: 'auto', borderRadius: '8px', border: '1px solid #fca5a5', maxWidth: '80%', color: '#991b1b', fontWeight: 'bold' }}>
            {this.state.error?.toString() || 'Error desconocido'}
          </pre>
          <pre style={{ textAlign: 'left', background: '#fff', padding: '1rem', overflowX: 'auto', borderRadius: '8px', border: '1px solid #fca5a5', maxWidth: '80%', fontSize: '0.8rem', color: '#dc2626', marginTop: '1rem' }}>
            {this.state.error?.stack}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', cursor: 'pointer', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold' }}
          >
            Refrescar y reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
