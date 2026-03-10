import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';

import App from '@/App';
import { AuthProvider } from '@/lib/auth';
import { queryClient } from '@/lib/query-client';
import { registerServiceWorker } from '@/lib/service-worker';
import { ThemeProvider } from '@/lib/theme';
import '@/styles/index.css';

function applyInitialThemeClass() {
  if (typeof window === 'undefined') return;

  const stored = window.localStorage.getItem('ortaq:theme-mode');
  let resolved = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';

  if (resolved === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  const isDark = resolved === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.body.classList.toggle('dark', isDark);
  document.documentElement.setAttribute('data-theme', resolved);
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

applyInitialThemeClass();

void registerServiceWorker();

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
