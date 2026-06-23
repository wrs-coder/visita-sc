// Engine de PDF compartilhada baseada em pdf-lib.
//
// Expõe uma API "jsPDF-like" (origem top-left, y desce, métodos
// equivalentes a `text`, `rect`, `line`, `setFont`, `setTextColor`,
// `splitTextToSize`, etc.) para minimizar a diferença em relação aos
// geradores existentes — todos eles foram escritos primeiro com `jspdf`.
//
// Diferenças deliberadas em relação ao jsPDF:
//   - `setFont(bold: boolean)` em vez de `setFont(name, style)` (só
//     suportamos Helvetica via `StandardFonts`).
//   - `output("blob")` é **assíncrono** (pdf-lib serializa via Promise).
//   - Sanitização Latin-1 automática (WinAnsi não cobre travessões
//     unicode, aspas curvas, reticências, NBSP, bullets — convertidos
//     para equivalentes ASCII; o restante vira "?").
//
// A engine roda 100% client-side, sem Node, sem Canvas — segura para o
// modo offline (não depende de fetch externo nem de fontes remotas).

import type { PDFDocument, PDFFont, PDFPage } from "pdf-lib";

export type PdfUnit = "pt" | "mm";

const MM_TO_PT = 2.83465;

export interface PdfDocOptions {
  unit: PdfUnit;
  orientation?: "p" | "l";
}

export interface TextOptions {
  align?: "left" | "right" | "center";
}

export interface JsPdfCompat {
  /** Largura da página na unidade declarada. */
  pageW: number;
  /** Altura da página na unidade declarada. */
  pageH: number;
  addPage(): void;
  setPage(n: number): void;
  getNumberOfPages(): number;
  text(text: string, x: number, y: number, opts?: TextOptions): void;
  splitTextToSize(text: string, maxWidth: number): string[];
  /** Largura real do texto no estilo/tamanho atual, na unidade declarada. */
  measureText(text: string): number;
  setFont(bold: boolean): void;
  setFontSize(size: number): void;
  setTextColor(r: number, g?: number, b?: number): void;
  setFillColor(r: number, g: number, b: number): void;
  setDrawColor(r: number, g?: number, b?: number): void;
  setLineWidth(w: number): void;
  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    style?: "F" | "S" | "FS",
  ): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  output(type: "blob"): Promise<Blob>;
}

const WINANSI_FALLBACK: Record<string, string> = {
  "\u2013": "-",
  "\u2014": "-",
  "\u2212": "-",
  "\u2018": "'",
  "\u2019": "'",
  "\u201a": "'",
  "\u201c": '"',
  "\u201d": '"',
  "\u201e": '"',
  "\u2026": "...",
  "\u00a0": " ",
  "\u202f": " ",
  "\u2009": " ",
  "\u2022": "-",
  "\u00b7": "-",
  "\u25cf": "-",
  "\u25cb": "o",
  "\u2192": "->",
  "\u2190": "<-",
  "\u2713": "v",
  "\u2717": "x",
};

/** Garante que `text` cabe na codificação WinAnsi de Helvetica (Latin-1). */
function sanitizeForHelvetica(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    // Tab → 4 espaços (WinAnsi rejeita 0x09 mesmo sendo Latin-1).
    if (code === 0x09) {
      out += "    ";
      continue;
    }
    // Demais caracteres de controle (exceto \n e \r) são removidos —
    // WinAnsi não os aceita.
    if (code < 0x20 && code !== 0x0a && code !== 0x0d) {
      continue;
    }
    // Faixa de controle C1 (0x80–0x9F) também não é representável.
    if (code >= 0x80 && code <= 0x9f) {
      const sub = WINANSI_FALLBACK[ch];
      out += sub ?? "?";
      continue;
    }
    if (code <= 0xff) {
      out += ch;
      continue;
    }
    const sub = WINANSI_FALLBACK[ch];
    out += sub ?? "?";
  }
  return out;
}

/**
 * Cria um documento A4 com API estilo jsPDF, porém implementado em
 * pdf-lib. Já inicia com uma primeira página.
 */
export async function createJsPdfCompat(
  opts: PdfDocOptions,
): Promise<JsPdfCompat> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc: PDFDocument = await PDFDocument.create();
  const fontRegular: PDFFont = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold: PDFFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const isLandscape = opts.orientation === "l";
  const pageWPt = isLandscape ? 841.89 : 595.28; // A4
  const pageHPt = isLandscape ? 595.28 : 841.89;
  const unitScale = opts.unit === "mm" ? MM_TO_PT : 1;
  const toPt = (v: number) => v * unitScale;
  const fromPt = (v: number) => v / unitScale;

  const pages: PDFPage[] = [];
  let curIdx = -1;
  let curBold = false;
  let curFontSize = 12;
  let curTextRGB: [number, number, number] = [0, 0, 0];
  let curFillRGB: [number, number, number] = [0, 0, 0];
  let curDrawRGB: [number, number, number] = [0, 0, 0];
  let curLineWidth = 0.5;

  const font = () => (curBold ? fontBold : fontRegular);
  const color = (c: [number, number, number]) =>
    rgb(c[0] / 255, c[1] / 255, c[2] / 255);

  const api: JsPdfCompat = {
    pageW: pageWPt / unitScale,
    pageH: pageHPt / unitScale,
    addPage() {
      const p = doc.addPage([pageWPt, pageHPt]);
      pages.push(p);
      curIdx = pages.length - 1;
    },
    setPage(n: number) {
      const idx = n - 1;
      if (idx < 0 || idx >= pages.length) {
        throw new Error(`PdfEngine: setPage(${n}) fora do intervalo`);
      }
      curIdx = idx;
    },
    getNumberOfPages() {
      return pages.length;
    },
    text(text, x, y, options) {
      const safe = sanitizeForHelvetica(text);
      const f = font();
      const widthPt = f.widthOfTextAtSize(safe, curFontSize);
      let drawXPt = toPt(x);
      if (options?.align === "right") drawXPt -= widthPt;
      else if (options?.align === "center") drawXPt -= widthPt / 2;
      // jsPDF: y é a baseline em coordenadas top-down. pdf-lib: y é
      // a baseline em coordenadas bottom-up.
      const drawYPt = pageHPt - toPt(y);
      pages[curIdx].drawText(safe, {
        x: drawXPt,
        y: drawYPt,
        size: curFontSize,
        font: f,
        color: color(curTextRGB),
      });
    },
    splitTextToSize(text, maxWidth) {
      const safe = sanitizeForHelvetica(text);
      const f = font();
      const maxWidthPt = toPt(maxWidth);
      const paragraphs = safe.split(/\r?\n/);
      const out: string[] = [];
      for (const para of paragraphs) {
        if (para.length === 0) {
          out.push("");
          continue;
        }
        // Tokeniza preservando espaços para reconstruir wrap fiel.
        const tokens = para.split(/(\s+)/);
        let line = "";
        for (const tok of tokens) {
          const candidate = line + tok;
          const width = f.widthOfTextAtSize(candidate, curFontSize);
          if (width <= maxWidthPt) {
            line = candidate;
            continue;
          }
          if (line.trim().length) out.push(line.replace(/\s+$/, ""));
          // Token sozinho maior que a largura: quebra forçada por char.
          if (f.widthOfTextAtSize(tok, curFontSize) > maxWidthPt) {
            let chunk = "";
            for (const ch of tok) {
              const cand = chunk + ch;
              if (f.widthOfTextAtSize(cand, curFontSize) > maxWidthPt) {
                if (chunk) out.push(chunk);
                chunk = ch;
              } else {
                chunk = cand;
              }
            }
            line = chunk;
          } else {
            line = tok.replace(/^\s+/, "");
          }
        }
        if (line.length) out.push(line.replace(/\s+$/, ""));
      }
      return out;
    },
    measureText(text) {
      const safe = sanitizeForHelvetica(text);
      return fromPt(font().widthOfTextAtSize(safe, curFontSize));
    },
    setFont(bold) {
      curBold = bold;
    },
    setFontSize(size) {
      curFontSize = size;
    },
    setTextColor(r, g, b) {
      curTextRGB =
        g === undefined ? [r, r, r] : [r, g, b ?? 0];
    },
    setFillColor(r, g, b) {
      curFillRGB = [r, g, b];
    },
    setDrawColor(r, g, b) {
      curDrawRGB =
        g === undefined ? [r, r, r] : [r, g, b ?? 0];
    },
    setLineWidth(w) {
      curLineWidth = w;
    },
    rect(x, y, w, h, style = "F") {
      const drawXPt = toPt(x);
      const drawYPt = pageHPt - toPt(y) - toPt(h);
      const widthPt = toPt(w);
      const heightPt = toPt(h);
      const wantFill = style === "F" || style === "FS";
      const wantStroke = style === "S" || style === "FS";
      pages[curIdx].drawRectangle({
        x: drawXPt,
        y: drawYPt,
        width: widthPt,
        height: heightPt,
        color: wantFill ? color(curFillRGB) : undefined,
        borderColor: wantStroke ? color(curDrawRGB) : undefined,
        borderWidth: wantStroke ? curLineWidth : 0,
      });
    },
    line(x1, y1, x2, y2) {
      pages[curIdx].drawLine({
        start: { x: toPt(x1), y: pageHPt - toPt(y1) },
        end: { x: toPt(x2), y: pageHPt - toPt(y2) },
        color: color(curDrawRGB),
        thickness: curLineWidth,
      });
    },
    async output(type) {
      if (type !== "blob") {
        throw new Error(`PdfEngine: output("${type}") não suportado`);
      }
      const bytes = await doc.save();
      // Uint8Array is a valid BlobPart in lib.dom.d.ts.
      return new Blob([bytes as BlobPart], { type: "application/pdf" });
    },
  };

  api.addPage();
  return api;
}

/** Slug compatível com nomes de arquivo (mantido para callers). */
export function slugify(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "documento"
  );
}
