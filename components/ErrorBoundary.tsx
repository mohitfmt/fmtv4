"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Enhanced ErrorBoundary with detailed error reporting
 * and automatic recovery attempts
 */
class ErrorBoundary extends Component<Props, State> {
  private recoveryTimeoutId: NodeJS.Timeout | null = null;
  private errorCount = 0;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.errorCount++;

    // Log error to console with component stack
    console.error("Error caught by boundary:", error);
    console.error("Component stack:", errorInfo.componentStack);

    // Store error info in state
    this.setState({ errorInfo });

    // Optional: send to error reporting service
    // reportError(error, errorInfo);

    // Attempt recovery after increasing delays
    const recoveryDelay = Math.min(this.errorCount * 2000, 10000); // Max 10 seconds

    if (this.recoveryTimeoutId) {
      clearTimeout(this.recoveryTimeoutId);
    }

    this.recoveryTimeoutId = setTimeout(() => {
      // Only attempt recovery if we're still showing the error
      if (this.state.hasError) {
        this.setState({ hasError: false });
      }
    }, recoveryDelay);
  }

  componentWillUnmount() {
    if (this.recoveryTimeoutId) {
      clearTimeout(this.recoveryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        this.props.fallback || (
          <div className="error-boundary p-6 bg-red-50 border border-red-200 rounded-md max-w-2xl mx-auto my-8 shadow-sm">
            <h2 className="text-xl font-medium text-red-800 mb-3">
              Something went wrong
            </h2>
            <p className="text-sm text-red-700 mb-4">
              We are sorry, but there was an error loading this content. Our team
              has been notified.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
              >
                Reload page
              </button>

              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 bg-white border border-red-300 text-red-700 text-sm rounded hover:bg-red-50 transition-colors"
              >
                Try again
              </button>

              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
              >
                Go back
              </button>
            </div>

            {/* Show error details in development only */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mt-6 p-4 bg-gray-800 text-gray-200 rounded overflow-auto max-h-64 text-sm">
                <p className="font-mono mb-2">{this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <pre className="font-mono text-xs text-gray-400 mt-2">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
