// (A) CREATE/INSTALL CACHE
self.addEventListener("install", evt => {
  self.skipWaiting();
  evt.waitUntil(
    caches.open("JSCalendar")
    .then(cache => cache.addAll([
      "assets/favicon.png",
      "assets/head-pwa-calendar.webp",
      "assets/ico-512.png",
      "assets/icomoon.woff2",
      "assets/js-calendar.css",
      "assets/js-calendar.js",
      "assets/js-calendar-db.js",
      "assets/sql-wasm.js",
      "assets/sql-wasm.wasm",
      "CB-manifest.json",
      "js-calendar.html"
    ]))
    .catch(err => console.error(err))
  );
});
 
// (B) CLAIM CONTROL INSTANTLY
self.addEventListener("activate", evt => self.clients.claim());

// (C) LOAD FROM CACHE FIRST, FALLBACK TO NETWORK IF NOT FOUND
self.addEventListener("fetch", evt => evt.respondWith(
  caches.match(evt.request).then(res => res || fetch(evt.request))
));