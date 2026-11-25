// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { textBetween, blockText } from "./epub-bible-parser";

describe("versículos de poesia do EPUB (palavras não colam)", () => {
  it("separa linhas em blocos e <br> com espaço", () => {
    const doc = new DOMParser().parseFromString(
      `<html><body><span id="v11">11</span><p class="l">Quem ama a pureza de coração</p><p class="l">e fala com graça</p>terá<br/>o rei como amigo.<span id="v12">12</span>x</body></html>`,
      "text/html",
    );
    const start = doc.getElementById("v11")!;
    const end = doc.getElementById("v12")!;
    const t = textBetween(doc, start, end);
    expect(t).toContain("coração e fala");
    expect(t).toContain("graça terá o rei");
  });
});

describe("Provérbios: linhas por classe e texto de reserva", () => {
  it("separa linhas marcadas só por classe (span.sl)", () => {
    const doc = new DOMParser().parseFromString(
      `<html><body><span id="v1">1</span><span class="sl">O filho sábio alegra o pai,</span><span class="sl">mas o tolo entristece a mãe.</span><span id="v2">2</span>x</body></html>`,
      "text/html",
    );
    const t = textBetween(doc, doc.getElementById("v1")!, doc.getElementById("v2")!);
    expect(t).toContain("pai, mas o tolo");
  });
  it("texto de reserva não cola blocos", () => {
    const doc = new DOMParser().parseFromString(`<html><body><p>sábio</p><p>e justo</p><br/>fim</body></html>`, "text/html");
    expect(blockText(doc.body)).toBe("sábio e justo fim");
  });
  it("prosa continua igual", () => {
    const doc = new DOMParser().parseFromString(`<html><body><p>No princípio <em>Deus</em> criou.</p></body></html>`, "text/html");
    expect(blockText(doc.body)).toBe("No princípio Deus criou.");
  });
});
