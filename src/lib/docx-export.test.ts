// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { folderToDocxZip, htmlToDocxBytes } from "./docx-export";
import { importDocx } from "./docx-import";

const asFile = (name: string, b: Uint8Array) => ({ name, size: b.byteLength, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer });

describe("docx export", () => {
  it("keeps bold and the 3-step ladder, and re-imports", async () => {
    const html = '<p><b>TEMA</b></p><p style="margin-left:32px">Um</p><p style="margin-left:64px">Dois</p><p style="margin-left:96px">Tres</p>';
    const bytes = await htmlToDocxBytes("", html);
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain('w:left="284"');
    expect(xml).toContain('w:left="852"');
    expect(xml).toContain("<w:b/>");
    const r = await importDocx(asFile("x.docx", bytes));
    expect(r.html).toBe(html);
  });

  it("zips a folder with one docx per outline and numbers repeated names", async () => {
    const blob = await folderToDocxZip([
      { path: ["Pasta"], title: "A", html: "<p>1</p>" },
      { path: ["Pasta"], title: "A", html: "<p>2</p>" },
      { path: ["Pasta", "Sub"], title: "B", html: "<p>3</p>" },
    ]);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(Object.keys(zip.files).filter((n) => n.endsWith(".docx")).sort()).toEqual(["Pasta/A (2).docx", "Pasta/A.docx", "Pasta/Sub/B.docx"]);
  });
});
