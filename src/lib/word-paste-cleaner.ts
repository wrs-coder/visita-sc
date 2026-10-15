/**
 * Limpa o HTML colado do Microsoft Word/Office antes de entrar no editor de
 * esboços. Função pura (só strings) — conteúdo que NÃO veio do Word volta
 * exatamente igual, preservando o comportamento atual da colagem.
 */

const WORD_MARKERS = /(urn:schemas-microsoft-com:office|class=["']?Mso|mso-[a-z-]+\s*:|<o:p\b)/i;

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
  const m = /^(-?[\d.]+)\s*(px|pt|cm|mm|in|pc)?$/i.exec(v.trim());
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
  const rest: string[] = [];
  for (const d of style.split(";")) {
    const i = d.indexOf(":");
    const key = d.slice(0, i).trim().toLowerCase();
    const val = d.slice(i + 1).trim();
    if (key === "margin-left" || key === "padding-left") ml = Math.max(ml, toPx(val));
    else if (key === "text-indent") ti = toPx(val);
    else if (key === "margin") {
      const parts = val.split(/\s+/);
      const left = parts[3] ?? parts[1] ?? parts[0];
      if (left) ml = Math.max(ml, toPx(left));
    } else rest.push(d);
  }
  const lvl = dropIndent ? 0 : indentLevel(ml + Math.max(0, ti));
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

export function cleanWordHtml(html: string): string {
  if (!isWordHtml(html)) return html;
  let out = html;
  // Só o corpo interessa.
  const body = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(out);
  if (body) out = body[1];
  out = out
    .replace(/<!--StartFragment-->|<!--EndFragment-->/g, "")
    .replace(/<(style|xml|script|head)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<(meta|link)\b[^>]*>/gi, "");
  out = convertLists(out);
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
