// Service Worker — Visita SC PWA
// Strategy:
//  - HTML navigations: NetworkFirst (so updates ship without stale shells)
//  - Same-origin static assets (JS/CSS/img/fonts): StaleWhileRevalidate
//  - Supabase API responses: NetworkFirst with cache fallback (offline read of last-loaded data)
//  - Skips cross-origin third parties

const VERSION = "v2";
const STATIC_CACHE = `static-${VERSION}`;
const HTML_CACHE = `html-${VERSION}`;
const API_CACHE = `api-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) =>
      c.addAll(["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"]).catch(() => undefined),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, HTML_CACHE, API_CACHE].includes(k))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isSupabaseRequest(url) {
  return /\.supabase\.(co|in)$/.test(url.hostname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // HTML navigations → NetworkFirst
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(HTML_CACHE);
          cache.put("/", fresh.clone()).catch(() => undefined);
          return fresh;
        } catch {
          const cache = await caches.open(HTML_CACHE);
          const cached = (await cache.match(req)) || (await cache.match("/"));
          return cached || new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })(),
    );
    return;
  }

  // Supabase REST → NetworkFirst (last-known data offline)
  if (isSupabaseRequest(url) && url.pathname.startsWith("/rest/")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(API_CACHE);
          cache.put(req, fresh.clone()).catch(() => undefined);
          return fresh;
        } catch {
          const cache = await caches.open(API_CACHE);
          const cached = await cache.match(req);
          if (cached) return cached;
          throw new Error("offline-no-cache");
        }
      })(),
    );
    return;
  }

  // Same-origin static assets → StaleWhileRevalidate
  if (sameOrigin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === "basic") {
              cache.put(req, res.clone()).catch(() => undefined);
            }
            return res;
          })
          .catch(() => null);
        return cached || (await network) || new Response("Offline", { status: 503 });
      })(),
    );
  }
});
