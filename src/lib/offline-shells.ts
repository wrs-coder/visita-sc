// Pré-carga das "shells" de cada rota do app: HTML + assets (JS/CSS/fontes/imagens)
// referenciados pelo HTML. Salva diretamente nos caches usados pelo Service Worker
// para que, offline, a navegação para qualquer rota cacheada funcione.
//
// Read-only do ponto de vista do backend (apenas GETs same-origin do app estático).
// Falhas individuais nunca abortam o fluxo geral.

const HTML_CACHE_FALLBACKS = ["html-v3", "html-v2"];
const STATIC_CACHE_FALLBACKS = ["static-v3", "static-v2"];

// Todas as rotas internas que devem ficar disponíveis offline.
export const OFFLINE_ROUTES = [
  "/",
  "/dashboard",
  "/cronograma",
  "/resumo-semana",
  "/refeicoes",
  "/transporte",
  "/reunioes-de-campo",
  "/reunioes-discursos",
  "/escala",
  "/checklist",
  "/checklist-modelos",
  "/modelos",
  "/modelo-reunioes-de-campo",
  "/modelo-reunioes-discursos",
  "/notas",
  "/perfil",
  "/configuracoes",
  "/congregacoes",
  "/visitante/painel",
];

async function openHtmlCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  // Usa o primeiro nome disponível; se nenhum existir, cria o atual (v3).
  for (const name of HTML_CACHE_FALLBACKS) {
    try {
      const has = await caches.has(name);
      if (has) return await caches.open(name);
    } catch {
      /* ignore */
    }
  }
  try {
    return await caches.open(HTML_CACHE_FALLBACKS[0]);
  } catch {
    return null;
  }
}

async function openStaticCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  for (const name of STATIC_CACHE_FALLBACKS) {
    try {
      const has = await caches.has(name);
      if (has) return await caches.open(name);
    } catch {
      /* ignore */
    }
  }
  try {
    return await caches.open(STATIC_CACHE_FALLBACKS[0]);
  } catch {
    return null;
  }
}

function extractAssetUrls(html: string): string[] {
  const urls = new Set<string>();
  // <link href="..."> e <script src="...">
  const re = /(?:href|src)=["']([^"']+\.(?:js|mjs|css|woff2?|ttf|otf|png|svg|jpe?g|webp|ico|json))["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const u = m[1];
    if (u.startsWith("/") || u.startsWith(self.location.origin)) urls.add(u);
  }
  return [...urls];
}

export type ShellProgress = {
  step: number;
  total: number;
  route: string;
};

export async function prefetchRouteShells(opts?: {
  signal?: AbortSignal;
  onProgress?: (p: ShellProgress) => void;
  routes?: string[];
}): Promise<{ pages: number; assets: number; errors: number }> {
  if (typeof window === "undefined") return { pages: 0, assets: 0, errors: 0 };

  const list = opts?.routes ?? OFFLINE_ROUTES;
  const htmlCache = await openHtmlCache();
  const staticCache = await openStaticCache();

  let pages = 0;
  let assets = 0;
  let errors = 0;
  const seenAssets = new Set<string>();
  const total = list.length;

  for (let i = 0; i < list.length; i++) {
    if (opts?.signal?.aborted) break;
    const route = list[i];
    opts?.onProgress?.({ step: i, total, route });
    try {
      const res = await fetch(route, {
        credentials: "same-origin",
        headers: { Accept: "text/html" },
        cache: "no-store",
      });
      if (!res.ok) {
        errors++;
        continue;
      }
      const clone = res.clone();
      const html = await res.text();
      if (htmlCache) {
        try {
          await htmlCache.put(route, clone);
        } catch {
          /* quota */
        }
      }
      pages++;

      const urls = extractAssetUrls(html).filter((u) => !seenAssets.has(u));
      await Promise.all(
        urls.map(async (u) => {
          seenAssets.add(u);
          try {
            const a = await fetch(u, { credentials: "same-origin", cache: "no-store" });
            if (!a.ok) return;
            if (staticCache) await staticCache.put(u, a.clone());
            assets++;
          } catch {
            /* ignora asset individual */
          }
        }),
      );
    } catch {
      errors++;
    }
    opts?.onProgress?.({ step: i + 1, total, route });
    // Cede o thread para a UI.
    await new Promise((r) => setTimeout(r, 5));
  }

  return { pages, assets, errors };
}
