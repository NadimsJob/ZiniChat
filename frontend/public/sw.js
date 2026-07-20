self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Tell the active service worker to take control of the page immediately.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Basic pass-through fetch to satisfy PWA requirements
  // We can add actual caching strategies here later if needed.
  event.respondWith(
    fetch(event.request).catch((err) => {
      // In a full PWA, we would return a cached offline page here
      console.error('[SW] Fetch failed:', err);
      throw err;
    })
  );
});
