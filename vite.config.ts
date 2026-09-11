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
// APP_SHELL=1 ativa o prerender da casca estática (SPA shell) usada pelo APK/AAB.
// Fora desse modo o site continua 100% SSR, exatamente como hoje.
const appShell = process.env["APP_SHELL"] === "1";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    ...(appShell
      ? {
          spa: {
            enabled: true,
            maskPath: "/",
            prerender: {
              enabled: true,
              outputPath: "/_shell",
              crawlLinks: false,
              retryCount: 1,
            },
          },
        }
      : {}),
  },
});
