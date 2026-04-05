// src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="h-full flex flex-col items-center justify-center px-6 text-center bg-base">
          <h2 className="font-display text-h2 text-text-primary mb-2">Something went wrong</h2>
          <p className="text-body text-text-secondary mb-6 max-w-sm">
            An unexpected error occurred. This might be a temporary issue with the chain connection.
          </p>
          <button
            onClick={() => {
              this.handleReset();
              window.location.reload();
            }}
            className="h-10 px-6 rounded-lg bg-cyan-primary text-text-on-cyan text-label font-medium hover:bg-cyan-hover transition-colors"
          >
            Reload app
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
