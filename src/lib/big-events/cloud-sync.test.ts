import { describe, it, expect } from "vitest";
import { mergeEvent } from "./cloud-sync";
const e = (id: string) => ({ id }) as never;
const p = (id: string, event_id: string) => ({ id, event_id }) as never;
describe("mergeEvent", () => {
  it("substitui só o evento recebido", () => {
    const r = mergeEvent([e("a"), e("b")], [p("1", "a"), p("2", "b")], "a", e("a"), [p("3", "a")]);
    expect(r.events.map((x: { id: string }) => x.id).sort()).toEqual(["a", "b"]);
    expect(r.parts.map((x: { id: string }) => x.id).sort()).toEqual(["2", "3"]);
  });
  it("remove o evento que não existe mais na nuvem", () => {
    const r = mergeEvent([e("a"), e("b")], [p("1", "a")], "a", null, []);
    expect(r.events.map((x: { id: string }) => x.id)).toEqual(["b"]);
    expect(r.parts).toEqual([]);
  });
});

import { mergeWithLocal } from "./cloud-sync";
describe("mergeWithLocal", () => {
  it("nunca apaga eventos que só existem no aparelho", () => {
    const e = (id: string) => ({ id } as never);
    const r = mergeWithLocal([e("a")], [{ id: "pa", event_id: "a" } as never], [e("a"), e("b")], [{ id: "pb", event_id: "b" } as never]);
    expect(r.events.map((x: { id: string }) => x.id)).toEqual(["a", "b"]);
    expect(r.localOnly).toEqual(["b"]);
    expect(r.parts).toHaveLength(2);
  });
});

import { isExpiredBigEvent } from "./cloud-sync";
describe("eventos apagados e vencidos", () => {
  const ev = (id: string, event_date: string | null = null) => ({ id, event_date } as never);
  it("evento apagado na nuvem não volta da cópia do aparelho", () => {
    const r = mergeWithLocal([], [], [ev("x"), ev("y")], [], new Set(["x"]));
    expect(r.localOnly).toEqual(["y"]);
  });
  it("evento de 14/11 some em 17/11; de 15/11 ainda fica em 17/11", () => {
    expect(isExpiredBigEvent("2026-11-14", "2026-11-17")).toBe(true);
    expect(isExpiredBigEvent("2026-11-15", "2026-11-17")).toBe(false);
    expect(isExpiredBigEvent(null, "2026-11-17")).toBe(false);
  });
  it("evento vencido que só existe no aparelho não é reenviado", () => {
    const r = mergeWithLocal([], [], [ev("a", "2026-11-14"), ev("b", "2026-11-20")], [], new Set(), "2026-11-17");
    expect(r.localOnly).toEqual(["b"]);
  });
});
