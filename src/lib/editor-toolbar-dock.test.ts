import { describe, expect, it } from "vitest";
import { toolbarDock, toolbarOpenFromStorage, trayMaxHeight } from "./editor-toolbar-dock";

describe("barra do editor no rodapé (Samsung Notes)", () => {
  it("cola em cima do teclado enquanto se digita no editor", () => {
    expect(toolbarDock({ keyboard: true, editorFocused: true, searchOpen: false })).toBe("keyboard");
  });
  it("fica no rodapé da área de texto com o teclado fechado", () => {
    expect(toolbarDock({ keyboard: false, editorFocused: true, searchOpen: false })).toBe("bottom");
    expect(toolbarDock({ keyboard: false, editorFocused: false, searchOpen: false })).toBe("bottom");
  });
  it("some quando o teclado é de outro campo, como o título", () => {
    expect(toolbarDock({ keyboard: true, editorFocused: false, searchOpen: false })).toBe("hidden");
  });
  it("continua colada no teclado durante Localizar e substituir", () => {
    expect(toolbarDock({ keyboard: true, editorFocused: false, searchOpen: true })).toBe("keyboard");
  });
  it("barra começa aberta e só recolhe se o usuário recolheu", () => {
    expect(toolbarOpenFromStorage(null)).toBe(true);
    expect(toolbarOpenFromStorage("1")).toBe(true);
    expect(toolbarOpenFromStorage("0")).toBe(false);
  });
  it("painel ⋯ nunca passa de 42% da tela visível nem de 300px", () => {
    expect(trayMaxHeight(400)).toBe(168);
    expect(trayMaxHeight(900)).toBe(300);
    expect(trayMaxHeight(0)).toBe(300);
  });
});
