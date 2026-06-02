import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

window.addEventListener('unhandledrejection', (event) => {
  const errMsg = event.reason ? String(event.reason) : '';
  if (errMsg.toLowerCase().includes('refresh token') || errMsg.toLowerCase().includes('refresh_token')) {
    event.preventDefault(); // Suppress the console error
    try {
      window.localStorage.removeItem('scj-auth');
      window.location.reload();
    } catch (err) {
      console.warn("Unable to clear storage during reload rejection:", err);
    }
  }
});

window.addEventListener('error', (event) => {
  const errMsg = event.message ? String(event.message) : '';
  if (errMsg.toLowerCase().includes('refresh token') || errMsg.toLowerCase().includes('refresh_token')) {
    event.preventDefault(); // Suppress the console error
    try {
      window.localStorage.removeItem('scj-auth');
      window.location.reload();
    } catch (err) {
      console.warn("Unable to clear storage during reload error:", err);
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
