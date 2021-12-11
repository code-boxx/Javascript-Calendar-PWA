// (A) FILES TO CACHE
const cName = "MyCalendar",
cFiles = [
  "assets/favicon.png",
  "assets/icon-512.png",
  "assets/js-calendar.css",
  "assets/js-calendar.js",
  "assets/maticon.woff2",
  "js-calendar-manifest.json",
  "js-calendar.html"
];

// (B) CREATE/INSTALL CACHE
self.addEventListener("install", (evt) => {
  evt.waitUntil(
    caches.open(cName)
    .then((cache) => { return cache.addAll(cFiles); })
    .catch((err) => { console.error(err) })
  );
});

// (C) LOAD FROM CACHE, FALLBACK TO NETWORK IF NOT FOUND
self.addEventListener("fetch", (evt) => {
  evt.respondWith(
    caches.match(evt.request)
    .then((res) => { return res || fetch(evt.request); })
  );
});
