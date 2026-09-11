// Endpoint mínimo de "está no ar?" usado pelo aplicativo instalado para
// escolher qual domínio publicado responde. Não devolve dados nem exige
// autenticação — apenas confirma que o servidor está acessível e autoriza
// explicitamente a chamada vinda da casca local (Capacitor).
import { createFileRoute } from "@tanstack/react-router";

import { corsHeaders, isAllowedOrigin } from "@/lib/cors";

function headersFor(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  const base: Record<string, string> = {
    "cache-control": "no-store",
    Vary: "Origin",
  };
  if (isAllowedOrigin(origin)) {
    return { ...base, ...corsHeaders(origin) };
  }
  return base;
}

export const Route = createFileRoute("/api/public/ping")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: headersFor(request) }),
      HEAD: async ({ request }) =>
        new Response(null, { status: 204, headers: headersFor(request) }),
      GET: async ({ request }) =>
        new Response(null, { status: 204, headers: headersFor(request) }),
    },
  },
});
