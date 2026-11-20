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
    expect(card(out, "eldersInfo").html).toBe("");
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
  it("formato antigo: nomes separados por | recebem o link na mesma ordem", () => {
    const p = normalizeAgenda({ v: 3, blocks: [{ id: "t", title: "T", cards: [{ id: "l", type: "links", items: [{ kind: "article", text: "A Sentinela 2015 | Sfg 1:18", urls: ["jw.org/a", "jw.org/b"] }] }] }] });
    expect(p.blocks[0].cards[0].items[0].parts.map((x) => [x.title, x.url])).toEqual([["A Sentinela 2015", "https://jw.org/a"], ["Sfg 1:18", "https://jw.org/b"]]);
  });
  it("item sem link continua só com o nome", () => {
    const p = normalizeAgenda({ v: 3, blocks: [{ id: "t", title: "T", cards: [{ id: "l", type: "links", items: [{ kind: "book", parts: [{ title: "Lucas 6:40", url: "" }] }] }] }] });
    expect(p.blocks[0].cards[0].items[0].parts[0]).toMatchObject({ title: "Lucas 6:40", url: "" });
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

import { emptyAgenda as _empty, emptyAuto as _auto, mergeAgenda as _merge, newCard as _card, normalizeAgenda as _norm, prayerRecShown, s303Html, weekOf, withoutPrivate as _wp } from "./agenda";
describe("pauta: ajustes de cabeçalho, decisão e ocultos", () => {
  it("oração recomendação só aparece ligada e com recomendações", () => {
    const p = _empty();
    expect(prayerRecShown(p, _auto())).toBe(false);
    const a = { ..._auto(), recommendations: [{ id: "r1", title: "João", family: "", fieldGroup: "", info: "" }] };
    expect(prayerRecShown(p, a)).toBe(true);
    expect(prayerRecShown({ ...p, showPrayerRec: false }, a)).toBe(false);
  });
  it("pautas antigas abrem com título, versículos e ata padrão", () => {
    const p = _norm({ v: 3, blocks: [] });
    expect(p.headerTitle).toBe("Pauta – Reunião com Anciãos");
    expect(p.headerVerses).toContain("Isa 50:4");
    expect(p.showMinutes).toBe(true);
  });
  it("cartão oculto e decisões do SC não chegam aos anciãos", () => {
    const p = _empty();
    p.blocks[0].cards[0] = { ...p.blocks[0].cards[0], hidden: true };
    p.scRecs = { r1: { comment: "<p>x</p>", decision: "decline" } };
    const out = _wp(p);
    expect(out.blocks[0].cards.some((c) => c.id === p.blocks[0].cards[0].id)).toBe(false);
    expect(out.scRecs).toEqual({});
  });
  it("ancião salvando não apaga cartão oculto nem decisão", () => {
    const cur = _empty();
    cur.blocks[0].cards.push(_card("notes", { id: "h1", hidden: true, html: "segredo" }));
    cur.scRecs = { r1: { comment: "", decision: "decline" } };
    const m = _merge(cur, _wp(cur), "elder");
    expect(m.blocks[0].cards.find((c) => c.id === "h1")?.html).toBe("segredo");
    expect(m.scRecs.r1.decision).toBe("decline");
  });
  it("S-303 entra na ordem positivos, encorajar, preocupantes", () => {
    const h = s303Html({ preocupantes: "C", positivos: "A", encorajar: "B" });
    expect(h.indexOf("A")).toBeLessThan(h.indexOf("B"));
    expect(h.indexOf("B")).toBeLessThan(h.indexOf("C"));
    expect(h).toContain("Pontos para encorajar (Atos 11:23)");
  });
  it("semana da visita vai de segunda a domingo", () => {
    expect(weekOf("2026-11-19")).toEqual({ from: "2026-11-16", to: "2026-11-22" });
  });
});

describe("modelo de PDF escolhido pelo SC", () => {
  it("pauta antiga sem modelo usa Linha do tempo", async () => {
    const { normalizeAgenda } = await import("./agenda");
    expect(normalizeAgenda({ v: 3, blocks: [] }).pdfStyle).toBe("timeline");
  });
  it("ancião não troca o modelo escolhido pelo SC", async () => {
    const { normalizeAgenda, mergeAgenda } = await import("./agenda");
    const cur = normalizeAgenda({ v: 3, blocks: [], pdfStyle: "formal" });
    const inc = normalizeAgenda({ v: 3, blocks: [], pdfStyle: "cards" });
    expect(mergeAgenda(cur, inc, "elder").pdfStyle).toBe("formal");
    expect(mergeAgenda(cur, inc, "sc").pdfStyle).toBe("cards");
  });
});

describe("pauta: informações adicionais dos anciãos", () => {
  const H1 = "a".repeat(64), H2 = "b".repeat(64);
  const resp = (id: string, authorKey: string, html: string) => ({ id, authorKey, name: "", checks: {}, answers: {}, html, updatedAt: "" });
  const withResps = (p: AgendaPayload, list: ReturnType<typeof resp>[]) => withCard(p, "eldersInfo", { responses: list });
  it("tem o nome novo", () => { expect(CARD_TYPE_LABEL.eldersInfo).toBe("Informações adicionais dos anciãos"); });
  it("texto antigo do campo único vira a primeira resposta", () => {
    const raw = withHtml(emptyAgenda(), "eldersInfo", "<p>antigo</p>");
    const c = card(normalizeAgenda(JSON.parse(JSON.stringify(raw))), "eldersInfo");
    expect(c.html).toBe("");
    expect(c.responses.map((r) => r.name)).toEqual(["Resposta anterior"]);
  });
  it("ancião insere a própria resposta e não altera a de outro", () => {
    const cur = withResps(emptyAgenda(), [resp("r1", H1, "do primeiro")]);
    const inc = withResps(emptyAgenda(), [resp("r1", H1, "invadido"), resp("r2", H2, "minha")]);
    const out = card(mergeAgenda(cur, inc, "elder", Date.now(), H2), "eldersInfo").responses;
    expect(out.map((r) => r.html)).toEqual(["do primeiro", "minha"]);
  });
  it("sem a chave do aparelho, ancião não muda nada", () => {
    const cur = withResps(emptyAgenda(), [resp("r1", H1, "x")]);
    const out = mergeAgenda(cur, withResps(emptyAgenda(), []), "elder");
    expect(card(out, "eldersInfo").responses).toHaveLength(1);
  });
  it("ancião não altera checklist nem perguntas", () => {
    const cur = withCard(emptyAgenda(), "eldersInfo", { questions: [{ id: "q1", text: "do SC" }] });
    const inc = withCard(emptyAgenda(), "eldersInfo", { questions: [{ id: "q1", text: "mudado" }] });
    expect(card(mergeAgenda(cur, inc, "elder", Date.now(), H1), "eldersInfo").questions[0].text).toBe("do SC");
  });
  it("SC pode apagar a resposta de qualquer ancião", () => {
    const cur = withResps(emptyAgenda(), [resp("r1", H1, "x")]);
    expect(card(mergeAgenda(cur, withResps(cur, []), "sc"), "eldersInfo").responses).toHaveLength(0);
  });
  it("resposta lançada pelo SC sobrevive ao salvamento de um ancião e ele não a altera", () => {
    const bySc = { ...resp("s1", "", "do ancião sem app"), bySc: true as const };
    const cur = withResps(emptyAgenda(), [bySc]);
    const inc = withResps(emptyAgenda(), [{ ...bySc, html: "mudado" }, resp("r2", H2, "minha")]);
    const out = card(mergeAgenda(cur, inc, "elder", Date.now(), H2), "eldersInfo").responses;
    expect(out.map((r) => r.html)).toEqual(["do ancião sem app", "minha"]);
    expect(card(normalizeAgenda(JSON.parse(JSON.stringify(cur))), "eldersInfo").responses[0]?.bySc).toBe(true);
  });
  it("resposta sem a marca do SC continua válida", () => {
    const cur = withResps(emptyAgenda(), [resp("r1", H1, "x")]);
    expect(card(normalizeAgenda(JSON.parse(JSON.stringify(cur))), "eldersInfo").responses[0]?.bySc).toBeUndefined();
  });
});

describe("pauta: checklist Sim / Não / Em parte", () => {
  const H1 = "c".repeat(64);
  const rawWith = (checks: Record<string, unknown>) => ({ v: 3, blocks: [{ id: "t", title: "T", cards: [{ id: "e", type: "eldersInfo",
    checklist: [{ id: "k1", text: "Visitou os inativos?" }, { id: "k2", text: "Relatórios em dia?" }, { id: "k3", text: "Outro" }],
    responses: [{ id: "r1", authorKey: H1, name: "", checks, answers: {}, html: "", updatedAt: "" }] }] }] });
  const checksOf = (raw: unknown) => normalizeAgenda(raw).blocks[0].cards[0].responses[0].checks;
  it("guarda as três respostas", () => {
    expect(checksOf(rawWith({ k1: "yes", k2: "no", k3: "partial" }))).toEqual({ k1: "yes", k2: "no", k3: "partial" });
  });
  it("marcação antiga (caixa marcada) vira Sim", () => {
    expect(checksOf(rawWith({ k1: true, k2: false }))).toEqual({ k1: "yes" });
  });
  it("valor desconhecido fica sem resposta", () => {
    expect(checksOf(rawWith({ k1: "talvez", k2: 1 }))).toEqual({});
  });
  it("rótulos são Sim, Não e Em parte", async () => {
    const { CHECK_ANSWER_LABEL } = await import("./agenda");
    expect([CHECK_ANSWER_LABEL.yes, CHECK_ANSWER_LABEL.no, CHECK_ANSWER_LABEL.partial]).toEqual(["Sim", "Não", "Em parte"]);
  });
  it("ancião salva a própria resposta com Em parte", () => {
    const cur = normalizeAgenda(rawWith({}));
    const inc = normalizeAgenda(rawWith({ k1: "partial" }));
    expect(mergeAgenda(cur, inc, "elder", Date.now(), H1).blocks[0].cards[0].responses[0].checks).toEqual({ k1: "partial" });
  });
});
