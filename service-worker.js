const VERSION = '2026.10.01';
const SHELL_CACHE = '3hc-shell-' + VERSION;
const RUNTIME_CACHE = '3hc-runtime-' + VERSION;

const SHELL_ASSETS = [
  './',
  './index.html',
  './employee.html',
  './offline.html',
  './manifest.webmanifest',
  './styles/main.css',
  './styles/print.css',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(function(c) { return c.addAll(SHELL_ASSETS).catch(function(){}); })
      .then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== SHELL_CACHE && k !== RUNTIME_CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.hostname.indexOf('script.google.com') !== -1) return;
  if (url.hostname.indexOf('script.googleusercontent.com') !== -1) return;
  if (url.hostname.indexOf('googleapis.com') !== -1) return;

  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req).then(function(res) {
        var copy = res.clone();
        caches.open(RUNTIME_CACHE).then(function(c) { c.put(req, copy); });
        return res;
      }).catch(function() {
        return caches.match(req).then(function(c) {
          return c || caches.match('./offline.html');
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function(c) {
      if (c) return c;
      return fetch(req).then(function(res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(RUNTIME_CACHE).then(function(x) { x.put(req, copy); });
        }
        return res;
      });
    })
  );
});

self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
