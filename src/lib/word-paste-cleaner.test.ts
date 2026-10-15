import { describe, expect, it } from "vitest";
import { cleanWordHtml, isWordHtml } from "./word-paste-cleaner";

const wrap = (body: string) =>
  `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><style>p.MsoNormal{}</style></head><body><!--StartFragment-->${body}<!--EndFragment--></body></html>`;

describe("cleanWordHtml", () => {
  it("leaves non-Word HTML untouched", () => {
    const html = '<p><strong>Oi</strong> <span style="background-color: yellow">x</span></p>';
    expect(isWordHtml(html)).toBe(false);
    expect(cleanWordHtml(html)).toBe(html);
  });

  it("converts Word bullet paragraphs into a real list without duplicate bullet", () => {
    const out = cleanWordHtml(
      wrap(
        '<p class="MsoListParagraphCxSpFirst" style="mso-list:l0 level1 lfo1"><!--[if !supportLists]--><span>·<span>&nbsp;</span></span><!--[endif]-->Primeiro</p>' +
          '<p class="MsoListParagraphCxSpLast" style="mso-list:l0 level1 lfo1"><!--[if !supportLists]--><span>·</span><!--[endif]-->Segundo</p>',
      ),
    );
    expect(out).toBe("<ul><li><p>Primeiro</p></li><li><p>Segundo</p></li></ul>");
  });

  it("converts numbered Word paragraphs into an ordered list", () => {
    const out = cleanWordHtml(
      wrap('<p class="MsoListParagraph"><!--[if !supportLists]--><span>1.</span><!--[endif]-->Um</p>'),
    );
    expect(out).toBe("<ol><li><p>Um</p></li></ol>");
  });

  it("keeps bold and text color but removes white background and Word fonts", () => {
    const out = cleanWordHtml(
      wrap('<p class="MsoNormal"><b><span style="font-family:Calibri;color:#C00000;background:white;mso-bidi-font-weight:bold">Atenção</span></b><o:p></o:p></p>'),
    );
    expect(out).toBe('<p><b><span style="color:#C00000">Atenção</span></b></p>');
  });

  it("keeps Bible references intact by removing invisible characters", () => {
    const out = cleanWordHtml(wrap('<p class="MsoNormal">Leia Sal\u00AD 83:18</p>'));
    expect(out).toBe("<p>Leia Sal 83:18</p>");
  });

  it("maps Word heading 1 to the editor's top heading level", () => {
    expect(cleanWordHtml(wrap('<h1 class="MsoTitle">Tema</h1>'))).toBe("<h2>Tema</h2>");
  });
});
