// Analisador — modo sem internet próprio (escopo só /ferramentas/Analisador/).
// Independente do public/sw.js do app VisitaSC. Página: rede primeiro; arquivos: cópia + atualização.
const CACHE = "analisador-v8";
const PAGE = "/ferramentas/Analisador/";
const FILES = [
  PAGE,
  "/ferramentas/Analisador/style.css",
  "/ferramentas/Analisador/analyzer.js",
  "/ferramentas/Analisador/app.js",
  "/ferramentas/Analisador/manifest.webmanifest",
  "/ferramentas/Analisador/icon-192.png",
  "/ferramentas/Analisador/icon-512.png",
  "/ferramentas/S21_Export/style.css",
  "/ferramentas/S21_Export/pdf-lib.min.js",
  "/ferramentas/S21_Export/converter.js",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("analisador-") && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(PAGE, cp)); }
      return r;
    }).catch(() => caches.match(PAGE)));
    return;
  }
  if (!FILES.includes(url.pathname)) return;
  e.respondWith(caches.match(url.pathname).then((hit) => {
    const net = fetch(req).then((r) => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(url.pathname, cp)); }
      return r;
    });
    return hit ? (net.catch(() => hit), hit) : net;
  }));
});
