import { createStart, createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import {
  API_REQUEST_TIMEOUT_MS,
  apiOriginAttempts,
  getApiOrigin,
  invalidateApiOrigin,
  isNativeApp,
  resolveApiUrl,
  resolveBestApiOrigin,
  setApiOrigin,
} from "@/lib/api-origin";
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

const INCOMPATIBLE_SERVER_FUNCTION = "VISITASC_SERVER_FN_INCOMPATIBLE";

function isServerFunctionRequest(input: RequestInfo | URL, init?: RequestInit): boolean {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  return headers.get("x-tsr-serverfn") === "true";
}

async function isIncompatibleServerFunctionResponse(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  response: Response,
): Promise<boolean> {
  if (!isServerFunctionRequest(input, init) || response.status < 500) return false;
  const type = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!type.includes("text/html")) return false;
  const body = await response.clone().text().catch(() => "");
  return /this page didn't load|<!doctype html|<html/i.test(body);
}

// No aplicativo nativo o app roda local; as chamadas de dados vão para o
// domínio publicado escolhido dinamicamente, com uma nova tentativa na
// próxima origem quando a rede falha.
const apiFetch: typeof fetch = async (input, init) => {
  if (!isNativeApp()) return fetch(input, init);

  // Antes de qualquer RPC, tenta confirmar qual publicação está servindo o app.
  // Se o teste não conseguir decidir (aparelhos onde ele falha mesmo com
  // internet), NÃO desistimos: tentamos de verdade cada endereço publicado.
  const resolvedOrigin = await resolveBestApiOrigin().catch(() => null);
  const attempts = resolvedOrigin
    ? apiOriginAttempts(resolvedOrigin)
    : apiOriginAttempts(getApiOrigin());

  let firstError: unknown = null;
  for (const origin of attempts) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
    const abortFromCaller = () => controller.abort();
    init?.signal?.addEventListener("abort", abortFromCaller, { once: true });
    try {
      const response = await fetch(withOrigin(input, origin), {
        ...init,
        credentials: "omit",
        signal: controller.signal,
      });
      if (await isIncompatibleServerFunctionResponse(input, init, response)) {
        throw new Error(INCOMPATIBLE_SERVER_FUNCTION);
      }
      setApiOrigin(origin);
      return response;
    } catch (error) {
      firstError ??= error;
      invalidateApiOrigin();
    } finally {
      clearTimeout(timer);
      init?.signal?.removeEventListener("abort", abortFromCaller);
    }
  }

  throw firstError ?? new TypeError("Nenhum servidor do Visita SC está acessível");
};

export const startInstance = createStart(() => ({
  requestMiddleware: [corsMiddleware, errorMiddleware],
  functionMiddleware: [attachSupabaseAuth],
  serverFns: { fetch: apiFetch },
}));
