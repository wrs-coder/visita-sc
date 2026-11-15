// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { DEFAULT_TOOLBAR, normalizeToolbar, parseStoredToolbar, readToolbar, saveToolbar } from "./note-toolbar-prefs";

describe("barra fixa personalizada", () => {
  it("padrão: Aa, tamanho, B, cor da fonte, cor do fundo, alinhamento, lista e recuos", () => {
    expect(DEFAULT_TOOLBAR).toEqual(["style", "size", "bold", "fontColor", "bgColor", "align", "bulletList", "indent", "firstLine"]);
  });
  it("barra antiga (com Aa fixo) mantém a escolha e ganha o Aa na frente", () => {
    expect(parseStoredToolbar(["bold", "search"])).toEqual(["style", "bold", "search"]);
    expect(parseStoredToolbar({ v: 2, ids: ["bold"] })).toEqual(["bold"]);
    localStorage.setItem("visita-sc:note-toolbar:u.old", JSON.stringify(["table", "bold"]));
    expect(readToolbar("u.old")).toEqual(["style", "table", "bold"]);
  });
  it("ignora ids desconhecidos e repetidos; lista vazia volta ao padrão", () => {
    expect(normalizeToolbar(["bold", "xyz", "bold", "search"])).toEqual(["bold", "search"]);
    expect(normalizeToolbar([])).toEqual(DEFAULT_TOOLBAR);
    expect(normalizeToolbar("lixo")).toEqual(DEFAULT_TOOLBAR);
  });
  it("cada conta guarda a sua barra", () => {
    saveToolbar("u.a", ["search", "bold"]);
    saveToolbar("u.b", ["table"]);
    expect(readToolbar("u.a")).toEqual(["search", "bold"]);
    expect(readToolbar("u.b")).toEqual(["table"]);
    saveToolbar("u.a", null);
    expect(readToolbar("u.a")).toEqual(DEFAULT_TOOLBAR);
  });
});
