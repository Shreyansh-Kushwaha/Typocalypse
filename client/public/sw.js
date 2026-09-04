/* Typocalypse service worker - offline shell, static asset cache, web push.
 * Plain JS, no build step. Bump CACHE when the precache list changes. */
const CACHE = 'typo-v1';
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(PRECACHE.map(url => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith('/assets/')) return true;
  if (url.pathname.startsWith('/fonts/')) return true;
  return /\.(png|svg|ico|woff2?|ttf|webmanifest)$/.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // API writes: network only
  const url = new URL(req.url);

  // App navigations: network first, offline fallback to the cached shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put('/index.html', res.clone())).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/index.html').then(hit => hit || caches.match('/')))
        .then(res => res || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })),
    );
    return;
  }

  // Hashed bundles, fonts, icons: cache first with runtime fill.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone())).catch(() => {});
        return res;
      })),
    );
    return;
  }
  // Everything else (API GETs, socket polling, cross-origin) goes to the network untouched.
});

self.addEventListener('push', (event) => {
  let data = { title: 'Typocalypse', body: '', url: '/dashboard', tag: 'typocalypse' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    try { data.body = event.data ? event.data.text() : ''; } catch { /* ignore */ }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url },
      renotify: true,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/dashboard', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
