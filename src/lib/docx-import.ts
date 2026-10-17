/**
 * Importa esboços em .docx 100% no aparelho. Segurança:
 * - limite de tamanho do arquivo e do conteúdo descompactado (bomba zip);
 * - lê só document.xml, styles.xml e numbering.xml (macros, links externos,
 *   imagens e objetos são ignorados);
 * - XML lido por um leitor próprio que recusa DOCTYPE/ENTITY (sem XXE);
 * - HTML montado do zero só com tags permitidas, com texto escapado,
 *   e depois normalizado pelo mesmo limpador da colagem do Word.
 */
import JSZip from "jszip";
import { cleanWordHtml } from "./word-paste-cleaner";

export const DOCX_MAX_BYTES = 10 * 1024 * 1024;
export const DOCX_MAX_UNZIPPED = 50 * 1024 * 1024;
export const DOCX_MAX_ENTRIES = 2000;

export type DocxErrorCode = "too_large" | "not_docx" | "macro" | "unsafe" | "empty";
export class DocxImportError extends Error {
  constructor(public code: DocxErrorCode) {
    super(code);
  }
}

const PARTS = ["word/document.xml", "word/styles.xml", "word/numbering.xml"];

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_m, e: string) => {
    const k = e.toLowerCase();
    if (k === "amp") return "&";
    if (k === "lt") return "<";
    if (k === "gt") return ">";
    if (k === "quot") return '"';
    if (k === "apos") return "'";
    const code = k.startsWith("#x") ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
    try {
      return String.fromCodePoint(code);
    } catch {
      return "";
    }
  });
}

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\b${name}=("([^"]*)"|'([^']*)')`).exec(tag);
  return m ? decodeXml(m[2] ?? m[3] ?? "") : null;
}

function firstTag(xml: string, name: string): string | null {
  const m = new RegExp(`<${name}\\b[^>]*>`).exec(xml);
  return m ? m[0] : null;
}

function isOn(xml: string, name: string): boolean {
  const t = firstTag(xml, name);
  if (!t) return false;
  const v = attr(t, "w:val");
  return v === null || !/^(0|false|none)$/i.test(v);
}

type StyleInfo = { name: string; basedOn?: string; left?: number; hanging?: number; bold?: boolean };

function parseStyles(xml: string): Record<string, StyleInfo> {
  const out: Record<string, StyleInfo> = {};
  const re = /<w:style\b([^>]*)>([\s\S]*?)<\/w:style>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const id = attr(m[1], "w:styleId");
    if (!id) continue;
    const nameTag = firstTag(m[2], "w:name");
    const based = firstTag(m[2], "w:basedOn");
    const ind = firstTag(m[2], "w:ind");
    const rPr = /<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(m[2]);
    out[id] = {
      name: (nameTag && attr(nameTag, "w:val")) || id,
      basedOn: (based && attr(based, "w:val")) || undefined,
      left: ind ? Number(attr(ind, "w:left") ?? attr(ind, "w:start") ?? NaN) : undefined,
      hanging: ind ? Number(attr(ind, "w:hanging") ?? NaN) : undefined,
      bold: rPr ? isOn(rPr[1], "w:b") : undefined,
    };
  }
  return out;
}

function resolveStyle(styles: Record<string, StyleInfo>, id: string | null): StyleInfo & { chain: string[] } {
  const res: StyleInfo & { chain: string[] } = { name: "", chain: [] };
  let cur = id;
  let guard = 0;
  while (cur && styles[cur] && guard++ < 20) {
    const s = styles[cur];
    res.chain.push(s.name, cur);
    if (!res.name) res.name = s.name;
    if (res.left === undefined && s.left !== undefined && !Number.isNaN(s.left)) res.left = s.left;
    if (res.hanging === undefined && s.hanging !== undefined && !Number.isNaN(s.hanging)) res.hanging = s.hanging;
    if (res.bold === undefined && s.bold !== undefined) res.bold = s.bold;
    cur = s.basedOn ?? null;
  }
  return res;
}

function parseNumbering(xml: string): (numId: string, ilvl: number) => boolean {
  const abstract: Record<string, Record<number, string>> = {};
  const re = /<w:abstractNum\b([^>]*)>([\s\S]*?)<\/w:abstractNum>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const id = attr(m[1], "w:abstractNumId") ?? "";
    const lv: Record<number, string> = {};
    const lre = /<w:lvl\b([^>]*)>([\s\S]*?)<\/w:lvl>/g;
    let l: RegExpExecArray | null;
    while ((l = lre.exec(m[2]))) {
      const f = firstTag(l[2], "w:numFmt");
      lv[Number(attr(l[1], "w:ilvl") ?? 0)] = (f && attr(f, "w:val")) || "bullet";
    }
    abstract[id] = lv;
  }
  const nums: Record<string, string> = {};
  const nre = /<w:num\b([^>]*)>([\s\S]*?)<\/w:num>/g;
  while ((m = nre.exec(xml))) {
    const a = firstTag(m[2], "w:abstractNumId");
    nums[attr(m[1], "w:numId") ?? ""] = (a && attr(a, "w:val")) ?? "";
  }
  return (numId, ilvl) => {
    const fmt = abstract[nums[numId]]?.[ilvl] ?? "bullet";
    return fmt !== "bullet" && fmt !== "none";
  };
}

function runsToHtml(p: string): { html: string; leadingTabs: number } {
  let html = "";
  let leadingTabs = 0;
  let started = false;
  const re = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(p))) {
    const rPrM = /<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(m[1]);
    const rPr = rPrM ? rPrM[1] : "";
    const body = rPrM ? m[1].replace(rPrM[0], "") : m[1];
    let text = "";
    const tre = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>/g;
    let t: RegExpExecArray | null;
    while ((t = tre.exec(body))) {
      if (t[1] !== undefined) {
        const s = decodeXml(t[1]);
        if (s.trim()) started = true;
        text += escapeHtml(s);
      } else if (t[0].startsWith("<w:tab")) {
        if (!started && !text.trim()) leadingTabs++;
        else text += " ";
      } else text += "<br>";
    }
    if (!text) continue;
    if (isOn(rPr, "w:b")) text = `<b>${text}</b>`;
    if (isOn(rPr, "w:i")) text = `<i>${text}</i>`;
    if (isOn(rPr, "w:u")) text = `<u>${text}</u>`;
    const c = firstTag(rPr, "w:color");
    const cv = c ? attr(c, "w:val") : null;
    if (cv && /^[0-9a-f]{6}$/i.test(cv) && !/^000000$/.test(cv)) text = `<span style="color:#${cv}">${text}</span>`;
    html += text;
  }
  return { html, leadingTabs };
}

/** Converte o XML do Word (já extraído) em HTML do editor. Função pura. */
export function docxXmlToHtml(documentXml: string, stylesXml = "", numberingXml = ""): string {
  for (const x of [documentXml, stylesXml, numberingXml]) {
    if (/<!DOCTYPE|<!ENTITY/i.test(x)) throw new DocxImportError("unsafe");
  }
  const styles = parseStyles(stylesXml);
  const isOrdered = parseNumbering(numberingXml);
  const blocks: string[] = [];
  const re = /<w:p\b[^>]*?(?:\/>|>([\s\S]*?)<\/w:p>)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(documentXml))) {
    const p = m[1] ?? "";
    const pPrM = /<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(p);
    const pPr = pPrM ? pPrM[1] : "";
    const { html, leadingTabs } = runsToHtml(pPrM ? p.replace(pPrM[0], "") : p);
    if (!html.replace(/<[^>]*>/g, "").trim()) continue;
    const ps = firstTag(pPr, "w:pStyle");
    const st = resolveStyle(styles, ps ? attr(ps, "w:val") : null);
    const names = st.chain.join(" ");
    const numPr = /<w:numPr>([\s\S]*?)<\/w:numPr>/.exec(pPr);
    const heading = /heading\s*([1-6])|t[ií]tulo\s*([1-6])/i.exec(names);
    if (heading && !numPr) {
      blocks.push(`<${Number(heading[1] ?? heading[2]) <= 1 ? "h2" : "h3"}>${html}</h${Number(heading[1] ?? heading[2]) <= 1 ? "2" : "3"}>`);
      continue;
    }
    if (numPr) {
      const il = firstTag(numPr[1], "w:ilvl");
      const ni = firstTag(numPr[1], "w:numId");
      const ilvl = Math.min(8, Number((il && attr(il, "w:val")) ?? 0) || 0);
      const numId = (ni && attr(ni, "w:val")) ?? "";
      if (numId !== "0") {
        const glyph = isOrdered(numId, ilvl) ? "1." : "·";
        blocks.push(`<p class="MsoListParagraph" style="mso-list:l0 level${ilvl + 1} lfo1"><!--[if !supportLists]--><span>${glyph}</span><!--[endif]-->${html}</p>`);
        continue;
      }
    }
    const style: string[] = [];
    const lvlByName = /indent\s*(\d)/i.exec(names);
    if (lvlByName) style.push(`x-level:${lvlByName[1]}`);
    else {
      const ind = firstTag(pPr, "w:ind");
      const left = Number((ind && (attr(ind, "w:left") ?? attr(ind, "w:start"))) ?? st.left ?? 0) || 0;
      const first = Number((ind && attr(ind, "w:firstLine")) ?? 0) || 0;
      if (left > 0) style.push(`margin-left:${left / 20}pt`);
      if (first > 0) style.push(`text-indent:${first / 20}pt`);
    }
    if (leadingTabs) style.push(`x-tab-indent:${leadingTabs * 48}px`);
    const bold = st.bold || /jwheading/i.test(names.replace(/\s/g, ""));
    if (bold) style.push("x-bold:1");
    blocks.push(`<p class="MsoNormal"${style.length ? ` style="${style.join(";")}"` : ""}>${html}</p>`);
  }
  if (!blocks.length) throw new DocxImportError("empty");
  return cleanWordHtml(`<html xmlns:o="urn:schemas-microsoft-com:office:office"><body>${blocks.join("")}</body></html>`);
}

type ZipEntry = { _data?: { uncompressedSize?: number } };

/** Lê um arquivo .docx com todos os limites de segurança. */
export async function importDocx(file: { name: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }): Promise<{ title: string; html: string }> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".docm") || lower.endsWith(".dotm")) throw new DocxImportError("macro");
  if (!lower.endsWith(".docx")) throw new DocxImportError("not_docx");
  if (file.size > DOCX_MAX_BYTES) throw new DocxImportError("too_large");
  const buf = await file.arrayBuffer();
  if (buf.byteLength > DOCX_MAX_BYTES) throw new DocxImportError("too_large");
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch {
    throw new DocxImportError("not_docx");
  }
  const entries = Object.keys(zip.files);
  if (entries.length > DOCX_MAX_ENTRIES) throw new DocxImportError("unsafe");
  if (entries.some((n) => /vbaProject\.bin$/i.test(n))) throw new DocxImportError("macro");
  if (!zip.file("word/document.xml")) throw new DocxImportError("not_docx");
  let total = 0;
  const texts: string[] = [];
  for (const part of PARTS) {
    const f = zip.file(part);
    if (!f) {
      texts.push("");
      continue;
    }
    const declared = (f as unknown as ZipEntry)._data?.uncompressedSize ?? 0;
    if (declared > DOCX_MAX_UNZIPPED) throw new DocxImportError("too_large");
    const s = await f.async("string");
    total += s.length;
    if (total > DOCX_MAX_UNZIPPED) throw new DocxImportError("too_large");
    texts.push(s);
  }
  const html = docxXmlToHtml(texts[0], texts[1], texts[2]);
  const title = file.name.replace(/\.docx$/i, "").slice(0, 200);
  return { title, html };
}
