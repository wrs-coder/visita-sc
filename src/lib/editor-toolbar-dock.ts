/**
 * Onde fica a barra do editor (padrão Samsung Notes / Notas do iPhone):
 * - "keyboard": colada em cima do teclado, enquanto se digita no editor;
 * - "bottom": no rodapé da área de texto (teclado fechado);
 * - "hidden": teclado aberto para outro campo (ex.: título), para não tapar.
 */
export type ToolbarDock = "keyboard" | "bottom" | "hidden";

export function toolbarDock(s: { keyboard: boolean; editorFocused: boolean; searchOpen: boolean }): ToolbarDock {
  if (!s.keyboard) return "bottom";
  if (s.editorFocused || s.searchOpen) return "keyboard";
  return "hidden";
}

/** Barra recolhida só quando o usuário escolheu recolher ("0"); o padrão é aberta. */
export function toolbarOpenFromStorage(raw: string | null): boolean {
  return raw !== "0";
}

/** Altura máxima do painel "⋯": no máximo 42% do que está visível e 300px. */
export function trayMaxHeight(visibleHeight: number): number {
  if (!visibleHeight || visibleHeight <= 0) return 300;
  return Math.max(160, Math.min(300, Math.round(visibleHeight * 0.42)));
}
