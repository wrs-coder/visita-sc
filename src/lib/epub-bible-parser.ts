// EPUB Bible parser — universal, resiliente, 100% client-side.
// Lê um arquivo .epub e devolve { meta, books, verses }.
// Sem dependências de idioma: nomes de livros vêm do próprio arquivo.

import JSZip from "jszip";

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
  hrefs: string[]; // arquivos xhtml deste livro
}

/** Constrói a lista de livros usando nav.xhtml > toc.ncx > spine. */
async function buildBookSlots(zip: JSZip, opf: OpfData): Promise<BookSlot[]> {
  // 1) Tenta nav.xhtml (EPUB3)
  const navItem = Array.from(opf.manifest.values()).find(
    (m) => m.mediaType === XHTML_MIME && /nav/i.test(m.href),
  );
  if (navItem) {
    const path = resolvePath(opf.basePath, navItem.href);
    const navFile = zip.file(path);
    if (navFile) {
      const html = await navFile.async("string");
      const doc = new DOMParser().parseFromString(html, XHTML_MIME);
      // procura nav[epub:type=toc] ou primeiro nav com lista
      const navs = Array.from(doc.getElementsByTagName("nav"));
      const tocNav =
        navs.find((n) => (n.getAttribute("epub:type") ?? "").includes("toc")) ?? navs[0];
      if (tocNav) {
        const links = Array.from(tocNav.getElementsByTagName("a"));
        const slots: BookSlot[] = [];
        for (const a of links) {
          const name = (a.textContent ?? "").trim();
          const href = a.getAttribute("href") ?? "";
          if (!name || !href) continue;
          const hrefPath = resolvePath(opf.basePath, href.split("#")[0]);
          if (!hrefPath) continue;
          slots.push({ displayName: name, hrefs: [hrefPath] });
        }
        if (slots.length >= 5) return slots;
      }
    }
  }

  // 2) Fallback: toc.ncx
  const ncxItem = Array.from(opf.manifest.values()).find((m) =>
    m.mediaType.includes("ncx") || m.href.toLowerCase().endsWith(".ncx"),
  );
  if (ncxItem) {
    const path = resolvePath(opf.basePath, ncxItem.href);
    const ncxFile = zip.file(path);
    if (ncxFile) {
      const xml = await ncxFile.async("string");
      const doc = new DOMParser().parseFromString(xml, XML_MIME);
      const points = Array.from(doc.getElementsByTagName("navPoint"));
      const slots: BookSlot[] = [];
      for (const p of points) {
        const name = p.getElementsByTagName("text")[0]?.textContent?.trim() ?? "";
        const content = p.getElementsByTagName("content")[0]?.getAttribute("src") ?? "";
        if (!name || !content) continue;
        const hrefPath = resolvePath(opf.basePath, content.split("#")[0]);
        slots.push({ displayName: name, hrefs: [hrefPath] });
      }
      if (slots.length >= 5) return slots;
    }
  }

  // 3) Último fallback: spine — cada item vira um "livro" usando <title> ou <h1>
  const slots: BookSlot[] = [];
  for (const idref of opf.spine) {
    const item = opf.manifest.get(idref);
    if (!item) continue;
    const path = resolvePath(opf.basePath, item.href);
    const file = zip.file(path);
    if (!file) continue;
    const html = await file.async("string");
    const doc = new DOMParser().parseFromString(html, XHTML_MIME);
    const name =
      doc.getElementsByTagName("title")[0]?.textContent?.trim() ||
      doc.getElementsByTagName("h1")[0]?.textContent?.trim() ||
      doc.getElementsByTagName("h2")[0]?.textContent?.trim() ||
      `Item ${slots.length + 1}`;
    slots.push({ displayName: name, hrefs: [path] });
  }
  return slots;
}

/** Extrai versículos de um documento xhtml. Retorna lista por capítulo. */
function extractVersesFromDoc(doc: Document): { chapter: number; verse: number; text: string }[] {
  const out: { chapter: number; verse: number; text: string }[] = [];

  // Estratégia 1: TNM/JW — elementos com id começando em "v" no formato "vNN-CC-VV"
  // ou classes verse/v.
  const candidates: Element[] = [];
  doc.querySelectorAll('[id^="v"], [id^="chapter"], .v, .verse, [class*="verse"]').forEach((el) => {
    candidates.push(el);
  });

  if (candidates.length >= 3) {
    let currentChapter = 1;
    for (const el of candidates) {
      const id = el.getAttribute("id") ?? "";
      const cls = el.getAttribute("class") ?? "";
      // Tenta extrair chapter/verse do id (formatos: v1-2-3, c1v1, v001002003, etc.)
      let chap = 0;
      let vers = 0;

      const m1 = id.match(/(\d+)[-_:.](\d+)[-_:.](\d+)/); // book-chap-vers
      const m2 = id.match(/c?(\d+)[vV](\d+)/);            // c1v2
      const m3 = id.match(/v(\d{2,3})(\d{3})/);           // v001002 (chap+vers)
      const m4 = id.match(/v(\d+)/);                       // só vers
      if (m1) { chap = parseInt(m1[2], 10); vers = parseInt(m1[3], 10); }
      else if (m2) { chap = parseInt(m2[1], 10); vers = parseInt(m2[2], 10); }
      else if (m3) { chap = parseInt(m3[1], 10); vers = parseInt(m3[2], 10); }
      else if (m4) { vers = parseInt(m4[1], 10); chap = currentChapter; }

      // Detecta cabeçalho de capítulo via classe
      if (/chapter|chap|cap/i.test(cls) || /chapter/i.test(id)) {
        const cn = id.match(/(\d+)/);
        if (cn) currentChapter = parseInt(cn[1], 10);
        continue;
      }

      if (chap > 0) currentChapter = chap;
      if (!vers) continue;
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      // Remove o número do versículo do início, se presente
      const cleaned = text.replace(new RegExp(`^${vers}\\s+`), "");
      out.push({ chapter: currentChapter || 1, verse: vers, text: cleaned });
    }
    if (out.length >= 3) return out;
  }

  // Estratégia 2: EPUB3 genérico — [epub\:type="verse"]
  try {
    const epubVerses = doc.querySelectorAll('[*|type="verse"]');
    if (epubVerses.length >= 3) {
      let currentChapter = 1;
      epubVerses.forEach((el, i) => {
        const id = el.getAttribute("id") ?? "";
        const m = id.match(/(\d+)/g);
        const vers = m ? parseInt(m[m.length - 1], 10) : i + 1;
        const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
        if (text) out.push({ chapter: currentChapter, verse: vers, text });
      });
      if (out.length >= 3) return out;
    }
  } catch {
    /* algumas implementações do DOMParser não suportam *|type */
  }

  // Estratégia 3: regex no texto puro
  const plain = (doc.body?.textContent ?? "").replace(/\s+/g, " ").trim();
  if (plain) {
    const regex = /(?:^|\s)(\d{1,3})\s+([^\d]{3,}?)(?=\s+\d{1,3}\s|$)/g;
    let currentChapter = 1;
    let m: RegExpExecArray | null;
    const buffer: { chapter: number; verse: number; text: string }[] = [];
    while ((m = regex.exec(plain)) !== null) {
      const v = parseInt(m[1], 10);
      const t = m[2].trim();
      if (!t) continue;
      // Heurística: se o número resetar para 1 e já vimos versículos, novo capítulo
      if (v === 1 && buffer.length > 0 && buffer[buffer.length - 1].verse > 1) {
        currentChapter++;
      }
      buffer.push({ chapter: currentChapter, verse: v, text: t });
    }
    if (buffer.length >= 3) return buffer;
  }

  return out;
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

  const slots = await buildBookSlots(zip, opf);

  const books: ParsedBookInfo[] = [];
  const verses: ParsedVerse[] = [];

  const total = Math.max(slots.length, 1);
  for (let i = 0; i < slots.length; i++) {
    onProgress?.("index-books", i / total);
    const slot = slots[i];
    const bookId = `B${String(books.length + 1).padStart(2, "0")}`;

    const bookVerses: ParsedVerse[] = [];
    const chaptersSeen = new Set<number>();
    for (const href of slot.hrefs) {
      const f = zip.file(href);
      if (!f) continue;
      try {
        const html = await f.async("string");
        const doc = new DOMParser().parseFromString(html, XHTML_MIME);
        const extracted = extractVersesFromDoc(doc);
        for (const v of extracted) {
          chaptersSeen.add(v.chapter);
          bookVerses.push({ bookId, chapter: v.chapter, verse: v.verse, text: v.text });
        }
      } catch {
        /* arquivo malformado — ignora */
      }
    }

    // Filtro de validade: pelo menos 1 capítulo e 3 versículos
    if (chaptersSeen.size < 1 || bookVerses.length < 3) continue;

    books.push({
      bookId,
      displayName: slot.displayName,
      aliases: buildAliases(slot.displayName),
      order: books.length + 1,
    });
    verses.push(...bookVerses);

    // Cede o thread a cada 5 livros para não travar
    if (i % 5 === 4) await new Promise((r) => setTimeout(r, 0));
  }
  onProgress?.("index-books", 1);

  return { meta: opf.meta, books, verses };
}
