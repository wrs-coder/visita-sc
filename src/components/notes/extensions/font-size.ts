import { Extension } from "@tiptap/core";

/**
 * Tamanhos permitidos (px). Passos de 2, cobrindo leitura confortável em telas móveis.
 */
export const FONT_SIZE_OPTIONS = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30] as const;
export type FontSizePx = (typeof FONT_SIZE_OPTIONS)[number];

const ALLOWED = new Set<number>(FONT_SIZE_OPTIONS as unknown as number[]);

/** Normaliza um valor cru (número ou "Npx") num "Npx" válido ou null. */
export function normalizeFontSize(input: string | number | null | undefined): string | null {
  if (input == null) return null;
  const raw = typeof input === "number" ? String(input) : input.trim();
  const m = /^(\d+(?:\.\d+)?)(?:px)?$/i.exec(raw);
  if (!m) return null;
  const n = Math.round(parseFloat(m[1]));
  return ALLOWED.has(n) ? `${n}px` : null;
}

/**
 * Extensão isolada que adiciona o atributo `fontSize` ao mark `textStyle`
 * (fornecido por @tiptap/extension-text-style). Emite <span style="font-size:Npx">
 * apenas na seleção — nunca altera o bloco (paragraph/heading).
 *
 * A assinatura dos comandos (`setFontSize(fontSize: string)`) é compatível com a
 * declaração de tipos que o pacote text-style já expõe globalmente.
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
              return normalizeFontSize(raw);
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
        (fontSize: string) =>
        ({ chain }) => {
          const value = normalizeFontSize(fontSize);
          if (!value) return false;
          return chain().setMark("textStyle", { fontSize: value }).run();
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
