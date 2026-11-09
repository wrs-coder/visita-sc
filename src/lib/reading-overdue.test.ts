import { describe, expect, it } from "vitest";
import { creditDayFor, creditPlan, lateWeekdays, overdueDays, planEdited, seedPlan, weekdayPending, type WeekdayLog } from "./reading-day-log";
import { sanitizeWeekday, type WeekdayPlan } from "./bible-tracks";

// Novembro/2026: dia 8 = domingo, 9 = segunda, 11 = quarta.
const day = (d: number) => new Date(2026, 10, d);
const log = (entries: Record<number, string>): WeekdayLog => Array.from({ length: 7 }, (_, i) => entries[i] ?? null);
const mk = (days: Record<number, string[]>, extra: Partial<WeekdayPlan> = {}): WeekdayPlan => ({
  enabled: true, days: Array.from({ length: 7 }, (_, i) => days[i] ?? []), pos: Array(7).fill(null), ...extra,
});
const sunday = (extra: Partial<WeekdayPlan> = {}) => mk({ 0: ["B02"] }, extra);
const sunWed = (extra: Partial<WeekdayPlan> = {}) => mk({ 0: ["B02"], 3: ["B03"] }, extra);

describe("atraso por dia da semana (ciclo de 7 dias)", () => {
  it("leu domingo 08: em dia de segunda até o domingo seguinte (15)", () => {
    const p = sunday({ since: "2026-11-01", lastRead: log({ 0: "2026-11-08" }) });
    for (const d of [9, 11, 14, 15]) expect(overdueDays(p, day(d))).toBe(0);
  });
  it("domingo 15 passou sem leitura: segunda 16 aparece atrasado", () => {
    expect(lateWeekdays(sunday({ since: "2026-11-01", lastRead: log({ 0: "2026-11-08" }) }), day(16))).toEqual([0]);
  });
  it("leitura de um dia não tira nem cria atraso de outro dia", () => {
    const p = sunWed({ since: "2026-11-01", lastRead: log({ 0: "2026-11-08", 3: "2026-11-04" }) });
    expect(lateWeekdays(p, day(12))).toEqual([3]);
  });
  it("marcar a segunda não apaga o atraso do domingo (erro visto no celular)", () => {
    const p = mk({ 0: ["B02"], 1: ["B03"] }, { since: "2026-11-01", lastRead: log({ 0: "2026-11-01" }) });
    expect(lateWeekdays(p, day(9))).toEqual([1, 0]);
    const after = creditPlan(p, 1, day(9));
    expect(after.lastRead?.[0]).toBe("2026-11-01");
    expect(lateWeekdays(after, day(9))).toEqual([0]);
  });
  it("ler o domingo atrasado durante a semana tira o atraso até o próximo domingo passar", () => {
    const p = creditPlan(sunday({ since: "2026-10-25", lastRead: log({ 0: "2026-11-01" }) }), 0, day(10));
    expect(p.lastRead?.[0]).toBe("2026-11-08");
    expect(overdueDays(p, day(10))).toBe(0);
    expect(overdueDays(p, day(16))).toBe(1);
  });
  it("ler o domingo adiantado no sábado vale para o domingo seguinte", () => {
    const p = creditPlan(sunday({ since: "2026-11-01", lastRead: log({ 0: "2026-11-08" }) }), 0, day(14));
    expect(p.lastRead?.[0]).toBe("2026-11-15");
    expect(overdueDays(p, day(16))).toBe(0);
  });
  it("dia com todos os capítulos lidos nunca fica atrasado", () => {
    const all = new Set(Array.from({ length: 40 }, (_, i) => `B02:${i + 1}`));
    expect(overdueDays(sunday({ since: "2026-10-01" }), day(16), all)).toBe(0);
  });
});

describe("restaurar backup / plano antigo: sem atraso de surpresa", () => {
  it("plano sem data de início nunca acusa atraso, mesmo com capítulos lidos", () => {
    expect(overdueDays(sunWed(), day(9), new Set(["B02:1", "B03:1"]))).toBe(0);
  });
  it("semear começa a contagem hoje: nada atrasado agora; domingo acende só depois do próximo domingo", () => {
    const p = seedPlan(sunWed(), undefined, day(9));
    expect(p.since).toBe("2026-11-09");
    expect(lateWeekdays(p, day(9))).toEqual([]);
    expect(lateWeekdays(p, day(12))).toEqual([3]); // quarta 11 passou sem leitura
    expect(lateWeekdays(p, day(16))).toEqual([3, 0]);
  });
  it("semear aproveita as datas que o aparelho já tinha e não mexe num plano já semeado", () => {
    const p = seedPlan(sunday(), log({ 0: "2026-11-15" }), day(9));
    expect(p.lastRead?.[0]).toBe("2026-11-15");
    expect(seedPlan(p, log({ 0: "2026-12-31" }), day(20))).toBe(p);
  });
  it("as datas vão junto no backup (sobrevivem à validação ao restaurar)", () => {
    const p = creditPlan(seedPlan(sunWed(), undefined, day(9)), 3, day(11));
    const restored = sanitizeWeekday(JSON.parse(JSON.stringify(p)));
    expect(restored?.since).toBe("2026-11-09");
    expect(restored?.lastRead?.[3]).toBe("2026-11-11");
    expect(lateWeekdays(restored, day(16))).toEqual([0]);
  });
  it("backup antigo (sem datas) continua sendo aceito", () => {
    const restored = sanitizeWeekday({ enabled: true, days: [["B02"]], pos: [] });
    expect(restored?.lastRead).toBeUndefined();
    expect(restored?.since).toBeUndefined();
  });
});

describe("editar o plano", () => {
  it("dia que ganha livro começa em dia e só acende quando a próxima ocorrência passar", () => {
    const prev = sunday({ since: "2026-10-01", lastRead: log({ 0: "2026-11-08" }) });
    const next = planEdited(prev, { ...prev, days: sunWed().days }, day(10));
    expect(lateWeekdays(next, day(10))).toEqual([]);
    expect(lateWeekdays(next, day(12))).toEqual([3]);
  });
  it("ligar a meta Dias recomeça a contagem hoje", () => {
    const next = planEdited({ ...sunday({ since: "2026-01-01" }), enabled: false }, sunday(), day(9));
    expect(next.since).toBe("2026-11-09");
    expect(overdueDays(next, day(9))).toBe(0);
  });
  it("edição feita na tela não apaga as datas já salvas", () => {
    const prev = sunday({ since: "2026-11-01", lastRead: log({ 0: "2026-11-08" }) });
    const next = planEdited(prev, { ...prev, lastRead: undefined, since: undefined, pos: ["B02:3", null, null, null, null, null, null] }, day(10));
    expect(next.lastRead?.[0]).toBe("2026-11-08");
    expect(next.since).toBe("2026-11-01");
  });
});

describe("leitura de hoje e capítulo marcado fora do cartão", () => {
  it("leitura de hoje pendente só até marcar a leitura do dia", () => {
    expect(weekdayPending(sunday({ lastRead: log({ 0: "2026-11-08" }) }), new Set(), day(15))).toBe(true);
    expect(weekdayPending(creditPlan(sunday(), 0, day(15)), new Set(), day(15))).toBe(false);
  });
  it("capítulo marcado fora do cartão de dias vai para o dia do livro", () => {
    expect(creditDayFor(sunWed(), "B03:2", day(10))).toBe(3);
    expect(creditDayFor(sunWed(), "B02:2", day(15))).toBe(0);
    expect(creditDayFor(sunWed(), "B05:1", day(15))).toBeNull();
  });
  it("meta Dias desligada: sem atraso", () => {
    expect(overdueDays({ ...sunday({ since: "2026-01-01" }), enabled: false }, day(16))).toBe(0);
  });
});
