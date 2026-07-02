// Service Worker – Les Cryptes Éternelles
// La version change à chaque déploiement → auto-update automatique
const CACHE_NAME = 'cge-cache-v5';

const PRECACHE = [
  './index.html',
  './manifest.json',
  './images/inn-room.webp',
  './images/town.webp',
  './images/region.webp',
  './images/icon-192.png',
  './images/icon-512.png',
];

// Installation : mise en cache des ressources essentielles
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE);
    }).then(function() {
      return self.skipWaiting(); // active immédiatement
    })
  );
});

// Activation : supprime les anciens caches → force mise à jour
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim(); // prend le contrôle immédiatement
    })
  );
});

// Fetch : cache-first pour assets locaux, network-first pour tout le reste
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Toujours aller chercher le réseau pour index.html (pour avoir la dernière version).
  // cache:'no-store' est essentiel ici : sans ça, fetch() peut être servi par le cache
  // HTTP du navigateur lui-même (Cache-Control du serveur) sans jamais toucher le réseau,
  // ce qui annule complètement la stratégie "network-first" voulue.
  if (url.pathname.endsWith('index.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        return response;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Images et assets → cache-first
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        return response;
      });
    })
  );
});
