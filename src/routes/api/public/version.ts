// Endpoint público de versão: o aplicativo instalado consulta este endereço
// para saber se há uma versão mais nova na Play Store. Não expõe dados nem
// exige autenticação. Atualizar LATEST_APP_VERSION a cada release, junto com
// o bump em package.json / android/app/build.gradle / LoginForm.
import { createFileRoute } from "@tanstack/react-router";

import { corsHeaders, isAllowedOrigin } from "@/lib/cors";

export const LATEST_APP_VERSION = "4.2.16";
export const MIN_SUPPORTED_APP_VERSION = "4.2.0";

function headersFor(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  const base: Record<string, string> = {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
  if (isAllowedOrigin(origin)) {
    return { ...base, ...corsHeaders(origin) };
  }
  return base;
}

export const Route = createFileRoute("/api/public/version")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: headersFor(request) }),
      GET: async ({ request }) =>
        new Response(
          JSON.stringify({
            latest: LATEST_APP_VERSION,
            minSupported: MIN_SUPPORTED_APP_VERSION,
          }),
          { status: 200, headers: headersFor(request) },
        ),
    },
  },
});
