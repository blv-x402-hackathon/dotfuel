"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

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

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="error-boundary-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message ?? "An unexpected error occurred."}</p>
          <button
            className="button button--ghost"
            onClick={() => this.setState({ hasError: false, error: null })}
            type="button"
          >
            Try again
          </button>
          <style jsx>{`
            .error-boundary-fallback {
              display: grid;
              gap: 12px;
              justify-items: center;
              padding: 32px;
              text-align: center;
              border: 1px dashed var(--danger-border);
              border-radius: var(--radius-lg);
              background: var(--danger-bg);
              color: var(--ink);
            }

            .error-boundary-fallback h2 {
              margin: 0;
              font-size: 18px;
            }

            .error-boundary-fallback p {
              margin: 0;
              color: var(--muted);
              font-size: 14px;
              max-width: 40ch;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}
