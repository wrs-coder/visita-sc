import { Extension } from "@tiptap/core";

/**
 * Tamanhos permitidos (px). Mantidos em passos de 2 para caber num
 * Select compacto e cobrir leitura confortável em telas móveis.
 */
export const FONT_SIZE_OPTIONS = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30] as const;
export type FontSizePx = (typeof FONT_SIZE_OPTIONS)[number];

const ALLOWED = new Set<number>(FONT_SIZE_OPTIONS as unknown as number[]);

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      /** Aplica font-size (px) como atributo do mark textStyle na seleção. */
      setFontSize: (px: number) => ReturnType;
      /** Remove o atributo font-size do mark textStyle. */
      unsetFontSize: () => ReturnType;
    };
  }
}

/**
 * Extensão isolada que adiciona o atributo `fontSize` ao mark `textStyle`
 * (fornecido por @tiptap/extension-text-style). Emite <span style="font-size:Npx">
 * apenas na seleção — nunca altera o bloco (paragraph/heading).
 */
export const FontSize = Extension.create({
  name: "fontSize",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null as string | null,
            parseHTML: (element) => {
              const raw = (element as HTMLElement).style?.fontSize;
              if (!raw) return null;
              const m = /^(\d+(?:\.\d+)?)px$/i.exec(raw.trim());
              if (!m) return null;
              const n = Math.round(parseFloat(m[1]));
              return ALLOWED.has(n) ? `${n}px` : null;
            },
            renderHTML: (attrs) => {
              const v = (attrs as { fontSize?: string | null }).fontSize;
              if (!v) return {};
              return { style: `font-size: ${v}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (px: number) =>
        ({ chain }) => {
          const n = Math.round(Number(px));
          if (!ALLOWED.has(n)) return false;
          return chain().setMark("textStyle", { fontSize: `${n}px` }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});

export default FontSize;
