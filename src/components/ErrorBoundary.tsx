import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in App:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-400 text-3xl font-bold shadow-inner">
              ⚡
            </div>
            <h2 className="text-2xl font-black mb-2 text-white">Application Recovery Mode</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              We detected a temporary browser state or storage sync conflict. Click below to safely clear cache and restart the live terminal instantly.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold rounded-xl transition-all shadow-lg shadow-emerald-500/30 cursor-pointer text-base"
            >
              Reset & Restart Terminal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
