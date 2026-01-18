import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("UI crash", { error, info });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-xl rounded-3xl bg-white/80 p-8 shadow-glow">
            <h1 className="font-display text-3xl">Algo fallo</h1>
            <p className="mt-2 text-sm text-ink/60">
              Se produjo un error inesperado. Puedes reintentar.
            </p>
            {import.meta.env.DEV && this.state.error ? (
              <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-ink/5 p-3 text-xs text-ink/70">
                {this.state.error.stack ?? this.state.error.message}
              </pre>
            ) : null}
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-5 w-full rounded-xl bg-ocean px-4 py-3 text-sm font-semibold text-white"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
