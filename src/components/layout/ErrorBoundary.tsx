import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Inner wrapper that resets the boundary on navigation ──────────────

function LocationResetWrapper({
  children,
  onLocationChange,
}: {
  children: ReactNode;
  onLocationChange: () => void;
}) {
  const location = useLocation();
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;
      onLocationChange();
    }
  }, [location.pathname, onLocationChange]);

  return <>{children}</>;
}

// ── ErrorBoundary ─────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="flex flex-col items-center gap-6 text-center max-w-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold text-foreground">
                Une erreur est survenue
              </h2>
              <p className="text-sm text-muted-foreground">
                Veuillez rafraîchir la page ou contacter le support.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={this.handleGoHome}>
                Retour à l'accueil
              </Button>
              <Button onClick={this.handleReload}>
                Rafraîchir la page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <LocationResetWrapper onLocationChange={this.handleReset}>
        {this.props.children}
      </LocationResetWrapper>
    );
  }
}
