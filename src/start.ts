import { createStart, createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { getApiOrigin, isNativeApp, nextApiOrigin, resolveApiUrl } from "@/lib/api-origin";
import { corsHeaders, isAllowedOrigin } from "@/lib/cors";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Autoriza as chamadas vindas do aplicativo instalado (casca local).
const corsMiddleware = createMiddleware().server(async ({ next }) => {
  const request = getRequest();
  const origin = request?.headers.get("origin") ?? null;

  if (!isAllowedOrigin(origin)) {
    return next();
  }

  const headers = corsHeaders(origin);

  if (request?.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const result = await next();
  if (result instanceof Response) {
    const merged = new Headers(result.headers);
    for (const [key, value] of Object.entries(headers)) merged.set(key, value);
    return new Response(result.body, {
      status: result.status,
      statusText: result.statusText,
      headers: merged,
    });
  }
  return result;
});

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function withOrigin(input: RequestInfo | URL, origin: string): RequestInfo | URL {
  const raw = requestUrl(input);
  const absolute = /^https?:\/\//i.test(raw)
    ? raw.replace(/^https?:\/\/[^/]+/i, origin)
    : resolveApiUrl(raw, origin);
  if (typeof input === "string" || input instanceof URL) return absolute;
  return new Request(absolute, input);
}

// No aplicativo nativo o app roda local; as chamadas de dados vão para o
// domínio publicado escolhido dinamicamente, com uma nova tentativa na
// próxima origem quando a rede falha.
const apiFetch: typeof fetch = async (input, init) => {
  if (!isNativeApp()) return fetch(input, init);

  const nativeInit: RequestInit = { ...init, credentials: "omit" };
  try {
    return await fetch(withOrigin(input, getApiOrigin()), nativeInit);
  } catch (error) {
    const fallback = nextApiOrigin();
    try {
      return await fetch(withOrigin(input, fallback), nativeInit);
    } catch {
      throw error;
    }
  }
};

export const startInstance = createStart(() => ({
  requestMiddleware: [corsMiddleware, errorMiddleware],
  functionMiddleware: [attachSupabaseAuth],
  serverFns: { fetch: apiFetch },
}));
