/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Perform a highly resilient web & service worker double-check update inspection.
 * By fetching the server index.html with cache-buster parameters, it inspects if code build hashes
 * have mutated, or if a service worker activation is waiting. If changes are detected, it clears
 * local cache registries and triggers a hot reload.
 */
export async function performPwaUpdateCheck(): Promise<{ updated: boolean; message: string }> {
  let hasUpdate = false;

  // 1. Detect if code bundle assets are different comparing head script and stylesheet links
  try {
    const response = await fetch('/index.html?cb=' + Date.now(), { cache: 'no-store' });
    if (response.ok) {
      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      
      const liveUrls = Array.from(doc.querySelectorAll('script, link[rel="stylesheet"]'))
        .map(el => el.getAttribute('src') || el.getAttribute('href'))
        .filter(Boolean);
        
      const currentUrls = Array.from(document.querySelectorAll('script, link[rel="stylesheet"]'))
        .map(el => el.getAttribute('src') || el.getAttribute('href'))
        .filter(Boolean);
        
      // If there is any script or stylesheet url on the fresh index.html that we don't currently have loaded
      for (const url of liveUrls) {
        if (url && !currentUrls.includes(url)) {
          hasUpdate = true;
          break;
        }
      }
    }
  } catch (err) {
    console.warn('[Update Check] Network content check failed:', err);
  }

  // 2. Query PWA service worker state for queued or installed workers
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        if (registration.waiting || registration.installing) {
          hasUpdate = true;
        }

        const prevWaiting = registration.waiting;
        // Trigger background check for service worker updates
        await registration.update();
        
        if (registration.waiting && registration.waiting !== prevWaiting) {
          hasUpdate = true;
        }
      }
    } catch (e) {
      console.warn('[Update Check] Service worker registry access issue:', e);
    }
  }

  if (hasUpdate) {
    try {
      // Clear caches to drop any cached stale files immediately
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheKeys = await caches.keys();
        for (const key of cacheKeys) {
          await caches.delete(key);
        }
      }
    } catch (cacheErr) {
      console.error('[Update Check] Cache deletion issue:', cacheErr);
    }
    return { updated: true, message: 'Update complete!' };
  }

  return { updated: false, message: 'Latest version updates' };
}
