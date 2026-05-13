import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

window.addEventListener('unhandledrejection', (event) => {
  const errMsg = event.reason ? String(event.reason) : '';
  if (errMsg.toLowerCase().includes('refresh token')) {
    event.preventDefault(); // Suppress the console error
    window.localStorage.removeItem('scj-auth');
    // We can also trigger a local reload if desired, but this is enough to stop the error locally
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
