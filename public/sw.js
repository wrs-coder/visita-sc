// Service Worker — Visita SC PWA
// v3 — adiciona suporte a navegação offline para qualquer rota previamente
// pré-carregada (via Modo Offline), além de cache CacheFirst para assets
// versionados (/assets/*) que nunca mudam para um mesmo build.

const VERSION = "v3";
const STATIC_CACHE = `static-${VERSION}`;
const HTML_CACHE = `html-${VERSION}`;
const API_CACHE = `api-${VERSION}`;

// Exportado também via nome estável para o cliente (offline-shells.ts).
self.__CACHE_NAMES = { STATIC_CACHE, HTML_CACHE, API_CACHE };

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

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (msg && msg.type === "GET_CACHE_NAMES") {
    event.ports?.[0]?.postMessage({ STATIC_CACHE, HTML_CACHE, API_CACHE });
  }
  if (msg && msg.type === "SKIP_WAITING") self.skipWaiting();
});

function isSupabaseRequest(url) {
  return /\.supabase\.(co|in)$/.test(url.hostname);
}

function isHashedAsset(url) {
  // Vite emite arquivos versionados em /assets/<name>-<hash>.<ext>
  return url.pathname.startsWith("/assets/");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // HTML navigations → NetworkFirst, com fallback para QUALQUER HTML em cache
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(HTML_CACHE);
          // Salva tanto a URL específica quanto a raiz (fallback genérico).
          cache.put(req, fresh.clone()).catch(() => undefined);
          cache.put("/", fresh.clone()).catch(() => undefined);
          return fresh;
        } catch {
          const cache = await caches.open(HTML_CACHE);
          const exact = await cache.match(req);
          if (exact) return exact;
          // Busca global em qualquer cache (caso a pré-carga tenha salvo).
          const any = await caches.match(req);
          if (any) return any;
          const root = await cache.match("/");
          if (root) return root;
          return new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })(),
    );
    return;
  }

  // Supabase REST → NetworkFirst (último estado conhecido offline)
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

  if (!sameOrigin) return;

  // /assets/* hashed → CacheFirst (build-imutável)
  if (isHashedAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.status === 200) {
            cache.put(req, fresh.clone()).catch(() => undefined);
          }
          return fresh;
        } catch {
          // Última tentativa: qualquer cache pode ter o arquivo
          const any = await caches.match(req);
          if (any) return any;
          return new Response("Offline", { status: 503 });
        }
      })(),
    );
    return;
  }

  // Demais same-origin → StaleWhileRevalidate
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
      return cached || (await network) || (await caches.match(req)) || new Response("Offline", { status: 503 });
    })(),
  );
});
