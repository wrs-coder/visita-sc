import { describe, expect, it } from "vitest";
import { emptyTimer, spentMs, type TimerPart } from "./event-timer";
import { overlayPayload, replayActions } from "./meeting-overlay";

const part = (id: string, sort_order: number, min: number): TimerPart =>
  ({ id, sort_order, theme: id.toUpperCase(), part_time: null, duration_min: min } as TimerPart);
const parts = [part("b", 2, 5), part("a", 1, 3), part("c", 3, 10)];

describe("boia da reunião fora do app", () => {
  it("próxima sem nada iniciado começa a primeira parte", () => {
    const s = replayActions(parts, emptyTimer(), [{ a: "next", t: 1000 }]);
    expect(s.active).toBe("a");
  });
  it("pausa e retoma sem contar o tempo pausado", () => {
    const s = replayActions(parts, emptyTimer(), [
      { a: "play", t: 0 }, { a: "play", t: 60_000 }, { a: "play", t: 120_000 },
    ]);
    expect(s.active).toBe("a");
    expect(spentMs(s, "a", 180_000)).toBe(120_000);
  });
  it("próxima encerra a atual e anterior volta", () => {
    let s = replayActions(parts, emptyTimer(), [{ a: "play", t: 0 }, { a: "next", t: 30_000 }]);
    expect(s.active).toBe("b");
    expect(s.spent.a).toBe(30_000);
    s = replayActions(parts, s, [{ a: "prev", t: 40_000 }]);
    expect(s.active).toBe("a");
  });
  it("aplica as ações em ordem de horário", () => {
    const s = replayActions(parts, emptyTimer(), [{ a: "next", t: 5000 }, { a: "play", t: 1000 }]);
    expect(s.active).toBe("b");
  });
  it("envia partes em ordem com tempo previsto em ms", () => {
    const s = replayActions(parts, emptyTimer(), [{ a: "play", t: 0 }]);
    const p = overlayPayload(parts, s, 1000, false, "m");
    expect(p.parts.map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(p.parts[0].plannedMs).toBe(180_000);
    expect(p.active).toBe(0);
  });
});
