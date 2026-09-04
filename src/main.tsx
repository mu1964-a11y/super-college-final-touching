import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';
import { safeLocalStorage } from './utils/safeStorage';

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const reasonStr = reason ? String(reason) : '';
  const reasonMsg = reason && typeof reason === 'object' ? (reason.message || reason.error_description || reason.error || '') : '';
  const combined = (reasonStr + ' ' + reasonMsg).toLowerCase();
  
  if (combined.includes('refresh token') || combined.includes('refresh_token') || combined.includes('session_not_found') || combined.includes('invalid_grant')) {
    event.preventDefault(); // Suppress the console error
    console.warn("[Session Guard] unhandledrejection triggered clearing for: ", combined);
    safeLocalStorage.removeItem('scj-auth');
    // Also remove the generic supabase storage items if any exist
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('scj-auth') || key.includes('sb-'))) {
        localStorage.removeItem(key);
      }
    }
    window.location.reload();
  }
});

window.addEventListener('error', (event) => {
  const errMsg = event.message ? String(event.message) : '';
  const errObj = event.error;
  const errObjMsg = errObj && typeof errObj === 'object' ? (errObj.message || errObj.error_description || '') : '';
  const combined = (errMsg + ' ' + errObjMsg).toLowerCase();
  
  if (combined.includes('refresh token') || combined.includes('refresh_token') || combined.includes('session_not_found') || combined.includes('invalid_grant')) {
    event.preventDefault(); // Suppress the console error
    console.warn("[Session Guard] error event triggered clearing for: ", combined);
    safeLocalStorage.removeItem('scj-auth');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('scj-auth') || key.includes('sb-'))) {
        localStorage.removeItem(key);
      }
    }
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
