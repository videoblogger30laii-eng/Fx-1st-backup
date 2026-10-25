import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Filter out benign cross-origin iframe events from external embed widgets (e.g. TradingView resize postMessages)
if (typeof window !== 'undefined') {
  const origError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
    if (
      msg.includes('contentWindow is not available') ||
      msg.includes('Cannot listen to the event from the provided iframe') ||
      msg.includes('ResizeObserver loop limit exceeded')
    ) {
      return;
    }
    origError.apply(console, args);
  };
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error boundary caught:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080B11] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md bg-[#111827] border border-red-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
              !
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Application Recoverable Error</h2>
            <p className="text-xs text-gray-400 mb-4">
              The application encountered a transient runtime issue or mobile viewport restriction. Click below to reload.
            </p>
            <p className="text-[11px] text-red-400 mb-6 font-mono bg-black/50 p-3 rounded-lg text-left overflow-auto max-h-32 border border-red-500/20">
              {this.state.error?.message || 'Unknown runtime error'}
            </p>
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                } catch {}
                window.location.reload();
              }}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-[#080B11] font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              Reload Application & Reset Cache
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  // Clear any temporary placeholder before React takes over DOM
  const placeholder = document.getElementById('apk-boot-placeholder');
  if (placeholder) {
    placeholder.remove();
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );

  if (typeof window !== 'undefined') {
    (window as any).__appMounted = true;
  }
}
