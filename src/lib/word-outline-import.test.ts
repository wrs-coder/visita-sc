// @vitest-environment happy-dom
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { docxXmlToHtml } from "./docx-import";
import { htmlToDocxBody } from "./docx-export";
import { cleanWordHtml } from "./word-paste-cleaner";
import { cycleFirstLine, firstLineStyle } from "./first-line-indent";

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const fx = (n: string) => readFileSync(`src/lib/__fixtures__/word/${n}`, "utf8");
const s319 = () => docxXmlToHtml(fx("s319-document.xml"), fx("s319-styles.xml"));
const para = (html: string, text: string) => html.split("</p>").find((p) => p.includes(text)) ?? "";

describe("esboço S-319 (arquivo do usuário)", () => {
  it("JW Indent 0/1/2 mantêm os degraus e ganham o recuo deslocado", () => {
    const html = s319();
    expect(para(html, "menina israelita cativa")).toMatch(/^<p style="padding-left:16px;text-indent:-16px">/);
    expect(para(html, "Jeová valorizava a pessoa")).toMatch(/^<p style="margin-left:32px;padding-left:16px;text-indent:-16px">/);
    expect(para(html, "Você pode encontrar bons amigos")).toMatch(/^<p style="margin-left:64px;padding-left:16px;text-indent:-16px">/);
  });
  it("mantém o negrito em [Leia Provérbios 18:24.]", () => {
    expect(para(s319(), "Você pode encontrar bons amigos")).toContain("[<b>Leia Provérbios 18:24.</b>]");
  });
  it("hífen sem quebra do Word não junta os versículos (1Sa 16:10-12)", () => {
    const p = para(s319(), "Jeová valorizava a pessoa");
    expect(p).toMatch(/1Sa\s16:6,\s7,\s10-12;/);
    expect(p).not.toContain("1012");
  });
});

describe("marca-texto do Word", () => {
  const doc = (rPr: string) => `<w:document ${W}><w:body><w:p><w:r><w:rPr>${rPr}</w:rPr><w:t>Destaque</w:t></w:r></w:p></w:body></w:document>`;
  it("w:highlight amarelo vira o marca-texto amarelo do editor", () => {
    expect(docxXmlToHtml(doc('<w:highlight w:val="yellow"/>'))).toBe('<p><mark data-color="#fef08a" style="background-color:#fef08a">Destaque</mark></p>');
  });
  it("sombreamento verde vira o verde da paleta; branco e auto não destacam", () => {
    expect(docxXmlToHtml(doc('<w:shd w:val="clear" w:color="auto" w:fill="00B050"/>'))).toContain('data-color="#bbf7d0"');
    expect(docxXmlToHtml(doc('<w:shd w:val="clear" w:fill="00B0F0"/>'))).toContain('data-color="#bae6fd"');
    expect(docxXmlToHtml(doc('<w:shd w:val="clear" w:fill="D9D9D9"/>'))).toContain('data-color="#e5e7eb"');
    expect(docxXmlToHtml(doc('<w:shd w:val="clear" w:fill="FFFFFF"/>'))).toBe("<p>Destaque</p>");
    expect(docxXmlToHtml(doc('<w:shd w:val="clear" w:fill="auto"/>'))).toBe("<p>Destaque</p>");
  });
  it("cor desconhecida do Word vira amarelo", () => {
    expect(docxXmlToHtml(doc('<w:highlight w:val="black"/>'))).toContain('data-color="#fef08a"');
  });
  it("colagem do Word com mso-highlight vira marca-texto", () => {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><body><p class=MsoNormal>Leia <span style='background:lime;mso-highlight:lime'>Jo 3:16</span></p></body></html>`;
    expect(cleanWordHtml(html)).toBe('<p>Leia <mark data-color="#fef08a" style="background-color:#fef08a">Jo 3:16</mark></p>');
    const green = html.replace(/lime/g, "green");
    expect(cleanWordHtml(green)).toContain('data-color="#bbf7d0"');
  });
});

describe("recuo deslocado no editor e na exportação", () => {
  it("botão faz o ciclo Normal → 1ª linha → Deslocado → Normal", () => {
    const a = cycleFirstLine({ indent: 0, firstLine: 0 });
    expect(a).toEqual({ indent: 0, firstLine: 1 });
    const b = cycleFirstLine(a);
    expect(b).toEqual({ indent: 0, firstLine: -1 });
    expect(cycleFirstLine(b)).toEqual({ indent: 0, firstLine: 0 });
    expect(cycleFirstLine({ indent: 2, firstLine: 1 })).toEqual({ indent: 2, firstLine: -1 });
  });
  it("estilo: 1ª linha em 32px e deslocado em 16px", () => {
    expect(firstLineStyle(1)).toBe("text-indent: 32px");
    expect(firstLineStyle(-1)).toBe("padding-left: 16px; text-indent: -16px");
    expect(firstLineStyle(0)).toBe("");
  });
  it("exporta deslocado e marca-texto, e volta igual ao importar de novo", () => {
    const html = '<p style="margin-left: 32px; padding-left: 16px; text-indent: -16px">Tópico <mark data-color="#bbf7d0" style="background-color: #bbf7d0; color: inherit">verde</mark></p><p style="padding-left: 32px; text-indent: -32px">Dois</p>';
    const body = htmlToDocxBody("", html);
    expect(body).toContain('<w:ind w:left="1080" w:hanging="360"/>');
    expect(body).toContain('<w:shd w:val="clear" w:color="auto" w:fill="BBF7D0"/>');
    // A cor do marca-texto não vira cor do texto.
    expect(body).not.toContain('<w:color w:val="BBF7D0"/>');
    const back = docxXmlToHtml(`<w:document ${W}><w:body>${body}</w:body></w:document>`);
    expect(back).toBe('<p style="margin-left:32px;padding-left:16px;text-indent:-16px">Tópico <mark data-color="#bbf7d0" style="background-color:#bbf7d0">verde</mark></p><p style="padding-left:32px;text-indent:-32px">Dois</p>');
  });
});
