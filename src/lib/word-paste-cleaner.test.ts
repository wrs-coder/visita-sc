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

  it("converts Word indents in cm/pt/in into editor indent levels", () => {
    expect(cleanWordHtml(wrap('<p class="MsoNormal" style="margin-left:1.25cm">A</p>'))).toBe('<p style="margin-left:32px">A</p>');
    expect(cleanWordHtml(wrap('<p class="MsoNormal" style="margin-left:72.0pt">B</p>'))).toBe('<p style="margin-left:64px">B</p>');
    expect(cleanWordHtml(wrap('<p class="MsoNormal" style="margin-left:0in;text-indent:.5in">C</p>'))).toBe('<p style="margin-left:32px">C</p>');
  });

  it("keeps multilevel Word lists nested", () => {
    const out = cleanWordHtml(
      wrap(
        '<p class="MsoListParagraph" style="mso-list:l0 level1 lfo1"><!--[if !supportLists]--><span>·</span><!--[endif]-->Pai</p>' +
          '<p class="MsoListParagraph" style="mso-list:l0 level2 lfo1"><!--[if !supportLists]--><span>o</span><!--[endif]-->Filho</p>' +
          '<p class="MsoListParagraph" style="mso-list:l0 level1 lfo1"><!--[if !supportLists]--><span>·</span><!--[endif]-->Tio</p>',
      ),
    );
    expect(out).toBe("<ul><li><p>Pai</p><ul><li><p>Filho</p></li></ul></li><li><p>Tio</p></li></ul>");
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

  it("turns leading Word tabs into indent levels", () => {
    expect(cleanWordHtml(wrap(`<p class=MsoNormal><span style='mso-tab-count:2'>&nbsp;&nbsp;&nbsp; </span>C</p>`))).toBe('<p style="margin-left:64px">C</p>');
    expect(cleanWordHtml(wrap(`<p class=MsoNormal style='margin-left:35.4pt'><span style='mso-tab-count:1'> </span>D</p>`))).toBe('<p style="margin-left:64px">D</p>');
  });

  it("accepts decimal comma and hanging indents", () => {
    expect(cleanWordHtml(wrap(`<p class=MsoNormal style='margin-left:2,5cm'>E</p>`))).toBe('<p style="margin-left:64px">E</p>');
    expect(cleanWordHtml(wrap(`<p class=MsoNormal style='margin-left:35.4pt;text-indent:-17.7pt'>F</p>`))).toBe('<p style="margin-left:32px">F</p>');
  });
});
