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

function cleanStyle(style: string): string {
  return style
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
    return `<li data-wl="${ordered ? "ol" : "ul"}">${content.trim()}</li>`;
  });
  // Agrupa itens consecutivos do mesmo tipo.
  return withItems.replace(
    /(?:<li data-wl="(ul|ol)">[\s\S]*?<\/li>\s*)+/g,
    (group) => {
      let out = "";
      let current: string | null = null;
      const re = /<li data-wl="(ul|ol)">([\s\S]*?)<\/li>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(group))) {
        if (m[1] !== current) {
          if (current) out += `</${current}>`;
          current = m[1];
          out += `<${current}>`;
        }
        out += `<li><p>${m[2]}</p></li>`;
      }
      if (current) out += `</${current}>`;
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
