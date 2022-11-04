// (A) FILES TO CACHE
const cName = "JSCalendar",
cFiles = [
  "assets/favicon.png",
  "assets/icon-512.png",
  "assets/maticon.woff2",
  "CB-manifest.json",
  "assets/js-calendar.css",
  "assets/js-calendar.js",
  "js-calendar.html"
];

// (B) CREATE/INSTALL CACHE
self.addEventListener("install", evt => evt.waitUntil(
  caches.open(cName)
  .then(cache => cache.addAll(cFiles))
  .catch(err => console.error(err))
));

// (C) LOAD FROM CACHE FIRST, FALLBACK TO NETWORK IF NOT FOUND
self.addEventListener("fetch", evt => evt.respondWith(
  caches.match(evt.request).then(res => res || fetch(evt.request))
));