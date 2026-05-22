import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';
import './lib/i18n';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
}

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);

function ErrorFallback() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#080809', 
      color: '#fff',
      fontFamily: 'sans-serif',
      gap: '16px',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '24px', fontWeight: 900 }}>Xatolik yuz berdi</h1>
      <p style={{ color: '#888', fontSize: '14px' }}>
        Biz xabar oldik. Sahifani yangilashga harakat qiling.
      </p>
      <button 
        onClick={() => window.location.reload()}
        style={{ 
          padding: '12px 24px', 
          background: '#34d399', 
          color: '#000', 
          border: 'none', 
          borderRadius: '12px',
          fontWeight: 900,
          cursor: 'pointer'
        }}
      >
        Qayta yuklash
      </button>
    </div>
  );
}