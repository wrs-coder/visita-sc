// EPUB Bible parser — universal, resiliente, 100% client-side.
// Lê um arquivo .epub e devolve { meta, books, verses }.
// Identificação dos 66 livros é feita por catálogo canônico multilíngue
// (ver bible-canon.ts), independente do idioma do EPUB.

import JSZip from "jszip";
import {
  CANON,
  findCanonicalInText,
  normalizeName,
  resolveCanonical,
  type CanonicalBook,
} from "./bible-canon";

export interface ParsedBookInfo {
  bookId: string;       // "B01", "B02"... estável por ordem de leitura
  displayName: string;  // nome do livro como aparece no EPUB
  aliases: string[];    // variantes auto-geradas (abreviações)
  order: number;        // posição (1-based)
}

export interface ParsedVerse {
  bookId: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface ParsedEpubMeta {
  title: string;
  lang: string;        // ISO-639-1 (ex: "pt", "en")
  langLabel: string;   // rótulo legível (ex: "Português")
  identifier?: string;
}

export interface ParsedEpub {
  meta: ParsedEpubMeta;
  books: ParsedBookInfo[];
  verses: ParsedVerse[];
}

export type ParseProgress = (phase: "unzip" | "parse-opf" | "index-books" | "write-db", pct: number) => void;

const XML_MIME = "application/xml";
const XHTML_MIME = "application/xhtml+xml";

/** Totais canônicos de versículos por livro (texto massorético/grego padrão).
 *  Usado apenas para destacar defasagens no log de auditoria pós-import. */
const EXPECTED_VERSE_COUNTS: Record<string, number> = {
  B01: 1533, B02: 1213, B03: 859,  B04: 1288, B05: 959,
  B06: 658,  B07: 618,  B08: 85,   B09: 810,  B10: 695,
  B11: 816,  B12: 719,  B13: 942,  B14: 822,  B15: 280,
  B16: 406,  B17: 167,  B18: 1070, B19: 2461, B20: 915,
  B21: 222,  B22: 117,  B23: 1292, B24: 1364, B25: 154,
  B26: 1273, B27: 357,  B28: 197,  B29: 73,   B30: 146,
  B31: 21,   B32: 48,   B33: 105,  B34: 47,   B35: 56,
  B36: 53,   B37: 38,   B38: 211,  B39: 55,
  B40: 1071, B41: 678,  B42: 1151, B43: 879,  B44: 1007,
  B45: 433,  B46: 437,  B47: 257,  B48: 149,  B49: 155,
  B50: 104,  B51: 95,   B52: 89,   B53: 47,   B54: 113,
  B55: 83,   B56: 46,   B57: 25,   B58: 303,  B59: 108,
  B60: 105,  B61: 61,   B62: 105,  B63: 13,   B64: 14,
  B65: 25,   B66: 404,
};


function normalizeLang(raw: string | null | undefined): string {
  if (!raw) return "xx";
  const m = raw.trim().toLowerCase().match(/^([a-z]{2,3})/);
  return m ? m[1] : "xx";
}

const LANG_LABELS: Record<string, string> = {
  pt: "Português", en: "English", es: "Español", fr: "Français",
  de: "Deutsch", it: "Italiano", ja: "日本語", ko: "한국어",
  zh: "中文", ru: "Русский", nl: "Nederlands", pl: "Polski",
  sv: "Svenska", no: "Norsk", da: "Dansk", fi: "Suomi",
};

function langLabel(lang: string): string {
  return LANG_LABELS[lang] ?? lang.toUpperCase();
}

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Gera aliases razoáveis a partir do displayName.
 *  Ex.: "1 Coríntios" -> ["1 Coríntios", "1 Corintios", "1Cor", "1 Cor", "1Co", "1 Co"]
 *  Ex.: "Gênesis"     -> ["Gênesis", "Genesis", "Gên", "Gen", "Gn"]
 */
function buildAliases(displayName: string): string[] {
  const set = new Set<string>();
  const name = displayName.trim();
  if (!name) return [];
  set.add(name);

  // Detecta prefixo numérico ("1 ", "2 ", "3 ")
  const numMatch = name.match(/^([123])\s*(.+)$/);
  const prefix = numMatch ? numMatch[1] : "";
  const core = numMatch ? numMatch[2] : name;

  const coreNoAccent = stripDiacritics(core);
  if (coreNoAccent !== core) {
    set.add(prefix ? `${prefix} ${coreNoAccent}` : coreNoAccent);
  }

  // Abreviações: primeiras 2, 3 e 4 letras do "core" (sem acento)
  for (const base of [core, coreNoAccent]) {
    const clean = base.replace(/\s+/g, "");
    if (clean.length >= 2) {
      const abbr2 = clean.slice(0, 2);
      const abbr3 = clean.slice(0, 3);
      const abbr4 = clean.slice(0, 4);
      for (const a of [abbr2, abbr3, abbr4]) {
        if (prefix) {
          set.add(`${prefix}${a}`);
          set.add(`${prefix} ${a}`);
        } else {
          set.add(a);
        }
      }
    }
  }

  return Array.from(set);
}

async function findOpfPath(zip: JSZip): Promise<string> {
  const container = zip.file("META-INF/container.xml");
  if (container) {
    const xml = await container.async("string");
    const doc = new DOMParser().parseFromString(xml, XML_MIME);
    const rootfile = doc.querySelector("rootfile");
    const full = rootfile?.getAttribute("full-path");
    if (full) return full;
  }
  // Fallback: primeiro .opf no zip
  const opfFile = Object.keys(zip.files).find((n) => n.toLowerCase().endsWith(".opf"));
  if (!opfFile) throw new Error("EPUB inválido: nenhum .opf encontrado");
  return opfFile;
}

interface OpfData {
  meta: ParsedEpubMeta;
  manifest: Map<string, { href: string; mediaType: string }>;
  spine: string[]; // idrefs em ordem
  basePath: string;
}

async function parseOpf(zip: JSZip, opfPath: string): Promise<OpfData> {
  const file = zip.file(opfPath);
  if (!file) throw new Error(`OPF não encontrado: ${opfPath}`);
  const xml = await file.async("string");
  const doc = new DOMParser().parseFromString(xml, XML_MIME);

  const dc = (tag: string) =>
    doc.getElementsByTagName(`dc:${tag}`)[0]?.textContent?.trim()
    ?? doc.getElementsByTagNameNS("*", tag)[0]?.textContent?.trim()
    ?? "";

  const meta: ParsedEpubMeta = {
    title: dc("title") || "Bíblia importada",
    lang: normalizeLang(dc("language")),
    langLabel: "",
    identifier: dc("identifier") || undefined,
  };
  meta.langLabel = langLabel(meta.lang);

  const manifest = new Map<string, { href: string; mediaType: string }>();
  const items = doc.getElementsByTagName("item");
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const id = it.getAttribute("id");
    const href = it.getAttribute("href");
    const mt = it.getAttribute("media-type") ?? "";
    if (id && href) manifest.set(id, { href, mediaType: mt });
  }

  const spine: string[] = [];
  const itemrefs = doc.getElementsByTagName("itemref");
  for (let i = 0; i < itemrefs.length; i++) {
    const id = itemrefs[i].getAttribute("idref");
    if (id) spine.push(id);
  }

  const basePath = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";

  return { meta, manifest, spine, basePath };
}

function resolvePath(base: string, href: string): string {
  if (!href) return base;
  if (href.startsWith("/")) return href.slice(1);
  // resolve "../" e "./"
  const parts = (base + href).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p !== "." && p !== "") out.push(p);
  }
  return out.join("/");
}

interface BookSlot {
  displayName: string;
  hrefs: string[]; // arquivos xhtml deste livro (pode ser vários capítulos)
}

/** Remove sufixos numéricos de capítulo: "Mateus 1" -> "Mateus", "1 Reis 5" -> "1 Reis". */
function stripChapterSuffix(name: string): string {
  let s = name.trim();
  s = s.replace(/\s*[-–—:]\s*(cap[ií]tulo|cap\.?|chapter)\s*\d+\s*$/i, "");
  s = s.replace(/\s+(cap[ií]tulo|cap\.?|chapter)\s*\d+\s*$/i, "");
  const m = s.match(/^(([123])\s+)?(.+?)\s+\d{1,3}\s*$/);
  if (m) {
    const prefix = m[1] ?? "";
    const core = m[3].trim();
    if (core.length >= 2) s = `${prefix}${core}`;
  }
  return s.trim();
}

/** Agrupa entradas planas de TOC em livros, juntando capítulos consecutivos do mesmo livro. */
function groupFlatEntries(entries: { name: string; href: string }[]): BookSlot[] {
  const slots: BookSlot[] = [];
  for (const e of entries) {
    if (!e.href) continue;
    const bookName = stripChapterSuffix(e.name) || e.name;
    const last = slots[slots.length - 1];
    if (last && last.displayName === bookName) {
      last.hrefs.push(e.href);
    } else {
      slots.push({ displayName: bookName, hrefs: [e.href] });
    }
  }
  return slots;
}

interface NavNode { name: string; href: string; children: NavNode[] }

function readNavList(list: Element, base: string): NavNode[] {
  const out: NavNode[] = [];
  const lis = Array.from(list.children).filter((c) => c.tagName.toLowerCase() === "li");
  for (const li of lis) {
    const a = li.querySelector("a");
    const name = (a?.textContent ?? "").trim();
    const hrefRaw = a?.getAttribute("href") ?? "";
    const childList = Array.from(li.children).find(
      (c) => c.tagName.toLowerCase() === "ol" || c.tagName.toLowerCase() === "ul",
    );
    const children = childList ? readNavList(childList, base) : [];
    if (!name && children.length === 0) continue;
    out.push({
      name,
      href: hrefRaw ? resolvePath(base, hrefRaw.split("#")[0]) : "",
      children,
    });
  }
  return out;
}

/** Constrói a lista de livros, agrupando capítulos por livro. */
async function buildBookSlots(zip: JSZip, opf: OpfData): Promise<BookSlot[]> {
  // 1) nav.xhtml (EPUB3)
  const navItem = Array.from(opf.manifest.values()).find(
    (m) => m.mediaType === XHTML_MIME && /nav/i.test(m.href),
  );
  if (navItem) {
    const path = resolvePath(opf.basePath, navItem.href);
    const navFile = zip.file(path);
    if (navFile) {
      const html = await navFile.async("string");
      const doc = new DOMParser().parseFromString(html, XHTML_MIME);
      const navs = Array.from(doc.getElementsByTagName("nav"));
      const tocNav =
        navs.find((n) => (n.getAttribute("epub:type") ?? "").includes("toc")) ?? navs[0];
      if (tocNav) {
        const rootList = tocNav.querySelector("ol, ul");
        if (rootList) {
          const tree = readNavList(rootList, opf.basePath);
          const hasChildren = tree.some((t) => t.children.length > 0);
          if (hasChildren) {
            const slots: BookSlot[] = [];
            for (const t of tree) {
              const hrefs = t.children.length > 0
                ? t.children.map((c) => c.href).filter(Boolean)
                : (t.href ? [t.href] : []);
              if (hrefs.length === 0 || !t.name) continue;
              slots.push({ displayName: t.name, hrefs });
            }
            if (slots.length >= 5) return slots;
          }
          const flat = tree
            .filter((t) => t.href && t.name)
            .map((t) => ({ name: t.name, href: t.href }));
          const grouped = groupFlatEntries(flat);
          if (grouped.length >= 5) return grouped;
        }
      }
    }
  }

  // 2) toc.ncx
  const ncxItem = Array.from(opf.manifest.values()).find((m) =>
    m.mediaType.includes("ncx") || m.href.toLowerCase().endsWith(".ncx"),
  );
  if (ncxItem) {
    const path = resolvePath(opf.basePath, ncxItem.href);
    const ncxFile = zip.file(path);
    if (ncxFile) {
      const xml = await ncxFile.async("string");
      const doc = new DOMParser().parseFromString(xml, XML_MIME);
      const navMap = doc.getElementsByTagName("navMap")[0];
      if (navMap) {
        const topPoints = Array.from(navMap.children).filter(
          (c) => c.tagName.toLowerCase() === "navpoint",
        );
        const readPoint = (p: Element) => {
          const name = p.getElementsByTagName("navLabel")[0]
            ?.getElementsByTagName("text")[0]?.textContent?.trim() ?? "";
          const content = p.getElementsByTagName("content")[0]?.getAttribute("src") ?? "";
          const href = content ? resolvePath(opf.basePath, content.split("#")[0]) : "";
          const children = Array.from(p.children).filter(
            (c) => c.tagName.toLowerCase() === "navpoint",
          );
          return { name, href, children };
        };
        const hasChildren = topPoints.some((p) => readPoint(p).children.length > 0);
        if (hasChildren) {
          const slots: BookSlot[] = [];
          for (const p of topPoints) {
            const info = readPoint(p);
            const childHrefs = info.children.map((c) => readPoint(c).href).filter(Boolean);
            const hrefs = childHrefs.length > 0 ? childHrefs : (info.href ? [info.href] : []);
            if (hrefs.length === 0 || !info.name) continue;
            slots.push({ displayName: info.name, hrefs });
          }
          if (slots.length >= 5) return slots;
        }
        const flat: { name: string; href: string }[] = [];
        for (const p of topPoints) {
          const info = readPoint(p);
          if (info.name && info.href) flat.push({ name: info.name, href: info.href });
        }
        const grouped = groupFlatEntries(flat);
        if (grouped.length >= 5) return grouped;
      }
    }
  }

  // 3) Spine — agrupa por título de cada xhtml
  const flatSpine: { name: string; href: string }[] = [];
  for (const idref of opf.spine) {
    const item = opf.manifest.get(idref);
    if (!item) continue;
    const path = resolvePath(opf.basePath, item.href);
    const file = zip.file(path);
    if (!file) continue;
    const html = await file.async("string");
    const doc = new DOMParser().parseFromString(html, XHTML_MIME);
    const name =
      doc.getElementsByTagName("h1")[0]?.textContent?.trim() ||
      doc.getElementsByTagName("h2")[0]?.textContent?.trim() ||
      doc.getElementsByTagName("title")[0]?.textContent?.trim() ||
      `Item ${flatSpine.length + 1}`;
    flatSpine.push({ name, href: path });
  }
  return groupFlatEntries(flatSpine);
}

// =============================================================
// Extração de versículos — abordagem por "marcadores"
// =============================================================
//
// Em vez de tentar pegar o texto do versículo DE DENTRO do elemento marcador
// (que é o que falhava na TNM: o marcador é só um <sup>1</sup> ou <a id="v1"/>
// e o texto do versículo vem nos nós irmãos seguintes), nós:
//
//  1. Listamos todos os nós que parecem ser MARCADORES de versículo
//     (em ordem de documento).
//  2. Para cada marcador, coletamos o texto que aparece DEPOIS dele e ANTES
//     do próximo marcador.

interface VerseMarker {
  node: Node;       // o nó marcador no DOM
  chapter: number;  // capítulo derivado (id/href/contexto)
  verse: number;    // número do versículo
}

/** Tenta extrair (chapter, verse) de uma string de id/atributo qualquer. */
function parseChapVerseFromAttr(raw: string): { chap?: number; verse?: number } {
  if (!raw) return {};
  // chapter11_verse5, ch11v5, c11v5, 11_5, 11.5, 11:5
  const m1 = raw.match(/chapter[_-]?(\d+)[^\d]*verse[_-]?(\d+)/i);
  if (m1) return { chap: parseInt(m1[1], 10), verse: parseInt(m1[2], 10) };
  const m2 = raw.match(/c(?:hap)?[_-]?(\d+)[^\d]{0,3}v(?:erse)?[_-]?(\d+)/i);
  if (m2) return { chap: parseInt(m2[1], 10), verse: parseInt(m2[2], 10) };
  const m3 = raw.match(/(\d+)\s*[:._-]\s*(\d+)/);
  if (m3) return { chap: parseInt(m3[1], 10), verse: parseInt(m3[2], 10) };
  // Padrão JW: v\d{2,3}\d{3} = chap+verse concatenado
  const m4 = raw.match(/v(\d{2,3})(\d{3})\b/i);
  if (m4) return { chap: parseInt(m4[1], 10), verse: parseInt(m4[2], 10) };
  // Só verso (vN, verseN)
  const m5 = raw.match(/^v(?:erse)?[_-]?(\d+)$/i);
  if (m5) return { verse: parseInt(m5[1], 10) };
  return {};
}

/** Detecta o número do capítulo a partir do nome do arquivo, ex. mt_07.xhtml -> 7. */
function chapterFromFilename(href: string): number | null {
  const base = href.split("/").pop() ?? "";
  // padrões: ch01, chap01, cap01, c01, _01, -01
  const m = base.match(/(?:ch|chap|cap|c|_|-)(\d{1,3})(?:\.|_|-|$)/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 200) return n;
  }
  // último número antes da extensão
  const m2 = base.replace(/\.[^.]+$/, "").match(/(\d{1,3})$/);
  if (m2) {
    const n = parseInt(m2[1], 10);
    if (n >= 1 && n <= 200) return n;
  }
  return null;
}

/** Lê um número de capítulo a partir do <h1>/<h2>/<title> do documento. */
function chapterFromHeading(doc: Document): number | null {
  const heads = [
    doc.getElementsByTagName("h1")[0]?.textContent ?? "",
    doc.getElementsByTagName("h2")[0]?.textContent ?? "",
    doc.getElementsByTagName("h3")[0]?.textContent ?? "",
    doc.getElementsByTagName("title")[0]?.textContent ?? "",
  ];
  for (const h of heads) {
    const m = h.match(/(?:cap[ií]tulo|chapter|cap\.?)\s*(\d{1,3})/i);
    if (m) return parseInt(m[1], 10);
    const m2 = h.match(/\b(\d{1,3})\b/);
    if (m2) {
      const n = parseInt(m2[1], 10);
      if (n >= 1 && n <= 200) return n;
    }
  }
  return null;
}

/** Verifica se um nó está dentro de uma subárvore "ruidosa" (nota/rodapé/cross-ref/etc.). */
const NOISY_CLASS_RE = /\b(fn|footnote|footnotes|note|notes|rearnote|annotation|xref|cross|crossref|study|caption|figcaption|byline|callout|sidebar|outline|chapterOutline|chapter-outline|synopsis|summary|ss|sb|sb1|sb2|boxStudy|box|box1|box2|bridgehead)\b/i;
const NOISY_EPUB_TYPE_RE = /(footnote|rearnote|annotation|note-ref|noteref|bridgehead|sidebar|titlepage)/i;
const NOISY_TAGS = new Set(["aside", "nav", "figure", "figcaption"]);

function isNoisyElement(el: Element): boolean {
  if (NOISY_TAGS.has(el.tagName.toLowerCase())) return true;
  const cls = el.getAttribute("class") ?? "";
  if (cls && NOISY_CLASS_RE.test(cls)) return true;
  const epubType = el.getAttribute("epub:type") ?? "";
  if (epubType && NOISY_EPUB_TYPE_RE.test(epubType)) return true;
  if (el.tagName.toLowerCase() === "a") {
    const href = el.getAttribute("href") ?? "";
    if (/#(fn|note|footnote|xref|cross)/i.test(href)) return true;
  }
  return false;
}

function hasNoisyAncestor(node: Node): boolean {
  let p: Node | null = node.parentNode;
  while (p && p.nodeType === 1) {
    if (isNoisyElement(p as Element)) return true;
    p = p.parentNode;
  }
  return false;
}

const CHAPTER_CLASS_RE = /\b(w_ch|chapter|cap[ií]tulo|chap|chapno|chap-?num|chapter-?num(?:ber)?|cn|ch)\b/i;

// ============================================================
//  Hard DOM Purge — limpeza estrutural universal (sem strings de idioma).
//  Roda 1x por documento, antes da extração.
// ============================================================

const PURGE_SELECTORS = [
  // Cabeçalho do livro (TNM coloca o título em <header>)
  'header',

  // Notas de rodapé / referências / cross-refs (EPUB 3 + variantes)
  'aside[epub\\:type~="footnote"]',
  'aside[epub\\:type~="rearnote"]',
  'aside[epub\\:type~="note"]',
  'div[epub\\:type~="footnote"]',
  'div[epub\\:type~="rearnote"]',
  '[epub\\:type~="note"]',
  '[epub\\:type~="noteref"]',
  '[epub\\:type~="note-ref"]',
  '[role="doc-footnote"]',
  '[role="doc-endnote"]',
  '[role="doc-noteref"]',
  '.footnote', '.footnotes', '.footnoteref', '.fn', '.rearnote', '.endnote',
  'a[href*="#footnotesource"]',
  'a[href*="#footnote"]', 'a[href*="#fn"]', 'a[href*="#note"]', 'a[href*="#xref"]',

  // Navegação / TOC / réguas de botões
  'nav', 'nav[epub\\:type~="toc"]', 'nav[epub\\:type~="landmarks"]',
  '[epub\\:type~="toc"]', '[role="doc-toc"]', '[role="navigation"]',
  'table.w_navigation', 'p.w_navigation', '.w_navigation',
  '.nav', '.navigation', '.nav-bar', '.navbar', '.pageNav', '.page-nav',

  // Frente do livro (capa/colofão/título)
  '[epub\\:type~="titlepage"]',
  '[epub\\:type~="halftitlepage"]',
  '[epub\\:type~="frontmatter"]',
  '[epub\\:type~="colophon"]',
  '[epub\\:type~="copyright-page"]',
  '[epub\\:type~="bridgehead"]',
];

function hardPurgeDoc(doc: Document): void {
  for (const sel of PURGE_SELECTORS) {
    let nodes: NodeListOf<Element>;
    try {
      nodes = doc.querySelectorAll(sel);
    } catch {
      continue;
    }
    nodes.forEach((n) => n.remove());
  }
}

/** Remove tudo que aparece ANTES da primeira âncora de capítulo
 *  (sumário/intro/cabeçalho de livro). No-op se o documento não
 *  tiver âncora estrutural de capítulo. Reverte se a truncagem
 *  destruir mais de 80% do texto (proteção para livros pequenos
 *  / de 1 capítulo onde a âncora pode ser tardia no documento). */
function truncatePreChapterContent(doc: Document): void {
  const body = doc.body;
  if (!body) return;

  let anchor: Element | null = null;
  // Importante: NÃO usar `[id^="ch"]` genérico nem aceitar IDs de versículo
  // (ex.: chapter1_verse1) como âncora — isso quebrava livros de 1 capítulo.
  const anchorSelectors = [
    '[id^="chapter"]:not([id*="verse"])',
    '.w_ch',
    '[id^="cap"]:not([id*="verse"])',
    '[epub\\:type~="chapter"]',
    'section[role="doc-chapter"]',
  ];
  for (const sel of anchorSelectors) {
    try {
      anchor = body.querySelector(sel);
    } catch {
      anchor = null;
    }
    if (anchor) break;
  }
  if (!anchor) return;

  // Snapshot do HTML para rollback se a truncagem ficar destrutiva demais.
  const originalLen = (body.textContent ?? "").trim().length;
  const originalHtml = body.innerHTML;
  const hadVerseAnchorBefore = /id=["'][^"']*chapter\d+[_-]?verse\d+/i.test(originalHtml);


  // Sobe da âncora até filho direto de body, removendo irmãos anteriores
  // em cada nível. Conteúdo posterior nunca é tocado.
  let node: Element = anchor;
  while (node.parentElement && node.parentElement !== body) {
    let prev = node.previousElementSibling;
    while (prev) {
      const toRemove = prev;
      prev = prev.previousElementSibling;
      toRemove.remove();
    }
    node = node.parentElement;
  }
  // Último nível: irmãos diretos do body anteriores a `node`
  let prev = node.previousElementSibling;
  while (prev) {
    const toRemove = prev;
    prev = prev.previousElementSibling;
    toRemove.remove();
  }

  // Guarda de segurança: reverte se a truncagem ficou destrutiva.
  //  - encolhimento extremo (texto < 100 chars OU < 50% do original), OU
  //  - nenhuma âncora real de versículo `chapterN_verseN` sobreviveu.
  const newLen = (body.textContent ?? "").trim().length;
  const hasRealVerseAnchor = (() => {
    const all = body.getElementsByTagName("*");
    for (let i = 0; i < all.length; i++) {
      const id = all[i].getAttribute("id") ?? "";
      if (/^chapter\d+[_-]?verse\d+/i.test(id)) return true;
    }
    return false;
  })();
  const shrankTooMuch = originalLen > 0 && (newLen < 100 || newLen / originalLen < 0.5);
  if (shrankTooMuch || (hadVerseAnchorBefore && !hasRealVerseAnchor)) {
    body.innerHTML = originalHtml;
  }
}


function isChapterHeadingEl(el: Element): boolean {
  const id = el.getAttribute("id") ?? "";
  const cls = el.getAttribute("class") ?? "";
  const epubType = el.getAttribute("epub:type") ?? "";
  if (cls && CHAPTER_CLASS_RE.test(cls)) return true;
  if (/^chapter[-_]?\d+$/i.test(id) || /^cap[-_]?\d+$/i.test(id) || /^ch[-_]?\d+$/i.test(id)) return true;
  if (epubType && /chapter/i.test(epubType)) return true;
  const tag = el.tagName.toLowerCase();
  const txt = (el.textContent ?? "").trim();
  if ((tag === "h1" || tag === "h2" || tag === "h3") && /(cap[ií]tulo|chapter)\s*\d+/i.test(txt)) {
    return true;
  }
  // <h1>3</h1> / <h2>12</h2> — heading cujo texto é apenas um número 1-150
  if ((tag === "h1" || tag === "h2" || tag === "h3") && /^\d{1,3}$/.test(txt)) {
    const n = parseInt(txt, 10);
    if (n >= 1 && n <= 150) return true;
  }
  return false;
}

/** Tenta extrair o número do capítulo a partir de uma heading reconhecida. */
function chapterNumberFromHeading(el: Element): number | null {
  const id = el.getAttribute("id") ?? "";
  const dataCh = el.getAttribute("data-chapter") ?? "";
  const txt = (el.textContent ?? "").trim();
  for (const src of [dataCh, id, txt]) {
    if (!src) continue;
    const m = src.match(/(\d{1,3})/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 150) return n;
    }
  }
  return null;
}

/** Detecta blocos de "esboço de capítulo" (ex.: "Tópico A (1-6) Tópico B (7-11)"). */
const OUTLINE_PAREN_RE = /\(\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?\s*\)/g;
function findOutlineRoots(doc: Document): Set<Element> {
  const roots = new Set<Element>();
  const candidates = doc.querySelectorAll("p, div, section, header");
  candidates.forEach((el) => {
    const txt = (el.textContent ?? "").trim();
    if (txt.length < 8 || txt.length > 1500) return;
    const matches = txt.match(OUTLINE_PAREN_RE);
    if (matches && matches.length >= 2) roots.add(el);
  });
  return roots;
}

function isInsideOutline(node: Node, outlineRoots: Set<Element>): boolean {
  if (outlineRoots.size === 0) return false;
  let p: Node | null = node.nodeType === 1 ? (node as Element) : node.parentNode;
  while (p && p.nodeType === 1) {
    if (outlineRoots.has(p as Element)) return true;
    p = p.parentNode;
  }
  return false;
}

/** Coleta o texto entre dois marcadores, pulando notas/rodapés/cross-refs
 *  e parando em cabeçalhos de capítulo subsequentes. */
function textBetween(
  doc: Document,
  start: Node,
  end: Node | null,
  outlineRoots: Set<Element> = new Set(),
): string {
  const root = doc.body ?? doc;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  const buf: string[] = [];
  let started = false;
  let node: Node | null = walker.nextNode();
  while (node) {
    if (!started) {
      if (node === start || (start.nodeType === 1 && (start as Element).contains(node))) {
        started = true;
      }
      node = walker.nextNode();
      continue;
    }
    if (end && (node === end || (end.nodeType === 1 && (end as Element).contains(node)))) break;
    if (node.nodeType === 1) {
      const el = node as Element;
      if (isNoisyElement(el) || isChapterHeadingEl(el) || outlineRoots.has(el)) {
        // Pula a subárvore inteira: avança até o próximo nó FORA dela.
        let nxt: Node | null = walker.nextSibling();
        while (!nxt) {
          const parent = walker.parentNode();
          if (!parent) break;
          nxt = walker.nextSibling();
        }
        node = nxt;
        continue;
      }
    } else if (node.nodeType === 3) {
      if (!hasNoisyAncestor(node) && !isInsideOutline(node, outlineRoots)) {
        buf.push(node.nodeValue ?? "");
      }
    }
    node = walker.nextNode();
  }
  return buf.join("").replace(/\s+/g, " ").trim();
}

/** Considera um elemento como marcador de versículo se atender aos padrões TNM/genéricos. */
function isVerseMarker(el: Element): { verse: number; chap?: number } | null {
  // Ignora marcadores dentro de notas/rodapés/cross-refs.
  if (hasNoisyAncestor(el)) return null;

  const id = el.getAttribute("id") ?? "";
  const cls = el.getAttribute("class") ?? "";
  const tag = el.tagName.toLowerCase();
  const epubType = el.getAttribute("epub:type") ?? "";

  // 1) id explicitamente reconhecível
  const fromId = parseChapVerseFromAttr(id);
  if (fromId.verse) return { verse: fromId.verse, chap: fromId.chap };

  // 2) class com "verse"/"vl"/"verseNum"/"vnum"
  const isVerseClass =
    /\b(?:verse(?:num(?:ber)?)?|vnum|vl|vn|vs|v)\b/i.test(cls) ||
    /verse/i.test(epubType);

  // 3) <sup> contendo apenas um número 1-3 dígitos (padrão clássico de Bíblia)
  const txt = (el.textContent ?? "").trim();
  const numOnly = txt.match(/^(\d{1,3})$/);

  if ((isVerseClass || tag === "sup") && numOnly) {
    const n = parseInt(numOnly[1], 10);
    if (n >= 1 && n <= 200) return { verse: n };
  }

  // 4) anchor vazio (id-only) com nome reconhecível
  if (tag === "a" && !txt) {
    const name = el.getAttribute("name") ?? "";
    const fromName = parseChapVerseFromAttr(name);
    if (fromName.verse) return { verse: fromName.verse, chap: fromName.chap };
  }

  return null;
}

/** Heurística: o documento parece uma página de "outline" / "Conteúdo do livro"?
 *  Páginas assim listam tópicos de capítulos com referências entre parênteses
 *  (ex.: "(1-6)") ou são uma sequência de links para `#chapterX_verseY` — e
 *  NÃO devem alimentar o fallback regex de texto puro (sobrescreveria versos
 *  reais com o índice). */
function looksLikeOutlinePage(doc: Document): boolean {
  const body = doc.body;
  if (!body) return false;

  // 1) Pré-scan robusto: se existir QUALQUER âncora real de versículo
  //    (id chapterN_verseN, classe w_ch, verseNum, verse-num) o arquivo
  //    contém texto bíblico real e NUNCA deve ser descartado como outline.
  const bodyHtml = body.innerHTML;
  if (/id=["'][^"']*chapter\d+[_-]?verse\d+/i.test(bodyHtml)) return false;
  if (/class=["'][^"']*(?:\bw_ch\b|verseNum|verse-num|\bverse\b)/i.test(bodyHtml)) return false;

  // 2) Contagem de links de navegação para versos/capítulos.
  let navLinks = 0;
  const anchors = body.getElementsByTagName("a");
  for (let i = 0; i < anchors.length; i++) {
    const href = anchors[i].getAttribute("href") ?? "";
    if (/#chapter|_verse|#v\d/i.test(href)) navLinks++;
  }

  // 3) Critério unificado e conservador: só descarta se for muito claramente
  //    uma página de índice/sumário (sem nenhuma âncora real de versículo, vide 1).
  const manyNavLinks = navLinks >= 15;
  const strongOutlineSignal = findOutlineRoots(doc).size >= 2;

  return manyNavLinks || strongOutlineSignal;
}


interface ExtractedVerse {
  chapter: number;
  verse: number;
  text: string;
  /** "marker" = veio de marcadores DOM reais; "fallback" = regex de texto puro. */
  source: "marker" | "fallback";
}

/** Extrai versículos de um documento xhtml, com inferência de capítulo via filename. */
function extractVersesFromDoc(
  doc: Document,
  fallbackChapter: number,
): ExtractedVerse[] {
  // Hard DOM Purge + descarte do pré-conteúdo (sumário/cabeçalho do livro).
  hardPurgeDoc(doc);
  truncatePreChapterContent(doc);

  // Coleta todos os marcadores possíveis em ordem de documento.
  const allEls = Array.from(doc.getElementsByTagName("*"));
  const markers: VerseMarker[] = [];
  let currentChapter = fallbackChapter;
  const outlineRoots = findOutlineRoots(doc);

  for (const el of allEls) {
    // Pula qualquer elemento dentro de um bloco de esboço.
    if (isInsideOutline(el, outlineRoots)) continue;

    // Detecta heading de capítulo (atualiza currentChapter para os próximos marcadores)
    if (isChapterHeadingEl(el)) {
      const n = chapterNumberFromHeading(el);
      if (n) currentChapter = n;
      else currentChapter += 1; // heading sem número legível → avança 1
      continue;
    }

    const hit = isVerseMarker(el);
    if (!hit) continue;
    let chap = hit.chap ?? currentChapter;
    if (hit.chap) {
      currentChapter = hit.chap;
    } else if (hit.verse === 1 && markers.length > 0) {
      // Sem indicação de capítulo, mas o versículo reiniciou em 1 e já tínhamos
      // versículos > 1 no capítulo atual → assume troca de capítulo.
      const last = markers[markers.length - 1];
      if (last.chapter === currentChapter && last.verse > 1) {
        currentChapter += 1;
        chap = currentChapter;
      }
    }
    markers.push({ node: el, chapter: chap, verse: hit.verse });
  }


  // Sem marcadores → tenta regex texto puro (raro mas backup).
  if (markers.length < 3) {
    // Páginas de "outline" / sumário NUNCA devem alimentar o fallback —
    // o texto delas sobrescreveria versículos reais vindos de outros arquivos
    // do mesmo bucket (ex.: 1 Pedro "Conteúdo do livro").
    if (looksLikeOutlinePage(doc)) return [];

    const plain = (doc.body?.textContent ?? "").replace(/\s+/g, " ").trim();
    const out: ExtractedVerse[] = [];
    const regex = /(?:^|\s|[.;!?»"”])(\d{1,3})\s+(.{3,}?)(?=\s+\d{1,3}\s+|$)/g;
    let m: RegExpExecArray | null;
    let chap = fallbackChapter;
    while ((m = regex.exec(plain)) !== null) {
      const v = parseInt(m[1], 10);
      if (v < 1 || v > 200) continue;
      const t = m[2].trim();
      if (!t) continue;
      if (v === 1 && out.length > 0 && out[out.length - 1].verse > 1) chap++;
      out.push({ chapter: chap, verse: v, text: t, source: "fallback" });
    }
    return out;
  }

  // Para cada marcador, coleta o texto entre ele e o próximo.
  const out: ExtractedVerse[] = [];
  for (let i = 0; i < markers.length; i++) {
    const cur = markers[i];
    const next = markers[i + 1]?.node ?? null;
    let text = textBetween(doc, cur.node, next, outlineRoots);
    // Remove o número do versículo se ele aparecer "colado" no início.
    text = text.replace(new RegExp(`^\\s*${cur.verse}\\s*[\\.\\)]?\\s*`), "");
    text = text.replace(/\s{2,}/g, " ").trim();
    if (text.length < 2) continue;
    // Sanity-check de tamanho — versículos absurdamente longos indicam que algo
    // do tipo apêndice/rodapé escapou do filtro; trunca no primeiro ponto após 600 chars.
    if (text.length > 1200) {
      const cut = text.slice(0, 600);
      const dot = text.indexOf(". ", 600);
      text = dot > 0 && dot < 1200 ? text.slice(0, dot + 1) : cut + "…";
      // eslint-disable-next-line no-console
      console.warn("[epub-bible] long verse truncated", cur.chapter, cur.verse, text.length);
    }
    out.push({ chapter: cur.chapter, verse: cur.verse, text, source: "marker" });
  }
  return out;
}


/** Detecta a qual livro canônico um arquivo XHTML pertence.
 *  Ordem: filename → headings (h1/h2/h3/title) → primeiras palavras do body.
 */
function detectCanonicalBookForDoc(href: string, doc: Document): { book: CanonicalBook; label: string } | null {
  // 1) filename: mt_07.xhtml, matthew-01.xhtml, 40-Mat-01.xhtml, gn1.xhtml...
  const base = (href.split("/").pop() ?? "").replace(/\.[^.]+$/, "");
  const baseClean = base.replace(/[_\-.\d]+/g, " ").trim();
  const fromFile = baseClean ? resolveCanonical(baseClean) : null;
  if (fromFile) return { book: fromFile, label: fromFile.english };

  // 2) headings/title
  const headings = [
    doc.getElementsByTagName("h1")[0]?.textContent ?? "",
    doc.getElementsByTagName("h2")[0]?.textContent ?? "",
    doc.getElementsByTagName("h3")[0]?.textContent ?? "",
    doc.getElementsByTagName("title")[0]?.textContent ?? "",
  ];
  for (const h of headings) {
    const text = h.trim();
    if (!text) continue;
    const hit = findCanonicalInText(text);
    if (hit) {
      // Limpa sufixo de capítulo do label, mantendo o nome do livro como aparece no EPUB
      const label = text.replace(/\s+\d{1,3}.*$/, "").trim() || hit.english;
      return { book: hit, label };
    }
  }

  // 3) primeiros ~300 chars do body
  const body = (doc.body?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (body) {
    const hit = findCanonicalInText(body);
    if (hit) return { book: hit, label: hit.english };
  }

  return null;
}

/** Função principal: parseia um File EPUB e devolve livros + versículos. */
export async function parseEpub(file: File, onProgress?: ParseProgress): Promise<ParsedEpub> {
  onProgress?.("unzip", 0);
  const zip = await JSZip.loadAsync(file);
  onProgress?.("unzip", 1);

  onProgress?.("parse-opf", 0);
  const opfPath = await findOpfPath(zip);
  const opf = await parseOpf(zip, opfPath);
  onProgress?.("parse-opf", 1);

  // eslint-disable-next-line no-console
  console.info(`[epub-bible] OPF: ${opfPath}  | spine=${opf.spine.length}`);

  // Agrupa os arquivos do spine por livro canônico detectado.
  type Bucket = { book: CanonicalBook; label: string; hrefs: string[] };
  const buckets = new Map<string, Bucket>(); // key = canon.id
  let skipped = 0;

  for (let i = 0; i < opf.spine.length; i++) {
    onProgress?.("index-books", (i / Math.max(opf.spine.length, 1)) * 0.3);
    const idref = opf.spine[i];
    const item = opf.manifest.get(idref);
    if (!item) continue;
    const path = resolvePath(opf.basePath, item.href);
    const f = zip.file(path);
    if (!f) continue;
    let doc: Document;
    try {
      const html = await f.async("string");
      doc = new DOMParser().parseFromString(html, XHTML_MIME);
    } catch {
      skipped++;
      continue;
    }
    const detection = detectCanonicalBookForDoc(path, doc);
    if (!detection) {
      skipped++;
      continue;
    }
    const existing = buckets.get(detection.book.id);
    if (existing) {
      existing.hrefs.push(path);
    } else {
      buckets.set(detection.book.id, {
        book: detection.book,
        label: detection.label,
        hrefs: [path],
      });
    }
  }

  // eslint-disable-next-line no-console
  console.info(`[epub-bible] canonical buckets=${buckets.size}  skipped=${skipped}`);

  // Extrai versículos de cada bucket.
  const books: ParsedBookInfo[] = [];
  const verses: ParsedVerse[] = [];
  const sortedBuckets = Array.from(buckets.values()).sort((a, b) => a.book.order - b.book.order);

  const total = Math.max(sortedBuckets.length, 1);
  for (let bi = 0; bi < sortedBuckets.length; bi++) {
    onProgress?.("index-books", 0.3 + (bi / total) * 0.7);
    const bucket = sortedBuckets[bi];
    const bookId = bucket.book.id;
    const multiFile = bucket.hrefs.length > 1;

    // Dedup por chave "chap:verse". Regra:
    //  - texto vindo de marcadores DOM reais ("marker") substitui qualquer
    //    versão anterior se for mais longo (ou se a anterior veio do fallback).
    //  - texto vindo do fallback regex ("fallback") só preenche chaves ainda
    //    vazias — NUNCA sobrescreve verso real (proteção contra "Conteúdo
    //    do livro" sobrescrever 1 Pedro 1:4 etc.).
    const verseMap = new Map<
      string,
      { chapter: number; verse: number; text: string; source: "marker" | "fallback" }
    >();

    for (let hi = 0; hi < bucket.hrefs.length; hi++) {
      const href = bucket.hrefs[hi];
      const f = zip.file(href);
      if (!f) continue;
      try {
        const html = await f.async("string");
        const doc = new DOMParser().parseFromString(html, XHTML_MIME);
        const chapByName = chapterFromFilename(href);
        const chapByHead = chapterFromHeading(doc);
        const fallback = chapByName ?? chapByHead ?? (multiFile ? hi + 1 : 1);
        const extracted = extractVersesFromDoc(doc, fallback);

        for (const v of extracted) {
          const key = `${v.chapter}:${v.verse}`;
          const prev = verseMap.get(key);
          if (!prev) {
            verseMap.set(key, v);
            continue;
          }
          // Marker sempre vence fallback. Entre dois do mesmo tipo, o mais longo vence.
          if (v.source === "marker" && prev.source === "fallback") {
            verseMap.set(key, v);
          } else if (v.source === prev.source && v.text.length > prev.text.length) {
            verseMap.set(key, v);
          }
          // fallback novo vs marker existente → mantém o marker (não sobrescreve).
        }
      } catch {
        /* arquivo malformado — ignora */
      }
    }


    const bookVerses = Array.from(verseMap.values());
    if (bookVerses.length < 3) {
      // eslint-disable-next-line no-console
      console.warn(`[epub-bible] skip canon "${bucket.book.english}" (verses=${bookVerses.length})`);
      continue;
    }

    const displayName = bucket.label || bucket.book.english;
    const chapsCount = new Set(bookVerses.map((v) => v.chapter)).size;
    // eslint-disable-next-line no-console
    console.info(
      `[epub-bible] book ${bucket.book.id} ${bucket.book.english}  chapters=${chapsCount}  verses=${bookVerses.length}`,
    );
    books.push({
      bookId,
      displayName,
      aliases: Array.from(new Set([displayName, ...bucket.book.aliases, ...buildAliases(displayName)])),
      order: bucket.book.order,
    });
    for (const v of bookVerses) {
      verses.push({ bookId, chapter: v.chapter, verse: v.verse, text: v.text });
    }

    if (bi % 3 === 2) await new Promise((r) => setTimeout(r, 0));
  }
  onProgress?.("index-books", 1);

  // Diagnóstico de livros canônicos faltantes
  const foundIds = new Set(books.map((b) => b.bookId));
  const missing = CANON.filter((c) => !foundIds.has(c.id)).map((c) => `${c.id} ${c.english}`);
  // eslint-disable-next-line no-console
  console.info(
    `[epub-bible] DONE  books=${books.length}/66  verses=${verses.length}  missing=${missing.length}`,
    missing.length ? missing : "",
  );

  // Garante 'order' consistente
  books.sort((a, b) => a.order - b.order);

  return { meta: opf.meta, books, verses };
}

// Suprime avisos de "símbolos não utilizados" para utilitários legados
// que ficam à disposição para diagnósticos futuros.
void normalizeName;
void buildBookSlots;
void groupFlatEntries;


