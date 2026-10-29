/**
 * Exporta notas/esboços em .docx no próprio aparelho, sem biblioteca nova
 * (usa o JSZip que já existe). Converte o HTML do editor para WordprocessingML
 * mínimo: parágrafos, títulos, listas, negrito/itálico/sublinhado, cor e recuo.
 */
import JSZip from "jszip";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function xmlEsc(s: string): string {
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Fmt = { b?: boolean; i?: boolean; u?: boolean; color?: string };
type Para = { style?: string; leftPx: number; runs: string[]; prefix?: string };

function run(text: string, f: Fmt): string {
  if (!text) return "";
  const pr = [f.b ? "<w:b/>" : "", f.i ? "<w:i/>" : "", f.u ? '<w:u w:val="single"/>' : "", f.color ? `<w:color w:val="${f.color}"/>` : ""].join("");
  return `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ""}<w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r>`;
}

function cssColor(style: string): string | undefined {
  const m = /color:\s*#([0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(style);
  if (!m) return undefined;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return h.toUpperCase();
}

function marginPx(style: string): number {
  const m = /margin-left:\s*([\d.]+)(px|pt|em)?/i.exec(style);
  if (!m) return 0;
  const v = Number(m[1]);
  return m[2] === "pt" ? v * (4 / 3) : m[2] === "em" ? v * 16 : v;
}

/** Converte o HTML do editor em parágrafos do Word (document.xml body). */
export function htmlToDocxBody(title: string, html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const paras: Para[] = [];
  if (title.trim()) paras.push({ style: "Title", leftPx: 0, runs: [run(title.trim(), {})] });
  let cur: Para | null = null;
  const flush = () => { if (cur && cur.runs.some(Boolean)) paras.push(cur); cur = null; };
  const ensure = (leftPx: number) => { if (!cur) cur = { leftPx, runs: [] }; return cur; };

  const walk = (node: Node, f: Fmt, leftPx: number, listDepth: number, ordered: boolean[]) => {
    if (node.nodeType === 3) {
      const t = (node.textContent ?? "").replace(/\s+/g, " ");
      if (t.trim() || (cur && cur.runs.length)) ensure(leftPx).runs.push(run(t, f));
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === "script" || tag === "style" || tag === "button") return;
    const style = el.getAttribute("style") ?? "";
    const nf: Fmt = { ...f };
    if (tag === "b" || tag === "strong" || /font-weight:\s*(bold|[6-9]00)/i.test(style)) nf.b = true;
    if (tag === "i" || tag === "em") nf.i = true;
    if (tag === "u") nf.u = true;
    const c = cssColor(style);
    if (c) nf.color = c;
    if (tag === "br") { ensure(leftPx).runs.push("<w:r><w:br/></w:r>"); return; }
    if (tag === "hr" && el.hasAttribute("data-page-break")) { ensure(leftPx).runs.push('<w:r><w:br w:type="page"/></w:r>'); return; }
    if (tag === "img" || tag === "video" || tag === "audio") {
      const n = el.getAttribute("alt") || el.getAttribute("title") || el.getAttribute("data-name");
      if (n) ensure(leftPx).runs.push(run(`[${n}]`, { i: true }));
      return;
    }
    const kids = (lp: number, ld = listDepth, ord = ordered) => el.childNodes.forEach((k) => walk(k, nf, lp, ld, ord));
    if (tag === "ul" || tag === "ol") {
      flush();
      kids(leftPx, listDepth + 1, [...ordered, tag === "ol"]);
      flush();
      return;
    }
    if (tag === "li") {
      flush();
      const lp = leftPx + marginPx(style) + 24 * Math.max(0, listDepth - 1);
      cur = { leftPx: lp + 24, runs: [], prefix: ordered[ordered.length - 1] ? "ol" : "ul" };
      kids(lp);
      flush();
      return;
    }
    const block = /^(p|div|h[1-6]|blockquote|section|article|details|summary)$/.test(tag);
    if (block) {
      flush();
      const lp = leftPx + marginPx(style);
      const h = /^h([1-6])$/.exec(tag);
      const hasBlockKids = Array.from(el.children).some((k) => /^(p|div|h[1-6]|ul|ol|blockquote|section)$/i.test(k.tagName));
      if (!hasBlockKids) cur = { leftPx: lp, runs: [], style: h ? (Number(h[1]) <= 2 ? "Heading1" : "Heading2") : undefined };
      kids(lp);
      flush();
      return;
    }
    kids(leftPx);
  };
  doc.body.childNodes.forEach((n) => walk(n, {}, 0, 0, []));
  flush();

  const counters = new Map<number, number>();
  return paras
    .map((p) => {
      const twips = Math.round((p.leftPx / 32) * 720);
      const ppr = [p.style ? `<w:pStyle w:val="${p.style}"/>` : "", twips > 0 ? `<w:ind w:left="${twips}"${p.prefix ? ' w:hanging="360"' : ""}/>` : ""].join("");
      let prefix = "";
      if (p.prefix === "ol") { const n = (counters.get(twips) ?? 0) + 1; counters.set(twips, n); prefix = `${n}.\t`; }
      else if (p.prefix === "ul") prefix = "•\t";
      else counters.clear();
      const pre = prefix ? `<w:r><w:t xml:space="preserve">${prefix.replace("\t", "")}</w:t></w:r><w:r><w:tab/></w:r>` : "";
      return `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ""}${pre}${p.runs.join("")}</w:p>`;
    })
    .join("");
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W_NS}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="24"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style></w:styles>`;

function addDocxParts(zip: JSZip, title: string, html: string) {
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file("word/styles.xml", STYLES);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W_NS}"><w:body>${htmlToDocxBody(title, html)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`);
}

export async function htmlToDocxBytes(title: string, html: string): Promise<Uint8Array> {
  const zip = new JSZip();
  addDocxParts(zip, title, html);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export async function htmlToDocx(title: string, html: string): Promise<Blob> {
  const bytes = await htmlToDocxBytes(title, html);
  return new Blob([bytes as BlobPart], { type: DOCX_MIME });
}

export function safeFileName(s: string, fallback = "esboco"): string {
  const n = s.replace(/[\\/:*?"<>|\u0000-\u001F]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return n || fallback;
}

export type DocxFolderEntry = { path: string[]; title: string; html: string };

/** Gera um .zip com um .docx por item; caminhos de subpastas viram pastas no zip. */
export async function folderToDocxZip(entries: DocxFolderEntry[]): Promise<Blob> {
  const zip = new JSZip();
  const used = new Set<string>();
  for (const e of entries) {
    const dir = e.path.map((p) => safeFileName(p, "pasta")).join("/");
    const base = safeFileName(e.title);
    let name = `${dir ? dir + "/" : ""}${base}.docx`;
    for (let k = 2; used.has(name.toLowerCase()); k++) name = `${dir ? dir + "/" : ""}${base} (${k}).docx`;
    used.add(name.toLowerCase());
    zip.file(name, await htmlToDocxBytes(e.title, e.html));
  }
  return zip.generateAsync({ type: "blob", compression: "STORE", mimeType: "application/zip" });
}
