const CACHE_NAME = "sum-runner-cache-v2";
const urlsToCache = [
  "/",
  "/index.html?v=2",
  "/css/style.css?v=2",
  "/js/main.js?v=2",
  "/manifest.json?v=2",
  "/assets/favicon.png?v=2",
  "/assets/icon-192x192.png?v=2",
  "/assets/icon-512x512.png?v=2",
];

// Install event
self.addEventListener("install", (event) => {
  self.skipWaiting(); //
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Activate event (cleanup old caches + take control)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
  );
  self.clients.claim(); //
});

// Fetch event
self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith("http")) return; // ignore WS, chrome://, etc.

  event.respondWith(
    caches.match(event.request).then((cachedRes) => {
      if (cachedRes) return cachedRes;

      return fetch(event.request)
        .then((networkRes) => {
          // Cache successful GET responses
          if (event.request.method === "GET" && networkRes.status === 200) {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkRes.clone());
              return networkRes;
            });
          }
          return networkRes;
        })
        .catch(() => {
          // Offline fallbacks
          if (event.request.destination === "image") {
            return caches.match("/assets/icon-192x192.png?v=2");
          }
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("/index.html?v=2");
          }
        });
    })
  );
});
