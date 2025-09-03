const CACHE_NAME = "sum-runner-cache-v1";
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
  self.skipWaiting(); // Activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Activate event (cleanup old caches if needed)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedRes) => {
      return (
        cachedRes ||
        fetch(event.request).catch((err) => {
          console.warn("Fetch failed for:", event.request.url, err);
          return new Response("Resource not available", { status: 404 });
        })
      );
    })
  );
});

// Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedRes) => {
      // Serve cached response if available
      if (cachedRes) return cachedRes;

      // Otherwise fetch from network
      return fetch(event.request)
        .then((networkRes) => {
          // Optionally cache new resources dynamically
          return caches.open(CACHE_NAME).then((cache) => {
            // Only cache GET requests that succeed
            if (event.request.method === "GET" && networkRes.status === 200) {
              cache.put(event.request, networkRes.clone());
            }
            return networkRes;
          });
        })
        .catch(() => {
          // Fallback for images
          if (event.request.destination === "image") {
            return caches.match("/assets/icon_192x192.png");
          }
          // Fallback for HTML pages
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("/index.html");
          }
        });
    })
  );
});
