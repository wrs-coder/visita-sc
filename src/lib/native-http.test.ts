import { describe, expect, it, vi } from "vitest";

import { createNativeHttpRequest, isAllowedNativeApiUrl } from "./native-http";

describe("transporte HTTPS nativo", () => {
  it("restringe chamadas aos servidores aprovados", () => {
    expect(isAllowedNativeApiUrl("https://visitasc.com.br/_serverFn/abc")).toBe(true);
    expect(isAllowedNativeApiUrl("http://visitasc.com.br/_serverFn/abc")).toBe(false);
    expect(isAllowedNativeApiUrl("https://example.com/_serverFn/abc")).toBe(false);
  });

  it("preserva método, autenticação, corpo e resposta TanStack", async () => {
    const requester = vi.fn(async () => ({
      status: 200,
      headers: { "content-type": "application/x-tss-serialized" },
      url: "https://visitasc.com.br/_serverFn/abc",
      data: "resposta-serializada",
    }));
    const request = createNativeHttpRequest(requester);
    const { response, finalUrl } = await request("https://visitasc.com.br/_serverFn/abc", {
      method: "POST",
      headers: { Authorization: "Bearer teste", "x-tsr-serverfn": "true" },
      body: "corpo-serializado",
    });

    expect(requester).toHaveBeenCalledWith(expect.objectContaining({
      method: "POST",
      data: "corpo-serializado",
      headers: expect.objectContaining({ authorization: "Bearer teste", "x-tsr-serverfn": "true" }),
      disableRedirects: false,
    }));
    expect(finalUrl).toBe("https://visitasc.com.br/_serverFn/abc");
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("resposta-serializada");
  });

  it("aceita redirecionamento somente entre servidores aprovados", async () => {
    const allowed = createNativeHttpRequest(async () => ({
      status: 204,
      headers: {},
      url: "https://visitasc.com.br/api/public/ping",
      data: null,
    }));
    await expect(allowed("https://www.visitasc.com.br/api/public/ping")).resolves.toMatchObject({
      finalUrl: "https://visitasc.com.br/api/public/ping",
    });

    const blocked = createNativeHttpRequest(async () => ({
      status: 200,
      headers: {},
      url: "https://example.com/roubo",
      data: "",
    }));
    await expect(blocked("https://visitasc.com.br/api/public/ping")).rejects.toThrow("não autorizado");
  });

  it("repassa timeout e erro HTTP sem transformar em sucesso", async () => {
    const requester = vi.fn(async () => ({
      status: 503,
      headers: { "content-type": "text/plain" },
      url: "https://visitasc.com.br/_serverFn/abc",
      data: "indisponível",
    }));
    const { response } = await createNativeHttpRequest(requester)(
      "https://visitasc.com.br/_serverFn/abc",
    );
    expect(requester).toHaveBeenCalledWith(expect.objectContaining({
      connectTimeout: 12000,
      readTimeout: 12000,
    }));
    expect(response.status).toBe(503);
  });
});