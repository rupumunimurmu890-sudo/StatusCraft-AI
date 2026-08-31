const CACHE_NAME = "statuscraft-ai-v2";

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
// Fetch
//
// - /api/ requests (AI quote/background) → hamesha
//   seedha network se, kabhi cache nahi (fresh AI
//   response chahiye har baar, aur POST requests
//   waise bhi cache-safe nahi hote)
//
// - Baaki sab (app shell: html/css/js/json) →
//   network-first: pehle internet se naya version
//   fetch karne ki koshish, mil gaya toh cache bhi
//   update kar do. Internet na ho tabhi cache se
//   fallback do. Isse future updates automatically
//   milte rahenge, dobara version bump ki zaroorat
//   nahi padegi.
// ------------------------------------

self.addEventListener("fetch", function (event) {

  const requestUrl = new URL(event.request.url);

  // API calls — service worker inhe touch hi na kare
  if (requestUrl.pathname.startsWith("/api/")) {
    return;
  }

  // Sirf GET requests cache karo
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function (networkResponse) {

        const responseClone = networkResponse.clone();

        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseClone);
        });

        return networkResponse;
      })
      .catch(function () {

        return caches.match(event.request).then(function (cached) {
          return cached || caches.match("./index.html");
        });
      })
  );
});
