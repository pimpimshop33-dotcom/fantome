// ── SW SUICIDE — se détruit et force rechargement ──────────
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => {
        clients.forEach(c => c.navigate(c.url + '?_sw_reset=' + Date.now()));
      })
  );
});

self.addEventListener('fetch', e => {
  return; // pass-through total, rien en cache
});
