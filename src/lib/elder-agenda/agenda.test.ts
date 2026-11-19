import { describe, expect, it } from "vitest";
import {
  ACCESS_LABEL, agendaView, applyTemplate, canEditNow, emptyAgenda, emptyAuto, mergeAgenda, newBlock, normalizeAgenda,
  numberedBlocks, parseTemplateFile, safeUrl, templateToFile, type AgendaPayload,
} from "./agenda";

const block = (p: AgendaPayload, id: string) => p.blocks.find((b) => b.id === id)!;
const withHtml = (p: AgendaPayload, id: string, html: string): AgendaPayload => ({ ...p, blocks: p.blocks.map((b) => (b.id === id ? { ...b, html } : b)) });

describe("pauta: quem edita", () => {
  it("o selo do meio se chama C.Serviço", () => { expect(ACCESS_LABEL.coordinator).toBe("C.Serviço"); });
  it("ancião não grava bloco Só SC, mas grava bloco Todos", () => {
    const cur = withHtml(emptyAgenda(), "enc", "texto do SC");
    const inc = withHtml(withHtml(emptyAgenda(), "enc", "invadido"), "eldersInfo", "nota do ancião");
    const out = mergeAgenda(cur, inc, "elder");
    expect(block(out, "enc").html).toBe("texto do SC");
    expect(block(out, "eldersInfo").html).toBe("nota do ancião");
  });
  it("C.Serviço grava orações; ancião comum não", () => {
    const inc = { ...emptyAgenda(), prayerOpen: "Paulo" };
    expect(mergeAgenda(emptyAgenda(), inc, "coordinator").prayerOpen).toBe("Paulo");
    expect(mergeAgenda(emptyAgenda(), inc, "elder").prayerOpen).toBe("");
  });
  it("só o SC muda títulos, ordem e blocos", () => {
    const inc = { ...emptyAgenda(), blocks: [{ ...emptyAgenda().blocks[2], title: "Outro" }] };
    const out = mergeAgenda(emptyAgenda(), inc, "elder");
    expect(out.blocks.length).toBe(7);
    expect(block(out, "eldersInfo").title).not.toBe("Outro");
    expect(mergeAgenda(emptyAgenda(), inc, "sc").blocks.length).toBe(1);
  });
});

describe("pauta: prazo", () => {
  const now = Date.parse("2026-11-23T20:00:00Z");
  it("depois do prazo, ancião e C.Serviço não gravam; SC grava", () => {
    const cur = { ...emptyAgenda(), deadlineAt: "2026-11-23T19:00:00.000Z" };
    const inc = withHtml(cur, "eldersInfo", "tarde demais");
    expect(block(mergeAgenda(cur, inc, "elder", now), "eldersInfo").html).toBe("");
    expect(canEditNow("coordinator", "all", cur, now)).toBe(false);
    expect(canEditNow("sc", "sc", cur, now)).toBe(true);
  });
  it("antes do prazo, ancião grava", () => {
    const cur = { ...emptyAgenda(), deadlineAt: "2026-11-24T19:00:00.000Z" };
    expect(block(mergeAgenda(cur, withHtml(cur, "eldersInfo", "ok"), "elder", now), "eldersInfo").html).toBe("ok");
  });
});

describe("pauta: blocos e numeração", () => {
  it("numeração segue a ordem dos blocos visíveis", () => {
    const p = emptyAgenda();
    p.blocks[0].hidden = true;
    const n = numberedBlocks(p.blocks);
    expect(n[0].block.id).toBe("reco");
    expect(n.map((x) => x.n)).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it("título salvo sem número fixo", () => {
    expect(normalizeAgenda({ v: 2, blocks: [{ id: "x", type: "text", title: "5) Assunto local" }] }).blocks[0].title).toBe("Assunto local");
  });
  it("tempos do modelo original: 15+5+20+10 = 50; bloco oculto não conta", () => {
    const p = emptyAgenda();
    expect(agendaView(p, emptyAuto()).totalMinutes).toBe(50);
    p.blocks.find((b) => b.id === "local")!.hidden = true;
    expect(agendaView(p, emptyAuto()).totalMinutes).toBe(40);
  });
  it("Tema/Assunto não vem do tema da reunião", () => {
    const p = normalizeAgenda({});
    expect(block(p, "enc").showSubject).toBe(true);
    expect(block(p, "enc").subject).toBe("");
  });
});

describe("pauta: links", () => {
  it("só http(s); várias URLs por linha", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("");
    expect(safeUrl("jw.org/pt")).toBe("https://jw.org/pt");
    const p = normalizeAgenda({ v: 2, blocks: [{ id: "l", type: "links", items: [{ kind: "video", text: "x", urls: ["data:x", "jw.org/a", "jw.org/b"] }] }] });
    expect(p.blocks[0].items[0].urls).toEqual(["", "https://jw.org/a", "https://jw.org/b"]);
  });
});

describe("pauta: formato antigo", () => {
  it("converte sem perder conteúdo nem quem edita", () => {
    const p = normalizeAgenda({ encTheme: "Zelo", scInfo: "info", letters: "cartas", links: [{ label: "Sl 23", url: "jw.org/x" }] }, { letters: "all" });
    expect(block(p, "enc").subject).toBe("Zelo");
    expect(block(p, "enc").html).toBe("info");
    expect(block(p, "letters").perm).toBe("all");
    expect(block(p, "reco").items[0].urls[0]).toBe("https://jw.org/x");
  });
});

describe("pauta: modelos", () => {
  it("exporta e importa o modelo", () => {
    const blocks = [...emptyAgenda().blocks, newBlock("text", "Meu bloco")];
    const back = parseTemplateFile(JSON.stringify(templateToFile("Meu", blocks)));
    expect(back?.name).toBe("Meu");
    expect(back?.blocks.length).toBe(8);
    expect(parseTemplateFile("{}")).toBeNull();
  });
  it("aplicar modelo mantém o que já foi escrito", () => {
    const cur = withHtml(emptyAgenda(), "letters", "cartas");
    const out = applyTemplate(cur.blocks, emptyAgenda().blocks.reverse());
    expect(out[0].id).toBe("scReading");
    expect(out.find((b) => b.id === "letters")!.html).toBe("cartas");
  });
});
