import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Dynamically generate high-quality PNG favicons from the SVG for absolute compatibility across browsers
function initializeFavicons() {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const sizes = [32, 180, 192];
    sizes.forEach(size => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // For crisp crisp renderings of paths
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, size, size);
        try {
          const dataUrl = canvas.toDataURL('image/png');
          if (size === 32) {
            let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']:not([rel='apple-touch-icon'])") as HTMLLinkElement;
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.head.appendChild(link);
            }
            link.type = 'image/png';
            link.href = dataUrl;
          } else if (size === 180) {
            let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
            if (!appleLink) {
              appleLink = document.createElement('link');
              appleLink.rel = 'apple-touch-icon';
              document.head.appendChild(appleLink);
            }
            appleLink.href = dataUrl;
          }
        } catch (e) {
          console.error('Error generating dynamic PNG favicon:', e);
        }
      }
    });
  };
  img.src = '/icon.svg?v=2';
}

if (typeof window !== 'undefined') {
  initializeFavicons();
}

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

