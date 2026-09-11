// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
//
// Observação (casca do app Android): o prerender oficial de SPA shell do
// TanStack Start não funciona com a saída Cloudflare/Nitro deste projeto —
// ele procura `dist/server/server.js`, que o preset cloudflare não gera.
// Por isso a casca é montada por `scripts/build-app-shell.mjs`, que roda a
// própria build (wrangler dev em dist/server) e valida o HTML resultante.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
