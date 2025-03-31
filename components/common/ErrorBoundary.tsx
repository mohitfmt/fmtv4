// components/common/ErrorBoundary.tsx
import React from "react";
import Link from "next/link";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      "[ErrorBoundary] Client-side crash caught:",
      error,
      errorInfo
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center text-red-600">
          <h1 className="text-2xl font-bold mb-2">Something went wrong.</h1>
          <p className="bg-yellow-200">{this.state.error?.message}</p>
          <p className="mt-2">
            Try refreshing the page or{" "}
            <Link href="/videos" className="underline text-blue-600">
              go back to videos
            </Link>
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
