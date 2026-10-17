/**
 * Limpa o HTML colado do Microsoft Word/Office antes de entrar no editor de
 * esboços. Função pura (só strings) — conteúdo que NÃO veio do Word volta
 * exatamente igual, preservando o comportamento atual da colagem.
 */

const WORD_MARKERS = /(urn:schemas-microsoft-com:office|class=["']?Mso|mso-[a-z-]+\s*:|<o:p\b|class=["']?OutlineElement|data-ccp-props|class=["']?(?:Paragraph|TextRun)\b)/i;

export function isWordHtml(html: string): boolean {
  return !!html && WORD_MARKERS.test(html);
}

const INVISIBLE_RE = /[\u00AD\u200B\u200C\u200D\uFEFF]/g;
const LIST_BLOCK_RE = /<!--\[if !supportLists\]-->([\s\S]*?)<!--\[endif\]-->/i;

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();
}

const PX_PER: Record<string, number> = { px: 1, pt: 4 / 3, cm: 96 / 2.54, mm: 96 / 25.4, in: 96, pc: 16 };

/** Converte medida do Word (cm, pt, in, px...) em pixels. */
export function toPx(v: string): number {
  const m = /^(-?[\d.]+)\s*(px|pt|cm|mm|in|pc)?$/i.exec(v.trim().replace(",", "."));
  if (!m) return 0;
  return parseFloat(m[1]) * PX_PER[(m[2] || "px").toLowerCase()];
}

/** 1,25 cm / 36 pt / 0,5 in (~48px) = 1 nível do editor (32px). */
export function indentLevel(px: number): number {
  return Math.min(8, Math.max(0, Math.round(px / 48)));
}

function normalizeIndent(style: string, dropIndent: boolean): string {
  let ml = 0;
  let ti = 0;
  let forced: number | null = null;
  const rest: string[] = [];
  for (const d of style.split(";")) {
    const i = d.indexOf(":");
    const key = d.slice(0, i).trim().toLowerCase();
    const val = d.slice(i + 1).trim();
    if (key === "x-level") forced = Math.min(8, Math.max(0, parseInt(val, 10) || 0));
    else if (key === "x-bold") continue;
    else if (key === "x-tab-indent") ml += toPx(val);
    else if (key === "margin-left" || key === "padding-left") ml = Math.max(ml, toPx(val));
    else if (key === "text-indent") ti = toPx(val);
    else if (key === "margin") {
      const parts = val.split(/\s+/);
      const left = parts[3] ?? parts[1] ?? parts[0];
      if (left) ml = Math.max(ml, toPx(left));
    } else rest.push(d);
  }
  const tabs = /x-tab-indent:\s*([\d.]+)px/i.exec(style);
  const lvl = dropIndent
    ? 0
    : forced !== null
      ? Math.min(8, forced + (tabs ? Math.round(parseFloat(tabs[1]) / 48) : 0))
      : indentLevel(ml + Math.max(0, ti));
  if (lvl) rest.push(`margin-left:${lvl * 32}px`);
  return rest.join(";");
}

function cleanStyle(style: string, dropIndent = false): string {
  return normalizeIndent(style, dropIndent)
    .split(";")
    .map((d) => d.trim())
    .filter((d) => {
      if (!d) return false;
      const key = d.slice(0, d.indexOf(":")).trim().toLowerCase();
      if (!key || key.startsWith("mso-")) return false;
      // Fundos, fontes do Windows, larguras e tamanhos fixos quebram o modo
      // escuro e a tela do celular.
      return ![
        "background",
        "background-color",
        "font-family",
        "width",
        "height",
        "line-height",
        "margin-top",
        "margin-bottom",
        "margin-right",
        "tab-stops",
        "text-autospace",
        "page-break-before",
        "border",
        "margin",
      ].includes(key);
    })
    .join(";");
}

function cleanAttributes(html: string): string {
  // Remove classes, lang e larguras; limpa estilos.
  return html
    .replace(/\s(class|lang|width|height|align|valign|border|cellspacing|cellpadding)=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\sstyle=("([^"]*)"|'([^']*)')/gi, (_m, _q, a, b) => {
      const cleaned = cleanStyle((a ?? b ?? "").replace(/\s+/g, " "));
      return cleaned ? ` style="${cleaned}"` : "";
    });
}

function convertLists(html: string): string {
  // Cada parágrafo de lista do Word vira <li data-wl="ul|ol">.
  const withItems = html.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (full, attrs: string, inner: string) => {
    const block = LIST_BLOCK_RE.exec(inner);
    const isList = !!block || /MsoListParagraph|mso-list\s*:/i.test(attrs);
    if (!isList) return full;
    const glyph = block ? stripTags(block[1]) : "";
    const ordered = /^(\(?[0-9]+|[a-zA-Z]|[ivxlcdmIVXLCDM]+)[.)]/.test(glyph);
    const content = block ? inner.replace(LIST_BLOCK_RE, "") : inner;
    const lv = /level(\d+)/i.exec(attrs);
    let level = lv ? Math.max(0, parseInt(lv[1], 10) - 1) : 0;
    if (!lv) {
      const st = /style=("([^"]*)"|'([^']*)')/i.exec(attrs);
      const ml = st ? /margin-left:\s*([^;]+)/i.exec(st[2] ?? st[3] ?? "") : null;
      if (ml) level = Math.max(0, indentLevel(toPx(ml[1])) - 1);
    }
    return `<li data-wl="${ordered ? "ol" : "ul"}" data-lv="${Math.min(8, level)}">${content.trim()}</li>`;
  });
  // Agrupa itens consecutivos do mesmo tipo.
  return withItems.replace(
    /(?:<li data-wl="(ul|ol)" data-lv="\d+">[\s\S]*?<\/li>\s*)+/g,
    (group) => {
      let out = "";
      // Pilha de listas abertas (uma por nível) — mantém subtópicos aninhados.
      const stack: string[] = [];
      const re = /<li data-wl="(ul|ol)" data-lv="(\d+)">([\s\S]*?)<\/li>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(group))) {
        const type = m[1];
        const lvl = Math.min(parseInt(m[2], 10), stack.length);
        while (stack.length > lvl + 1) out += `</li></${stack.pop()}>`;
        if (stack.length === lvl + 1 && stack[lvl] !== type) {
          out += `</li></${stack.pop()}>`;
        } else if (stack.length === lvl + 1) {
          out += "</li>";
        }
        if (stack.length === lvl) {
          stack.push(type);
          out += `<${type}>`;
        }
        out += `<li><p>${m[3]}</p>`;
      }
      while (stack.length) out += `</li></${stack.pop()}>`;
      return out;
    },
  );
}

const LEAD_TAB_RE = /^((?:\s|&nbsp;|<(?!\/?p\b)[a-z][^>]*>)*?)<span\b[^>]*mso-tab-count:\s*(\d+)[^>]*>[\s\S]*?<\/span>/i;

/** Tabulações no início do parágrafo (mso-tab-count) viram degraus de recuo. */
function convertTabs(html: string): string {
  return html.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (full, attrs: string, inner: string) => {
    let tabs = 0;
    let rest = inner;
    let m: RegExpExecArray | null;
    while ((m = LEAD_TAB_RE.exec(rest))) {
      tabs += parseInt(m[2], 10);
      rest = m[1] + rest.slice(m[0].length);
    }
    if (!tabs) return full;
    rest = rest.replace(/^((?:<[^>]+>)*)(?:\s|&nbsp;)+/i, "$1");
    const extra = `x-tab-indent:${tabs * 48}px`;
    const st = /\sstyle=("([^"]*)"|'([^']*)')/i.exec(attrs);
    const nextAttrs = st
      ? attrs.replace(st[0], ` style="${(st[2] ?? st[3] ?? "").replace(/;?\s*$/, ";")}${extra}"`)
      : `${attrs} style="${extra}"`;
    return `<p${nextAttrs}>${rest}</p>`;
  });
}

const INDENT_KEYS = /^(margin-left|margin|padding-left|text-indent|mso-margin-left-alt)$/i;

/** Recuos definidos em estilos do documento (<style> p.Recuo2{margin-left:...}) viram inline. */
function inlineClassIndents(html: string): string {
  const rules: Record<string, string> = {};
  const boldClasses = new Set<string>();
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let s: RegExpExecArray | null;
  while ((s = styleRe.exec(html))) {
    const css = s[1].replace(/<!--|-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const ruleRe = /([^{}@]+)\{([^}]*)\}/g;
    let r: RegExpExecArray | null;
    while ((r = ruleRe.exec(css))) {
      const decls = r[2]
        .split(";")
        .filter((d) => INDENT_KEYS.test(d.slice(0, d.indexOf(":")).trim()))
        .map((d) => d.trim().replace(/^mso-margin-left-alt/i, "margin-left"))
        .join(";");
      const bold = /font-weight\s*:\s*(bold|[6-9]00)/i.test(r[2]);
      for (const sel of r[1].split(",")) {
        const bm = /\.([\w-]+)\s*$/.exec(sel.trim());
        if (bold && bm) boldClasses.add(bm[1].toLowerCase());
      }
      if (!decls) continue;
      for (const sel of r[1].split(",")) {
        const m = /\.([\w-]+)\s*$/.exec(sel.trim());
        if (m) rules[m[1].toLowerCase()] = rules[m[1].toLowerCase()] ? `${rules[m[1].toLowerCase()]};${decls}` : decls;
      }
    }
  }
  return html.replace(/<(p|h[1-6]|li|div)\b([^>]*)>/gi, (full, tag: string, attrs: string) => {
    const cls = /\sclass=("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    if (!cls) return full;
    const names = (cls[2] ?? cls[3] ?? cls[4] ?? "").split(/\s+/);
    const parts = names.map((n) => rules[n.toLowerCase()]).filter(Boolean);
    // Esboços oficiais (JW Indent0..N): o número da classe é o degrau.
    const lvlCls = names.map((n) => /indent(\d)$/i.exec(n)).find(Boolean);
    if (lvlCls) parts.push(`x-level:${lvlCls[1]}`);
    if (names.some((n) => boldClasses.has(n.toLowerCase()))) parts.push("x-bold:1");
    const extra = parts.join(";");
    if (!extra) return full;
    const st = /\sstyle=("([^"]*)"|'([^']*)')/i.exec(attrs);
    // Estilo inline vem depois e prevalece.
    const nextAttrs = st
      ? attrs.replace(st[0], ` style="${extra};${(st[2] ?? st[3] ?? "").replace(/"/g, "'")}"`)
      : `${attrs} style="${extra}"`;
    return `<${tag}${nextAttrs}>`;
  });
}

function leftOf(style: string): number {
  let ml = 0;
  for (const d of style.split(";")) {
    const i = d.indexOf(":");
    const key = d.slice(0, i).trim().toLowerCase();
    const val = d.slice(i + 1).trim();
    if (key === "margin-left" || key === "padding-left") ml = Math.max(ml, toPx(val));
    else if (key === "margin") {
      const p = val.split(/\s+/);
      ml = Math.max(ml, toPx(p[3] ?? p[1] ?? p[0] ?? "0"));
    }
  }
  return ml;
}

/** Word Online/Office 365: o recuo fica no <div> que embrulha o parágrafo. */
function pushDivIndentIntoParagraphs(html: string): string {
  return html.replace(
    /<div\b([^>]*)>(\s*(?:<(?!\/?div\b|p\b)[^>]*>\s*)*)<p\b([^>]*)>/gi,
    (full, dAttrs: string, between: string, pAttrs: string) => {
      const st = /\sstyle=("([^"]*)"|'([^']*)')/i.exec(dAttrs);
      const px = st ? leftOf(st[2] ?? st[3] ?? "") : 0;
      if (px < 8) return full;
      const extra = `x-tab-indent:${px}px`;
      const ps = /\sstyle=("([^"]*)"|'([^']*)')/i.exec(pAttrs);
      const next = ps
        ? pAttrs.replace(ps[0], ` style="${(ps[2] ?? ps[3] ?? "").replace(/;?\s*$/, ";")}${extra}"`)
        : `${pAttrs} style="${extra}"`;
      return `<div${dAttrs}>${between}<p${next}>`;
    },
  );
}

/** Tabulações literais (\t) ou espaços duros no começo do parágrafo viram degraus. */
function convertLeadingWhitespace(html: string): string {
  return html.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (full, attrs: string, inner: string) => {
    const m = /^((?:<(?!\/?p\b)[a-z][^>]*>)*)((?:\t|&nbsp;|\u00A0| )+)/i.exec(inner);
    if (!m) return full;
    const ws = m[2];
    const tabs = (ws.match(/\t/g) || []).length;
    const spaces = (ws.match(/&nbsp;|\u00A0| /gi) || []).length;
    const steps = tabs + Math.floor(spaces / 4);
    if (!steps) return full;
    const rest = m[1] + inner.slice(m[0].length);
    const extra = `x-tab-indent:${steps * 48}px`;
    const st = /\sstyle=("([^"]*)"|'([^']*)')/i.exec(attrs);
    const nextAttrs = st
      ? attrs.replace(st[0], ` style="${(st[2] ?? st[3] ?? "").replace(/;?\s*$/, ";")}${extra}"`)
      : `${attrs} style="${extra}"`;
    return `<p${nextAttrs}>${rest}</p>`;
  });
}

export function cleanWordHtml(html: string): string {
  if (!isWordHtml(html)) return html;
  let out = inlineClassIndents(html);
  // Só o corpo interessa.
  const body = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(out);
  if (body) out = body[1];
  out = out
    .replace(/<!--StartFragment-->|<!--EndFragment-->/g, "")
    .replace(/<(style|xml|script|head)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<(meta|link)\b[^>]*>/gi, "");
  out = pushDivIndentIntoParagraphs(out);
  out = convertTabs(out);
  out = convertLeadingWhitespace(out);
  out = convertLists(out);
  // Títulos com negrito definido na classe (ex.: JWHEADING) entram em negrito.
  out = out.replace(/<(p|h[1-6])\b([^>]*x-bold:1[^>]*)>([\s\S]*?)<\/\1>/gi, "<$1$2><b>$3</b></$1>");
  // Âncoras internas do Word (<a name="_Hlk...">) sem link.
  out = out.replace(/<a\b(?![^>]*\bhref=)[^>]*>([\s\S]*?)<\/a>/gi, "$1");
  out = out
    // Demais comentários condicionais e comentários comuns.
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
    .replace(/<!\[if[\s\S]*?<!\[endif\]>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    // Tags proprietárias do Office (<o:p>, <w:...>, <v:...>).
    .replace(/<\/?[a-z]+:[a-z]+\b[^>]*>/gi, "")
    // Títulos: o editor usa níveis 2 e 3.
    .replace(/<(\/?)h1\b/gi, "<$1h2")
    .replace(/<(\/?)h[4-6]\b/gi, "<$1h3")
    .replace(INVISIBLE_RE, "");
  out = cleanAttributes(out);
  // Spans que ficaram sem atributos são só embalagem.
  out = out.replace(/<span>([\s\S]*?)<\/span>/gi, "$1");
  return out.trim();
}
