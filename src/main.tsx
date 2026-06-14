import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register service worker for full offline PWA capabilities
if ('serviceWorker' in navigator && ((import.meta as any).env?.PROD || window.location.hostname !== 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ForgeYours ServiceWorker registered successfully with scope: ', registration.scope);
      })
      .catch((err) => {
        console.error('ForgeYours ServiceWorker registration failed: ', err);
      });
  });
}

