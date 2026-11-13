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
