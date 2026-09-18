import { CapacitorHttp, type HttpOptions, type HttpResponse } from "@capacitor/core";

import { API_ORIGINS, API_REQUEST_TIMEOUT_MS } from "./api-origin";

export const NATIVE_HTTP_BUNDLE_MARKER = "VISITASC_NATIVE_HTTP_V1";

type NativeRequester = (options: HttpOptions) => Promise<HttpResponse>;

const ALLOWED_API_HOSTS = new Set(API_ORIGINS.map((origin) => new URL(origin).host));
const BODYLESS_METHODS = new Set(["GET", "HEAD"]);
const BLOCKED_REQUEST_HEADERS = new Set(["content-length", "cookie", "host", "origin"]);

export function isAllowedNativeApiUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_API_HOSTS.has(url.host);
  } catch {
    return false;
  }
}

function responseBody(data: unknown): BodyInit | null {
  if (data == null) return null;
  if (typeof data === "string") return data;
  return JSON.stringify(data);
}

async function toNativeOptions(input: RequestInfo | URL, init?: RequestInit): Promise<HttpOptions> {
  const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
  if (!isAllowedNativeApiUrl(request.url)) {
    throw new TypeError("Destino HTTPS não autorizado para o aplicativo");
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (!BLOCKED_REQUEST_HEADERS.has(key.toLowerCase())) headers[key] = value;
  });
  headers["x-visita-sc-transport"] = NATIVE_HTTP_BUNDLE_MARKER;

  const method = request.method.toUpperCase();
  const data = BODYLESS_METHODS.has(method) ? undefined : await request.clone().text();
  return {
    url: request.url,
    method,
    headers,
    data,
    connectTimeout: API_REQUEST_TIMEOUT_MS,
    readTimeout: API_REQUEST_TIMEOUT_MS,
    disableRedirects: false,
    responseType: "text",
  };
}

export type NativeHttpResult = { response: Response; finalUrl: string };

export function createNativeHttpRequest(requester: NativeRequester) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<NativeHttpResult> => {
    if (init?.signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
    const result = await requester(await toNativeOptions(input, init));
    if (!isAllowedNativeApiUrl(result.url)) {
      throw new TypeError("O servidor redirecionou para um destino não autorizado");
    }
    return {
      response: new Response(responseBody(result.data), {
        status: result.status,
        headers: result.headers,
      }),
      finalUrl: result.url,
    };
  };
}

export const nativeHttpRequest = createNativeHttpRequest((options) => CapacitorHttp.request(options));