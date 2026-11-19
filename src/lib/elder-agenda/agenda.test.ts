import { describe, expect, it } from "vitest";
import {
  ACCESS_LABEL, CARD_TYPE_LABEL, agendaView, applyTemplate, autoHidden, canEditNow, emptyAgenda, emptyAuto, mergeAgenda, newBlock, newCard,
  normalizeAgenda, numberedBlocks, parseTemplateFile, recInfoView, safeUrl, templateToFile, withoutPrivate, type AgendaCard, type AgendaPayload,
} from "./agenda";

const card = (p: AgendaPayload, id: string) => p.blocks.flatMap((b) => b.cards).find((c) => c.id === id)!;
const withCard = (p: AgendaPayload, id: string, next: Partial<AgendaCard>): AgendaPayload =>
  ({ ...p, blocks: p.blocks.map((b) => ({ ...b, cards: b.cards.map((c) => (c.id === id ? { ...c, ...next } : c)) })) });
const withHtml = (p: AgendaPayload, id: string, html: string) => withCard(p, id, { html });
const auto = { ...emptyAuto(), recommendations: [{ id: "r1", title: "João", family: "Ana", fieldGroup: "G3", info: "zeloso" }], local: [{ id: "l1", suggestedBy: "", subject: "x", sources: "", info: "" }] };

describe("pauta: nomes dos estilos", () => {
  it("usa os nomes combinados", () => {
    expect(CARD_TYPE_LABEL.notes).toBe("Informações do SC");
    expect(CARD_TYPE_LABEL.links).toBe("Fontes de matéria");
    expect(CARD_TYPE_LABEL.scReply).toBe("Resposta do SC");
    expect(ACCESS_LABEL.coordinator).toBe("C.Serviço");
  });
});

describe("pauta: tópicos com cartões", () => {
  it("Encorajamentos traz anotações, fontes de matéria e informações dos anciãos", () => {
    expect(emptyAgenda().blocks[0].cards.map((c) => c.type)).toEqual(["notes", "links", "eldersInfo"]);
  });
  it("no mesmo tópico, ancião grava o cartão Todos mas não o Só SC", () => {
    const cur = withHtml(emptyAgenda(), "enc", "texto do SC");
    const inc = withHtml(withHtml(emptyAgenda(), "enc", "invadido"), "eldersInfo", "nota do ancião");
    const out = mergeAgenda(cur, inc, "elder");
    expect(card(out, "enc").html).toBe("texto do SC");
    expect(card(out, "eldersInfo").html).toBe("nota do ancião");
  });
  it("só o SC adiciona ou tira cartões e tópicos", () => {
    const inc = emptyAgenda(); inc.blocks[0].cards.push(newCard("notes")); inc.blocks.push(newBlock("Novo"));
    expect(mergeAgenda(emptyAgenda(), inc, "elder").blocks[0].cards.length).toBe(3);
    expect(mergeAgenda(emptyAgenda(), inc, "elder").blocks.length).toBe(5);
    expect(mergeAgenda(emptyAgenda(), inc, "sc").blocks[0].cards.length).toBe(4);
  });
  it("C.Serviço grava orações; ancião comum não", () => {
    const inc = { ...emptyAgenda(), prayerOpen: "Paulo" };
    expect(mergeAgenda(emptyAgenda(), inc, "coordinator").prayerOpen).toBe("Paulo");
    expect(mergeAgenda(emptyAgenda(), inc, "elder").prayerOpen).toBe("");
  });
});

describe("pauta: nota privada do SC", () => {
  const withPriv = () => { const p = emptyAgenda(); p.blocks[0].cards.push(newCard("private", { id: "priv", html: "segredo", perm: "all" })); return p; };
  it("é sempre só do SC, mesmo com selo Todos", () => {
    expect(normalizeAgenda(withPriv()).blocks[0].cards.find((c) => c.id === "priv")!.perm).toBe("sc");
    const out = mergeAgenda(withPriv(), withHtml(withPriv(), "priv", "trocado"), "elder");
    expect(card(out, "priv").html).toBe("segredo");
  });
  it("não sai para os anciãos e ancião salvando não apaga a nota", () => {
    expect(withoutPrivate(withPriv()).blocks[0].cards.some((c) => c.type === "private")).toBe(false);
    const out = mergeAgenda(withPriv(), withoutPrivate(withPriv()), "elder");
    expect(card(out, "priv").html).toBe("segredo");
  });
});

describe("pauta: tópicos ocultos sozinhos", () => {
  it("sem recomendações nem assuntos locais no programa, os tópicos somem e a numeração pula", () => {
    const p = emptyAgenda();
    expect(autoHidden(p.blocks[2], emptyAuto())).toBe(true);
    expect(numberedBlocks(p.blocks, emptyAuto()).map((x) => x.block.id)).toEqual(["enc", "letters", "scReading"]);
    expect(agendaView(p, emptyAuto()).totalMinutes).toBe(20);
    expect(agendaView(p, auto).totalMinutes).toBe(50);
  });
});

describe("pauta: recomendações de irmãos", () => {
  it("família, grupo e informações vêm do programa e o editado vence", () => {
    const c = card(emptyAgenda(), "recs");
    expect(recInfoView(c, auto.recommendations[0])).toEqual({ family: "Ana", fieldGroup: "G3", info: "zeloso" });
    const edited = { ...c, recInfo: { r1: { family: "Ana e Pedro", fieldGroup: "", info: "" } } };
    expect(recInfoView(edited, auto.recommendations[0]).family).toBe("Ana e Pedro");
    expect(recInfoView(edited, auto.recommendations[0]).fieldGroup).toBe("G3");
  });
});

describe("pauta: prazo", () => {
  const now = Date.parse("2026-11-23T20:00:00Z");
  it("depois do prazo, ancião e C.Serviço não gravam; SC grava", () => {
    const cur = { ...emptyAgenda(), deadlineAt: "2026-11-23T19:00:00.000Z" };
    expect(card(mergeAgenda(cur, withHtml(cur, "eldersInfo", "tarde"), "elder", now), "eldersInfo").html).toBe("");
    expect(canEditNow("coordinator", "all", cur, now)).toBe(false);
    expect(canEditNow("sc", "sc", cur, now)).toBe(true);
  });
});

describe("pauta: links e anexos", () => {
  it("só http(s); várias URLs por linha", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("");
    const p = normalizeAgenda({ v: 3, blocks: [{ id: "t", title: "T", cards: [{ id: "l", type: "links", items: [{ kind: "video", text: "x", urls: ["data:x", "jw.org/a"] }] }] }] });
    expect(p.blocks[0].cards[0].items[0].urls).toEqual(["", "https://jw.org/a"]);
  });
  it("anexo enviado só aceita caminho da pasta de uma visita", () => {
    const p = normalizeAgenda({ v: 3, blocks: [{ id: "t", title: "T", cards: [{ id: "n", type: "notes", attachments: [
      { kind: "pdf", title: "a", cloudPath: "../x.pdf" }, { kind: "photo", title: "b", cloudPath: "11111111-1111-1111-1111-111111111111/abc.jpg" }, { kind: "link", url: "javascript:x" },
    ] }] }] });
    expect(p.blocks[0].cards[0].attachments.map((a) => a.cloudPath)).toEqual(["", "11111111-1111-1111-1111-111111111111/abc.jpg"]);
  });
});

describe("pauta: formatos antigos", () => {
  it("v2 (um tipo por bloco) vira tópicos sem perder conteúdo", () => {
    const old = { v: 2, blocks: [
      { id: "enc", type: "text", title: "Encorajamentos", minutes: 15, perm: "sc", showSubject: true, subject: "Zelo", html: "info" },
      { id: "reco", type: "links", title: "Recomendações para assistir", minutes: 0, perm: "sc", items: [{ kind: "book", text: "Sl", urls: ["jw.org/x"] }] },
      { id: "eldersInfo", type: "text", title: "Info", minutes: 0, perm: "all", html: "nota" },
      { id: "recs", type: "recs", title: "Recs", minutes: 20, perm: "all", notes: { r1: "CA" } },
    ] };
    const p = normalizeAgenda(old);
    expect(p.blocks.map((b) => b.id)).toEqual(["enc", "recs"]);
    expect(p.blocks[0].cards.map((c) => c.type)).toEqual(["notes", "links", "eldersInfo"]);
    expect(card(p, "enc").subject).toBe("Zelo");
    expect(card(p, "eldersInfo").perm).toBe("all");
    expect(card(p, "reco").items[0].urls[0]).toBe("https://jw.org/x");
    expect(card(p, "recs").notes.r1).toBe("CA");
  });
  it("formato de campos fixos converte", () => {
    const p = normalizeAgenda({ encTheme: "Zelo", scInfo: "info", letters: "cartas" }, { letters: "all" });
    expect(card(p, "enc").subject).toBe("Zelo");
    expect(card(p, "letters").perm).toBe("all");
  });
});

describe("pauta: modelos", () => {
  it("exporta e importa sem levar dados da visita nem anexos", () => {
    const p = withCard(emptyAgenda(), "enc", { attachments: [{ id: "a", kind: "link", title: "x", url: "https://jw.org", cloudPath: "", size: 0 }] });
    const back = parseTemplateFile(JSON.stringify(templateToFile("Meu", [...p.blocks, newBlock("Meu tópico")])));
    expect(back?.blocks.length).toBe(6);
    expect(back?.blocks[0].cards[0].attachments).toEqual([]);
    expect(parseTemplateFile("{}")).toBeNull();
  });
  it("aplicar modelo mantém o que já foi escrito no cartão", () => {
    const cur = withHtml(emptyAgenda(), "letters", "cartas");
    const out = applyTemplate(cur.blocks, emptyAgenda().blocks.reverse());
    expect(out[0].id).toBe("scReading");
    expect(out.flatMap((b) => b.cards).find((c) => c.id === "letters")!.html).toBe("cartas");
  });
});
