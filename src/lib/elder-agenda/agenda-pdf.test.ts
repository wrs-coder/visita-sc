import { describe, expect, it } from "vitest";
import { renderAgendaPdf } from "./agenda-pdf";
import { emptyAgenda, emptyAuto } from "./agenda";

describe("pauta: PDF", () => {
  it("gera PDF com link clicável do vídeo", async () => {
    const payload = { ...emptyAgenda(), links: emptyAgenda().links.map((l, i) => (i === 2 ? { ...l, label: "Vídeo", url: "https://www.jw.org/pt/" } : l)) };
    const blob = await renderAgendaPdf({ payload, auto: emptyAuto(), congregation: "Central", range: "17/11 a 22/11/2026" });
    const { PDFDocument, PDFName, PDFArray, PDFDict, PDFString } = await import("pdf-lib");
    const doc = await PDFDocument.load(new Uint8Array(await blob.arrayBuffer()));
    const urls: string[] = [];
    for (const page of doc.getPages()) {
      const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
      for (let i = 0; i < (annots?.size() ?? 0); i++) {
        const a = annots!.lookup(i, PDFDict).lookup(PDFName.of("A"), PDFDict);
        urls.push(a.lookup(PDFName.of("URI"), PDFString).decodeText());
      }
    }
    expect(urls).toContain("https://www.jw.org/pt/");
  });
});
