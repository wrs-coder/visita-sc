// CORS para o aplicativo instalado (casca local no Capacitor) falar com o
// servidor publicado. Somente origens conhecidas são autorizadas.

const ALLOWED_ORIGINS = new Set([
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
  "ionic://localhost",
  "https://www.visitasc.com.br",
  "https://visitasc.com.br",
  "https://visita-sc.lovable.app",
]);

export function isAllowedOrigin(origin: string | null): origin is string {
  return !!origin && ALLOWED_ORIGINS.has(origin);
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, content-type, accept, x-requested-with, x-visita-sc-transport, x-tsr-serverfn, x-tsr-redirect, x-tss-serialized, x-tss-raw, x-tss-raw-response, x-tss-context",
    "Access-Control-Expose-Headers":
      "x-tsr-redirect, x-tss-serialized, x-tss-raw, x-tss-raw-response, x-tss-context, x-visita-sc-server, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
