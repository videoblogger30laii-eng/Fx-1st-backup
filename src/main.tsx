import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Filter out benign cross-origin iframe events from external embed widgets (e.g. TradingView resize postMessages)
if (typeof window !== 'undefined') {
  const origError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
    if (msg.includes('contentWindow is not available') || msg.includes('Cannot listen to the event from the provided iframe')) {
      return;
    }
    origError.apply(console, args);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
