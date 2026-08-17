const CACHE_NAME = "statuscraft-ai-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./quotes.json",
  "./manifest.json",
  "./icon.svg"
];

// ------------------------------------
// Install — app shell cache karo
// ------------------------------------

self.addEventListener("install", function (event) {

  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );

  self.skipWaiting();
});


// ------------------------------------
// Activate — purane caches saaf karo
// ------------------------------------

self.addEventListener("activate", function (event) {

  event.waitUntil(
    caches.keys().then(function (keys) {

      return Promise.all(
        keys
          .filter(function (key) {
            return key !== CACHE_NAME;
          })
          .map(function (key) {
            return caches.delete(key);
          })
      );
    })
  );

  self.clients.claim();
});


// ------------------------------------
// Fetch — cache-first strategy
// ------------------------------------

self.addEventListener("fetch", function (event) {

  event.respondWith(
    caches.match(event.request).then(function (cached) {

      return (
        cached ||
        fetch(event.request).catch(function () {
          return caches.match("./index.html");
        })
      );
    })
  );
});
