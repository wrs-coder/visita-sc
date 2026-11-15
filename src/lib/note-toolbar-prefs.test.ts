// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { DEFAULT_TOOLBAR, normalizeToolbar, readToolbar, saveToolbar } from "./note-toolbar-prefs";

describe("barra fixa personalizada", () => {
  it("padrão: refazer, B I U, marca-texto, lista e recuos", () => {
    expect(DEFAULT_TOOLBAR).toEqual(["redo", "bold", "italic", "underline", "highlight", "bulletList", "outdent", "indent", "firstLine"]);
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
