// Project Falcon POS Service Worker
const CACHE_NAME = "falcon-pos-v5";

const STATIC_PRECACHE = [
  "/pos",
  "/manifest.webmanifest",
  "/falcon-icon.png",
  "/falcon-logo.png",
  "/favicon.ico",
  "/favicon.png",
  "/favicon.svg",
  "/icons/icon.svg",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn("SW precache warning:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Don't intercept Supabase API mutations or auth endpoints directly
  if (url.hostname.includes("supabase.co") || url.pathname.startsWith("/api/auth")) {
    return;
  }

  // Next.js static files (_next/static) -> Cache First, Network Fallback
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Navigation / HTML -> network-first, and CACHE each successful load. That is what actually keeps
  // offline working across redeploys: the cached shell always matches the JS chunks fetched in the
  // same visit (chunks are cache-first stored below). A fixed precache instead goes stale after a
  // deploy and points at removed chunks, which is what broke offline. Offline: serve the cached page
  // (or the last cached /pos shell).
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          request.mode === "navigate" &&
          networkResponse &&
          networkResponse.status === 200 &&
          !networkResponse.redirected
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const posFallback = await caches.match("/pos");
          if (posFallback) return posFallback;
        }
        return new Response("Offline", {
          status: 503,
          statusText: "Offline",
          headers: { "Content-Type": "text/plain" },
        });
      })
  );
});
