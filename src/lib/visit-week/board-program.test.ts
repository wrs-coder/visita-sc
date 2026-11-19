import { describe, expect, it } from "vitest";
import { buildBoardModel, formatRange, pickVisitProgram, type BoardInput } from "./board-program";

const base: BoardInput = {
  startDate: "2026-11-17", endDate: "2026-11-22", sc: "Wanderson Rodrigues", congregation: "Cidade do Sequele",
  midweek: { at: null, chairman: "João", parts: null, serviceTalk: "Tenha consideração", finalSong: "151" },
  weekend: { at: null, publicTalk: "Quem governa o mundo?", finalTalk: null, openingSong: "3", closingSong: null },
  pioneer: { at: null, place: "Salão" }, elders: null,
  field: [{ date: "2026-11-18", period: "Manhã", time: "08:30:00", place: "Casa do Pedro" }, { date: "2026-11-18", period: "Tarde", time: "15:00", place: "Salão" }],
};

describe("quadro de anúncios", () => {
  it("período no formato do quadro", () => {
    expect(formatRange("2026-11-17", "2026-11-22")).toBe("17 a 22 de novembro de 2026");
  });
  it("usa dados do app: discurso de serviço, cântico de terça, discurso público com o SC", () => {
    const m = buildBoardModel(base);
    expect(m.midweek.find((r) => r.text === "Tenha consideração")?.who).toBe("Wanderson Rodrigues");
    expect(m.midweek.some((r) => r.text.startsWith("Cântico 151"))).toBe(true);
    expect(m.weekend.find((r) => r.text === "Quem governa o mundo?")?.who).toBe("");
    expect(m.midweek[0].who).toBe("João");
  });
  it("serviço de campo de quarta a domingo, manhã e tarde separados", () => {
    const m = buildBoardModel(base);
    expect(m.field.map((f) => f.day)).toEqual(["Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]);
    expect(m.field[0].am).toEqual({ time: "08:30", place: "Casa do Pedro" });
    expect(m.field[0].pm.time).toBe("15:00");
    expect(m.field[1].am.place).toBe("");
  });
  it("fim de semana sem nomes e horários em 24h", () => {
    const m = buildBoardModel({ ...base, weekend: { ...base.weekend, chairman: "Carlos", at: "2026-11-22T15:00:00" }, pioneer: { at: "2026-11-21T10:30:00", place: "Salão" } });
    expect(m.weekend.every((r) => r.who === "")).toBe(true);
    expect(m.weekendWhen).toContain("15:00");
    expect(m.specials[0].time).toBe("Sábado 10:30");
  });
  it("campo: vários registros no mesmo período juntam os locais preenchidos", () => {
    const m = buildBoardModel({ ...base, field: [
      { date: "2026-11-18", period: "Manhã", time: "09:00", place: null },
      { date: "2026-11-18", period: "Manhã", time: "08:30", place: "Salão do Reino" },
      { date: "2026-11-18", period: "Manhã", time: "09:00", place: "Casa do Teta" },
    ] });
    expect(m.field[0].am).toEqual({ time: "08:30", place: "Salão do Reino / Casa do Teta" });
  });
});

describe("quadro: meio de semana igual ao controle de tempo", () => {
  const parts = [
    { id: "s1", theme: "Cântico 77 e oração", minutes: 5, section: "open", kind: "song", assigned: "Paulo" },
    { id: "c1", theme: "Comentários iniciais", minutes: 1, section: "open", kind: "comments", assigned: "João" },
    { id: "t1", theme: "Joias espirituais", minutes: 10, section: "treasures", kind: "part", assigned: "Ana" },
    { id: "m1", theme: "Iniciando conversas", minutes: 3, section: "ministry", kind: "part", assigned: "Lucia Nunes e Fernanda Abreu", counsel: 1 },
    { id: "f1", theme: "Comentários finais", minutes: 3, section: "close", kind: "comments", assigned: "João" },
    { id: "v1", theme: "Tenha consideração", minutes: 30, section: "living", kind: "part", assigned: "Wanderson Rodrigues" },
  ] as const;
  const m = buildBoardModel({ ...base, midweek: { ...base.midweek, parts: parts.map((p) => ({ ...p })), start: "19:30", visitTalkId: "v1" } });
  it("traz as partes com comentários, sem linha Presidência e sem Conselho", () => {
    expect(m.midweek.map((r) => r.text)).toEqual([
      "Cântico 77 e oração", "Comentários iniciais", "Joias espirituais", "Iniciando conversas", "Comentários finais", "Tenha consideração",
    ]);
    expect(m.midweek.find((r) => r.text === "Comentários iniciais")?.who).toBe("João");
  });
  it("sem partes de comentários, a Presidência volta", () => {
    const n = buildBoardModel({ ...base, midweek: { ...base.midweek, parts: parts.filter((p) => p.kind !== "comments").map((p) => ({ ...p })), start: "19:30" } });
    expect(n.midweek[0].text).toBe("Presidência");
  });
  it("horário de cada parte como no controle de tempo", () => {
    expect(m.midweek.filter((r) => r.time).map((r) => r.time)).toEqual(["19:30", "19:35", "19:36", "19:46", "19:50", "19:53"]);
  });
  it("discurso de serviço destacado pela parte trocada", () => {
    expect(m.midweek.find((r) => r.text === "Tenha consideração")?.tone).toBe("visit");
  });
});

describe("quadro: programa da semana da visita", () => {
  const list = [{ date: "2026-11-10", monday: "2026-11-09" }, { date: "2026-11-16", monday: "2026-11-16" }];
  it("acha a semana da apostila que cruza a visita mesmo com a reunião fora do período", () => {
    expect(pickVisitProgram(list, "2026-11-17", "2026-11-22")?.monday).toBe("2026-11-16");
  });
  it("prefere o programa com dia dentro da visita", () => {
    expect(pickVisitProgram([...list, { date: "2026-11-17", monday: "2026-11-16" }], "2026-11-17", "2026-11-22")?.date).toBe("2026-11-17");
  });
});

describe("quadro: temas e orações opcionais", () => {
  const inp = { ...base, pioneer: { at: null, place: "Salão", theme: "Perseverem", opening: "Ana", closing: "Bia" },
    field: [{ date: "2026-11-18", period: "Manhã", time: "08:30", place: "Salão", prayer: "Pedro" }] };
  it("desligados não entram", () => {
    const m = buildBoardModel(inp);
    expect(m.specials[0].theme).toBeUndefined();
    expect(m.specials[0].prayers).toBeUndefined();
    expect(m.field[0].prayer).toBeUndefined();
  });
  it("ligados entram", () => {
    const m = buildBoardModel(inp, { specialThemes: true, specialPrayers: true, fieldPrayer: true });
    expect(m.specials[0].theme).toBe("Perseverem");
    expect(m.specials[0].prayers).toBe("Oração inicial: Ana · final: Bia");
    expect(m.field[0].prayer).toBe("Pedro");
  });
});

describe("quadro: campo detalhado e modelo simplificado", () => {
  const inp: BoardInput = { ...base, field: [
    { date: "2026-11-18", period: "Tarde", time: "14:00", place: "Bloco 12", modality: "telefone_cartas", territory: null, prayer: "Genesio" },
    { date: "2026-11-18", period: "Manhã", time: "09:00", place: "Bloco 12, Ap 22", modality: "casa_em_casa", territory: "10", prayer: "Fernando" },
  ] };
  it("cada saída traz dia, horário, local, modalidade, território e oração", () => {
    const m = buildBoardModel(inp, { fieldPrayer: true });
    expect(m.fieldDetail[0]).toEqual({ day: "Quarta-feira", time: "09:00", place: "Bloco 12, Ap 22", modality: "Casa em casa", territory: "10", prayer: "Fernando", am: true });
    expect(m.fieldDetail[1].am).toBe(false);
    expect(m.fieldDetail[1].modality).toBe("Telefone e cartas");
  });
  it("simplificado: temas e números dos cânticos", () => {
    const m = buildBoardModel({ ...inp, weekend: { ...base.weekend, closingSong: "Cântico 156" } });
    expect(m.serviceTalk).toBe("Tenha consideração");
    expect(m.publicTalk).toBe("Quem governa o mundo?");
    expect(m.songs).toEqual({ midFinal: "151", weOpen: "3", weClose: "156" });
  });
  it("simplificado: reuniões especiais com todos os dados, sem depender dos interruptores", () => {
    const m = buildBoardModel({ ...base, pioneer: { at: "2026-11-18T19:00:00", place: "Salão", theme: "Eu os chamo de amigos", opening: "Ana", closing: "Bia" } });
    expect(m.specialsDetail[0]).toEqual({ title: "Reunião com Pioneiros", place: "Salão", when: "Quarta-feira, 19:00", theme: "Eu os chamo de amigos", opening: "Ana", closing: "Bia" });
  });
});
