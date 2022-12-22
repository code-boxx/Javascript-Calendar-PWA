// (A) CREATE/INSTALL CACHE
self.addEventListener("install", evt => {
  self.skipWaiting();
  evt.waitUntil(
    caches.open("JSCalendar")
    .then(cache => cache.addAll([
      "assets/favicon.png",
      "assets/icon-512.png",
      "assets/HEAD-js-cal.jpg",
      "assets/maticon.woff2",
      "CB-manifest.json",
      "assets/js-calendar.css",
      "assets/js-calendar.js",
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