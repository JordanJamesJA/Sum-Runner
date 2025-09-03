const CACHE_NAME = "sum-runner-cache-v2"; // bump this when you deploy
const urlsToCache = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/main.js",
  "/manifest.json",
  "/assets/favicon.png",
  "/assets/icon-192x192.png",
  "/assets/icon-512x512.png",
];

// Install event
self.addEventListener("install", (event) => {
  self.skipWaiting(); // 🚀 activate immediately
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
  self.clients.claim(); // 🚀 control all pages right away
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
            return caches.match("/assets/icon-192x192.png");
          }
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("/index.html");
          }
        });
    })
  );
});
