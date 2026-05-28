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
const NOISY_CLASS_RE = /\b(fn|footnote|footnotes|note|notes|rearnote|annotation|xref|cross|crossref|study|caption|figcaption|byline|callout|sidebar)\b/i;
const NOISY_EPUB_TYPE_RE = /(footnote|rearnote|annotation|note-ref|noteref)/i;
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

const CHAPTER_CLASS_RE = /\b(chapter|cap[ií]tulo|chap|chapno|chap-?num|chapter-?num(?:ber)?|cn|ch)\b/i;

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

/** Coleta o texto entre dois marcadores, pulando notas/rodapés/cross-refs
 *  e parando em cabeçalhos de capítulo subsequentes. */
function textBetween(doc: Document, start: Node, end: Node | null): string {
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
      if (isNoisyElement(el) || isChapterHeadingEl(el)) {
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
      if (!hasNoisyAncestor(node)) {
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

/** Extrai versículos de um documento xhtml, com inferência de capítulo via filename. */
function extractVersesFromDoc(
  doc: Document,
  fallbackChapter: number,
): { chapter: number; verse: number; text: string }[] {
  // Coleta todos os marcadores possíveis em ordem de documento.
  const allEls = Array.from(doc.getElementsByTagName("*"));
  const markers: VerseMarker[] = [];
  let currentChapter = fallbackChapter;

  for (const el of allEls) {
    // Detecta cabeçalho de capítulo (atualiza o "currentChapter" para os próximos marcadores)
    const id = el.getAttribute("id") ?? "";
    const cls = el.getAttribute("class") ?? "";
    const isChapterHeader =
      /chapter|cap[ií]tulo/i.test(cls) ||
      /^chapter[-_]?\d+$/i.test(id) ||
      /^cap[-_]?\d+$/i.test(id);
    if (isChapterHeader) {
      const cn = (id + " " + (el.textContent ?? "")).match(/(\d{1,3})/);
      if (cn) currentChapter = parseInt(cn[1], 10);
      continue;
    }

    const hit = isVerseMarker(el);
    if (!hit) continue;
    const chap = hit.chap ?? currentChapter;
    if (hit.chap) currentChapter = hit.chap;
    markers.push({ node: el, chapter: chap, verse: hit.verse });
  }

  // Sem marcadores → tenta regex texto puro (raro mas backup).
  if (markers.length < 3) {
    const plain = (doc.body?.textContent ?? "").replace(/\s+/g, " ").trim();
    const out: { chapter: number; verse: number; text: string }[] = [];
    const regex = /(?:^|\s|[.;!?»"”])(\d{1,3})\s+(.{3,}?)(?=\s+\d{1,3}\s+|$)/g;
    let m: RegExpExecArray | null;
    let chap = fallbackChapter;
    while ((m = regex.exec(plain)) !== null) {
      const v = parseInt(m[1], 10);
      if (v < 1 || v > 200) continue;
      const t = m[2].trim();
      if (!t) continue;
      if (v === 1 && out.length > 0 && out[out.length - 1].verse > 1) chap++;
      out.push({ chapter: chap, verse: v, text: t });
    }
    return out;
  }

  // Para cada marcador, coleta o texto entre ele e o próximo.
  const out: { chapter: number; verse: number; text: string }[] = [];
  for (let i = 0; i < markers.length; i++) {
    const cur = markers[i];
    const next = markers[i + 1]?.node ?? null;
    let text = textBetween(doc, cur.node, next);
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
    out.push({ chapter: cur.chapter, verse: cur.verse, text });
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

    // Dedup por chave "chap:verse" — mantém o texto mais longo.
    const verseMap = new Map<string, { chapter: number; verse: number; text: string }>();

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

        const distinctChaps = new Set(extracted.map((v) => v.chapter));
        const overrideChapter =
          multiFile && distinctChaps.size <= 1 && fallback !== 1 ? fallback : null;
        for (const v of extracted) {
          const chap = overrideChapter ?? v.chapter;
          const key = `${chap}:${v.verse}`;
          const prev = verseMap.get(key);
          if (!prev || v.text.length > prev.text.length) {
            verseMap.set(key, { chapter: chap, verse: v.verse, text: v.text });
          }
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


