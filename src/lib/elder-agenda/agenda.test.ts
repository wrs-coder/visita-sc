import { describe, expect, it } from "vitest";
import { DEFAULT_PERMISSIONS, agendaView, canEdit, emptyAgenda, emptyAuto, mergeAgenda, normalizeAgenda, safeUrl } from "./agenda";

describe("pauta dos anciãos: permissões", () => {
  it("ancião sem cadastro não grava campo do SC", () => {
    const cur = { ...emptyAgenda(), scInfo: "texto do SC" };
    const inc = { ...emptyAgenda(), scInfo: "invadido", eldersInfo: "nota do ancião" };
    const out = mergeAgenda(cur, inc, "elder", DEFAULT_PERMISSIONS);
    expect(out.scInfo).toBe("texto do SC");
    expect(out.eldersInfo).toBe("nota do ancião");
  });
  it("coordenador grava orações; ancião comum não", () => {
    const inc = { ...emptyAgenda(), prayerOpen: "Paulo" };
    expect(mergeAgenda(emptyAgenda(), inc, "coordinator", DEFAULT_PERMISSIONS).prayerOpen).toBe("Paulo");
    expect(mergeAgenda(emptyAgenda(), inc, "elder", DEFAULT_PERMISSIONS).prayerOpen).toBe("");
  });
  it("SC grava tudo", () => {
    expect(canEdit("sc", "sc")).toBe(true);
    expect(mergeAgenda(emptyAgenda(), { ...emptyAgenda(), scInfo: "x" }, "sc", DEFAULT_PERMISSIONS).scInfo).toBe("x");
  });
});

describe("pauta dos anciãos: dados", () => {
  it("tempos padrão do modelo: 15, 5, 20 e 10 minutos = 50", () => {
    expect(agendaView(emptyAgenda(), emptyAuto()).totalMinutes).toBe(50);
  });
  it("orações vazias usam as da reunião com anciãos; digitado vence", () => {
    const a = { ...emptyAuto(), openingPrayer: "André", closingPrayer: "Lucas" };
    const v = agendaView({ ...emptyAgenda(), prayerClose: "Pedro" }, a);
    expect(v.prayerOpen).toBe("André");
    expect(v.prayerClose).toBe("Pedro");
  });
  it("links só aceitam http(s)", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("");
    expect(safeUrl("jw.org/pt")).toBe("https://jw.org/pt");
    expect(normalizeAgenda({ links: [{ url: "data:x" }] }).links[0].url).toBe("");
  });
});
