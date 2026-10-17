import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { docxXmlToHtml, importDocx, DocxImportError, DOCX_MAX_BYTES } from "./docx-import";
import { cleanWordHtml } from "./word-paste-cleaner";

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const doc = (body: string) => `<?xml version="1.0"?><w:document ${W}><w:body>${body}</w:body></w:document>`;
const p = (text: string, pPr = "", rPr = "") => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}<w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
const styles = `<w:styles ${W}>
<w:style w:styleId="JWHEADING"><w:name w:val="JW HEADING"/><w:rPr><w:b/></w:rPr></w:style>
<w:style w:styleId="JWIndent1"><w:name w:val="JW Indent1"/></w:style>
<w:style w:styleId="JWIndent2"><w:name w:val="JW Indent2"/></w:style>
<w:style w:styleId="JWIndent3"><w:name w:val="JW Indent3"/></w:style>
<w:style w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>
</w:styles>`;
const fileOf = (name: string, data: ArrayBuffer | Uint8Array) => ({
  name,
  size: data.byteLength,
  arrayBuffer: async () => (data instanceof Uint8Array ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data) as ArrayBuffer,
});

describe("docx import", () => {
  it("keeps the 3-step outline ladder and bold headings", () => {
    const html = docxXmlToHtml(
      doc(
        p("TEMA", '<w:pStyle w:val="JWHEADING"/>') +
          p("Um", '<w:pStyle w:val="JWIndent1"/>') +
          p("Dois", '<w:pStyle w:val="JWIndent2"/>') +
          p("Tres", '<w:pStyle w:val="JWIndent3"/>'),
      ),
      styles,
    );
    expect(html).toBe(
      '<p><b>TEMA</b></p><p style="margin-left:32px">Um</p><p style="margin-left:64px">Dois</p><p style="margin-left:96px">Tres</p>',
    );
  });

  it("maps hanging indents in twips, headings and run formatting", () => {
    const html = docxXmlToHtml(
      doc(p("T", '<w:pStyle w:val="Heading1"/>') + p("A", '<w:ind w:left="1418" w:hanging="300"/>', '<w:b/><w:color w:val="C00000"/>')),
      styles,
    );
    expect(html).toBe('<h2>T</h2><p style="margin-left:64px"><span style="color:#C00000"><b>A</b></span></p>');
  });

  it("escapes markup inside text so scripts never become tags", () => {
    const html = docxXmlToHtml(doc(p("&lt;script&gt;alert(1)&lt;/script&gt;")));
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;script&gt;");
  });

  it("rejects XML with external entities", () => {
    const evil = `<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><w:document ${W}><w:body>${p("&e;")}</w:body></w:document>`;
    expect(() => docxXmlToHtml(evil)).toThrow(DocxImportError);
  });

  it("rejects files that are too large, not docx or with macros", async () => {
    await expect(importDocx({ name: "a.docx", size: DOCX_MAX_BYTES + 1, arrayBuffer: async () => new ArrayBuffer(0) })).rejects.toMatchObject({ code: "too_large" });
    await expect(importDocx(fileOf("a.docx", new Uint8Array([1, 2, 3])))).rejects.toMatchObject({ code: "not_docx" });
    await expect(importDocx(fileOf("a.docm", new Uint8Array([1])))).rejects.toMatchObject({ code: "macro" });
    await expect(importDocx(fileOf("a.doc", new Uint8Array([1])))).rejects.toMatchObject({ code: "not_docx" });
  });

  it("stops zip bombs before reading them", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", doc(p("x")) + " ".repeat(51 * 1024 * 1024));
    const data = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    await expect(importDocx(fileOf("b.docx", data))).rejects.toMatchObject({ code: "too_large" });
  }, 30000);

  it("imports a real docx package end to end", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", doc(p("Ola", '<w:pStyle w:val="JWIndent1"/>')));
    zip.file("word/styles.xml", styles);
    const data = await zip.generateAsync({ type: "uint8array" });
    const r = await importDocx(fileOf("Meu esboço.docx", data));
    expect(r).toEqual({ title: "Meu esboço", html: '<p style="margin-left:32px">Ola</p>' });
  });
});

describe("paste of official outlines", () => {
  const head = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><style><!-- p.JWIndent0{margin-left:7.1pt;text-indent:-7.1pt} p.JWIndent2{margin-left:35.45pt;text-indent:-14.2pt} p.JWHEADING{font-weight:bold} --></style></head><body>`;
  it("uses the class number as the step and bolds headings", () => {
    const out = cleanWordHtml(`${head}<p class=JWHEADING>VÍDEO</p><p class=JWIndent0>A</p><p class=JWIndent2>B</p></body></html>`);
    expect(out).toBe('<p><b>VÍDEO</b></p><p>A</p><p style="margin-left:64px">B</p>');
  });
  it("removes internal Word bookmarks", () => {
    expect(cleanWordHtml(`${head}<p class=MsoNormal><a name="_Hlk239955865"><b>X</b></a></p></body></html>`)).toBe("<p><b>X</b></p>");
  });
});
