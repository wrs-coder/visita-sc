import { describe, expect, it } from "vitest";
import { buildTopicSchedule, parseTopicMinutes } from "./outline-schedule";

describe("parseTopicMinutes", () => {
  it("lê formatos comuns", () => {
    expect(parseTopicMinutes("Introdução (5 min)")).toBe(5);
    expect(parseTopicMinutes("Ponto 2 — 10 min.")).toBe(10);
    expect(parseTopicMinutes("Conclusão 3 minutos")).toBe(3);
  });
  it("ignora títulos sem tempo", () => {
    expect(parseTopicMinutes("Mateus 5:3")).toBeNull();
  });
});

describe("buildTopicSchedule", () => {
  const topics = [{ id: "a", minutes: 5 }, { id: "b", minutes: 10 }, { id: "c", minutes: 5 }];
  const T0 = 1_000_000;

  it("sem cronômetro mostra acumulado e nenhum horário", () => {
    const s = buildTopicSchedule(topics, null, {});
    expect(s.slots.b.cumulative).toBe(15);
    expect(s.slots.b.expectedEnd).toBeNull();
    expect(s.totalMinutes).toBe(20);
  });

  it("com cronômetro prevê horário de cada tópico", () => {
    const s = buildTopicSchedule(topics, T0, {});
    expect(s.slots.a.expectedEnd).toBe(T0 + 5 * 60_000);
    expect(s.slots.c.expectedEnd).toBe(T0 + 20 * 60_000);
    expect(s.slots.a.current).toBe(true);
  });

  it("concluir atrasado empurra os seguintes e informa 2 min de atraso", () => {
    const doneAt = T0 + 7 * 60_000;
    const s = buildTopicSchedule(topics, T0, { a: doneAt });
    expect(s.deviationSec).toBe(120);
    expect(s.slots.b.expectedEnd).toBe(doneAt + 10 * 60_000);
    expect(s.slots.b.current).toBe(true);
  });

  it("concluir adiantado informa desvio negativo", () => {
    const s = buildTopicSchedule(topics, T0, { a: T0 + 4 * 60_000 });
    expect(s.deviationSec).toBe(-60);
  });
});
