import { describe, expect, it } from "vitest";
import { renderAgendaPdf, type AgendaPdfStyle } from "./agenda-pdf";
import { emptyAgenda, emptyAuto } from "./agenda";

async function urlsOf(blob: Blob) {
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
  return urls;
}

describe("pauta: PDF", () => {
  for (const style of ["formal", "cards", "timeline"] as AgendaPdfStyle[]) {
    it(`${style}: todos os links da linha ficam clicáveis`, async () => {
      const p = emptyAgenda();
      p.blocks = p.blocks.map((b) => (b.id === "reco" ? { ...b, items: [{ id: "v", kind: "video" as const, text: "Vídeo", urls: ["https://www.jw.org/a", "https://www.jw.org/b"] }] } : b));
      const blob = await renderAgendaPdf({ payload: p, auto: { ...emptyAuto(), meetingAt: "2026-11-24T22:30:00Z" }, congregation: "Central", range: "17/11 a 22/11/2026", style });
      const urls = await urlsOf(blob);
      expect(urls).toContain("https://www.jw.org/a");
      expect(urls).toContain("https://www.jw.org/b");
    });
  }
});
