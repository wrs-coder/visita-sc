import React from "react";
import { findCitations, type BookInfo } from "@/lib/bible-refs";
import { VerseLink } from "@/components/bible/BibleVersePopover";
import type { BibleLibrary } from "@/lib/bible-notes-store";
import { RICH_NOTE_CONTENT_CLASS } from "@/lib/rich-note-styles";

// ============================================================================
// Sanitizer (whitelist mínima) — aceita apenas tags/atributos usados pelo
// editor Tiptap. Tudo o que vier de fora dessa lista é removido.
// ============================================================================

const ALLOWED_TAGS = new Set([
  "P", "BR", "UL", "OL", "LI", "STRONG", "EM", "U", "B", "I",
  "H1", "H2", "H3", "SPAN", "MARK",
  "BLOCKQUOTE", "PRE", "CODE", "HR",
  "TABLE", "THEAD", "TBODY", "TR", "TD", "TH",
  "SUB", "SUP", "A", "S", "DEL", "LABEL", "INPUT", "DIV",
]);

// Estilos inline preservados (mesmos que o editor produz).
const STYLE_KEY_WHITELIST = new Set([
  "color",
  "background-color",
  "text-indent",
  "margin-left",
  "margin-right",
  "margin-top",
  "margin-bottom",
  "padding-left",
  "line-height",
  "font-size",
  "text-align",
  "font-weight",
  "font-style",
  "font-family",
]);
const COLOR_VALUE_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\([\d.,\s%/]+\)|[a-zA-Z]+)$/;
// Valores seguros: números com unidade, palavras-chave simples, listas de fontes.
const SAFE_VALUE_RE = /^[-a-zA-Z0-9.,%'"\s]+$/;
const UNSAFE_VALUE_RE = /(url\s*\(|expression|javascript:|@import|;|\{|\})/i;

function isSafeStyleValue(key: string, value: string): boolean {
  if (!value || value.length > 120) return false;
  if (UNSAFE_VALUE_RE.test(value)) return false;
  if (key === "color" || key === "background-color") return COLOR_VALUE_RE.test(value);
  return SAFE_VALUE_RE.test(value);
}

function sanitizeStyle(raw: string): string {
  if (!raw) return "";
  return raw
    .split(";")
    .map((decl) => decl.trim())
    .filter(Boolean)
    .map((decl) => {
      const idx = decl.indexOf(":");
      if (idx < 0) return null;
      const key = decl.slice(0, idx).trim().toLowerCase();
      const value = decl.slice(idx + 1).trim();
      if (!STYLE_KEY_WHITELIST.has(key)) return null;
      if (!isSafeStyleValue(key, value)) return null;
      return `${key}: ${value}`;
    })
    .filter((s): s is string => !!s)
    .join("; ");
}

const KEEP_ATTRS = new Set([
  "data-type",
  "data-checked",
  "data-align",
  "colspan",
  "rowspan",
  "start",
  "type",
  "checked",
  "disabled",
]);

function isSafeHref(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v.startsWith("http://") || v.startsWith("https://") || v.startsWith("mailto:");
}

function sanitizeElement(el: Element): void {
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (name === "style") {
      const safe = sanitizeStyle(attr.value);
      if (safe) el.setAttribute("style", safe);
      else el.removeAttribute("style");
    } else if (name === "href" && el.tagName === "A") {
      if (isSafeHref(attr.value)) {
        el.setAttribute("rel", "noopener noreferrer");
        el.setAttribute("target", "_blank");
      } else {
        el.removeAttribute("href");
      }
    } else if (name === "rel" || name === "target") {
      // mantidos apenas quando setados acima
      if (el.tagName !== "A") el.removeAttribute(name);
    } else if (KEEP_ATTRS.has(name)) {
      // preservado
    } else {
      el.removeAttribute(name);
    }
  }

  // Recursivo. Tags fora da whitelist são "unwrapped" (filhos sobem),
  // preservando o texto e nunca quebrando o layout.
  const children = Array.from(el.children);
  for (const child of children) {
    if (!ALLOWED_TAGS.has(child.tagName)) {
      while (child.firstChild) el.insertBefore(child.firstChild, child);
      child.remove();
    } else {
      sanitizeElement(child);
    }
  }
}


/**
 * Sanitiza HTML produzido pelo editor. Whitelist estrita de tags/atributos.
 * Idempotente. Retorna string vazia para entradas inválidas.
 */
export function sanitizeNoteHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  if (typeof window === "undefined" || !("DOMParser" in window)) return html;
  const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, "text/html");
  const root = doc.getElementById("__root");
  if (!root) return "";
  sanitizeElement(root);
  return root.innerHTML;
}

// ============================================================================
// Renderização rich + citações
// ============================================================================

const STYLE_PROP_MAP: Record<string, keyof React.CSSProperties> = {
  "color": "color",
  "background-color": "backgroundColor",
  "text-indent": "textIndent",
  "margin-left": "marginLeft",
  "margin-right": "marginRight",
  "margin-top": "marginTop",
  "margin-bottom": "marginBottom",
  "padding-left": "paddingLeft",
  "line-height": "lineHeight",
  "font-size": "fontSize",
  "text-align": "textAlign",
  "font-weight": "fontWeight",
  "font-style": "fontStyle",
  "font-family": "fontFamily",
};

function styleObjectFromAttr(styleAttr: string | null): React.CSSProperties | undefined {
  if (!styleAttr) return undefined;
  const out: Record<string, string> = {};
  for (const decl of styleAttr.split(";")) {
    const idx = decl.indexOf(":");
    if (idx < 0) continue;
    const key = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (!key || !value) continue;
    const prop = STYLE_PROP_MAP[key];
    if (!prop) continue;
    out[prop as string] = value;
  }
  return Object.keys(out).length > 0 ? (out as React.CSSProperties) : undefined;
}


let _keySeed = 0;
function nextKey(): string {
  _keySeed = (_keySeed + 1) % 1_000_000;
  return `rk-${_keySeed}`;
}

function renderTextWithCitations(
  text: string,
  books: BookInfo[] | undefined,
  libraryId: string | null,
  fontScale: number | undefined,
): React.ReactNode {
  if (!text) return text;
  const matches = findCitations(books, text);
  if (matches.length === 0) return text;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.index > cursor) parts.push(text.slice(cursor, m.index));
    parts.push(
      <VerseLink
        key={`${nextKey()}-${i}`}
        match={m}
        libraryId={libraryId}
        fontScale={fontScale}
      />,
    );
    cursor = m.index + m.length;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

interface RenderOpts {
  library: BibleLibrary | null;
  fontScale?: number;
}

function renderNode(node: Node, opts: RenderOpts): React.ReactNode {
  const books = opts.library?.books;
  const libraryId = opts.library?.id ?? null;

  if (node.nodeType === Node.TEXT_NODE) {
    return renderTextWithCitations(node.nodeValue ?? "", books, libraryId, opts.fontScale);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const tag = el.tagName;
  if (!ALLOWED_TAGS.has(tag)) {
    return Array.from(el.childNodes).map((c) => (
      <React.Fragment key={nextKey()}>{renderNode(c, opts)}</React.Fragment>
    ));
  }

  const children = Array.from(el.childNodes).map((c) => (
    <React.Fragment key={nextKey()}>{renderNode(c, opts)}</React.Fragment>
  ));

  const style = styleObjectFromAttr(el.getAttribute("style"));
  const key = nextKey();
  const lower = tag.toLowerCase();

  switch (lower) {
    case "br":
      return <br key={key} />;
    case "p":
      return <p key={key} style={style} className="my-1">{children}</p>;
    case "ul":
      return <ul key={key} className="list-disc pl-6 space-y-1 my-2" style={style}>{children}</ul>;
    case "ol":
      return <ol key={key} className="list-decimal pl-6 space-y-1 my-2" style={style}>{children}</ol>;
    case "li":
      return <li key={key} style={style}>{children}</li>;
    case "h2":
      return <h2 key={key} className="text-xl font-bold mt-3 mb-1" style={style}>{children}</h2>;
    case "h3":
      return <h3 key={key} className="text-base font-semibold mt-2 mb-1" style={style}>{children}</h3>;
    case "strong":
    case "b":
      return <strong key={key} style={style}>{children}</strong>;
    case "em":
    case "i":
      return <em key={key} style={style}>{children}</em>;
    case "u":
      return <u key={key} style={style}>{children}</u>;
    case "mark":
      return <mark key={key} className="rounded px-0.5" style={style}>{children}</mark>;
    case "span":
      return <span key={key} style={style}>{children}</span>;
    default:
      return <span key={key} style={style}>{children}</span>;
  }
}

/** Detecta se a string parece conter HTML (vs texto puro). */
export function looksLikeHtml(s: string): boolean {
  if (!s) return false;
  return /<\/?[a-zA-Z][\s\S]*?>/.test(s);
}

/**
 * Renderiza o conteúdo da nota preservando a formatação rich e substituindo
 * citações bíblicas detectadas dentro de QUALQUER text node por VerseLinks
 * clicáveis (mesmo dentro de spans coloridos, marca-texto, bullets, etc.).
 *
 * Aceita também texto puro (notas antigas) — caso em que cai no caminho
 * `whitespace-pre-wrap` simples.
 */
export function RichOutlineContent({
  html,
  library,
  fontScale,
  emptyFallback,
}: {
  html: string;
  library: BibleLibrary | null;
  fontScale?: number;
  emptyFallback?: React.ReactNode;
}): React.ReactElement {
  if (!html || !html.trim()) {
    return <>{emptyFallback ?? null}</>;
  }

  if (!looksLikeHtml(html)) {
    return (
      <div className="whitespace-pre-wrap">
        {renderTextWithCitations(html, library?.books, library?.id ?? null, fontScale)}
      </div>
    );
  }

  if (typeof window === "undefined" || !("DOMParser" in window)) {
    return <div className="whitespace-pre-wrap">{html}</div>;
  }

  const safe = sanitizeNoteHtml(html);
  const doc = new DOMParser().parseFromString(`<div id="__root">${safe}</div>`, "text/html");
  const root = doc.getElementById("__root");
  if (!root) return <></>;
  const nodes = Array.from(root.childNodes).map((n) => (
    <React.Fragment key={nextKey()}>{renderNode(n, { library, fontScale })}</React.Fragment>
  ));
  return <>{nodes}</>;
}
