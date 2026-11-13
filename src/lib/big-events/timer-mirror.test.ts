import { describe, expect, it } from "vitest";
import { emptyTimer, tapPart, togglePause, type TimerPart } from "./event-timer";
import { buildSnap, liveElapsed, mirrorClock, mirrorTone, newMirrorCode, isMirrorCode, parseSnap } from "./timer-mirror";
import { LOCAL_LOGIC_JS, localMirrorHtml } from "./timer-mirror-page";
import { countRecent } from "./timer-mirror-link";
import { SERIES_HEAD, SERIES_ITEM } from "./program-rules";

const P = (id: string, o: number, dur: number | null, extra: Partial<TimerPart> = {}): TimerPart => ({
  id, sort_order: o, theme: `Tema ${id}`, part_time: null, duration_min: dur, outline_number: null, part_type_id: null,
  part_type_label: "Discurso", assigned_to: "speaker", speaker_name: `Irmão ${id}`, ...extra,
});
const M = 60_000, S = 1000;
const at = (h: number, m: number) => new Date(2026, 10, 14, h, m, 0).getTime();

describe("relógio espelhado — cores", () => {
  it("verde com mais de 2 minutos restantes", () => expect(mirrorTone(30 * M, 27 * M)).toBe("ok"));
  it("amarelo quando faltam 2 minutos", () => expect(mirrorTone(30 * M, 28 * M)).toBe("warn"));
  it("vermelho quando falta 1 minuto", () => expect(mirrorTone(30 * M, 29 * M)).toBe("danger"));
  it("vermelho ao completar o tempo", () => expect(mirrorTone(30 * M, 30 * M)).toBe("danger"));
  it("estourado depois do tempo (mostra 'Seu tempo terminou')", () => expect(mirrorTone(30 * M, 30 * M + S)).toBe("over"));
  it("parte sem tempo fica neutra", () => expect(mirrorTone(null, 5 * M)).toBe("idle"));
});

describe("relógio espelhado — números", () => {
  it("regressivo mostra o que falta", () => expect(mirrorClock("down", 30 * M, 15 * M + 35 * S)).toBe("14:25"));
  it("regressivo estourado mostra +MM:SS", () => expect(mirrorClock("down", 30 * M, 31 * M + 10 * S)).toBe("+01:10"));
  it("cronômetro segue a escolha do superintendente", () => expect(mirrorClock("up", 30 * M, 8 * M + 40 * S)).toBe("08:40"));
  it("parte sem tempo conta para cima", () => expect(mirrorClock("down", null, 65 * S)).toBe("01:05"));
  it("a página da rede local usa as mesmas regras", () => {
    const fn = new Function(`${LOCAL_LOGIC_JS}; return { tone: tone, clock: clock };`)() as { tone: typeof mirrorTone; clock: typeof mirrorClock };
    for (const e of [0, 59 * S, 27 * M, 28 * M, 28 * M + 1, 29 * M, 30 * M, 30 * M + 999, 30 * M + S, 95 * M]) {
      expect(fn.tone(30 * M, e)).toBe(mirrorTone(30 * M, e));
      expect(fn.clock("down", 30 * M, e)).toBe(mirrorClock("down", 30 * M, e));
      expect(fn.clock("up", 30 * M, e)).toBe(mirrorClock("up", 30 * M, e));
    }
  });
});

describe("relógio espelhado — retrato enviado ao tablet", () => {
  it("mostra parte, orador e previsão de término pela hora de início + minutos", () => {
    const parts = [P("a", 1, 30, { outline_number: "3", theme: "Discurso de Abertura", speaker_name: "Irmão Silva" })];
    const s = tapPart(emptyTimer(), "a", at(9, 45));
    const snap = buildSnap("Assembleia", parts, s, "down", at(9, 50));
    expect(snap.live?.label).toBe("PARTE 03");
    expect(snap.live?.speaker).toBe("Irmão Silva");
    expect(snap.live?.endLabel).toBe("10:15");
    expect(snap.live?.elapsedMs).toBe(5 * M);
    expect(snap.live?.nextSpeaker).toBeNull();
  });
  it("no simpósio mostra 'Parte 1 de 3' e o próximo orador", () => {
    const parts = [
      P("h", 1, 30, { part_type_id: SERIES_HEAD, theme: "Simpósio: Imite a fé", outline_number: "5", assigned_to: "none", speaker_name: null }),
      P("i1", 2, 10, { part_type_id: SERIES_ITEM, speaker_name: "Irmão Marcos" }),
      P("i2", 3, 10, { part_type_id: SERIES_ITEM, speaker_name: "Irmão Costa" }),
      P("i3", 4, 10, { part_type_id: SERIES_ITEM, speaker_name: "Irmão Lima" }),
    ];
    const snap = buildSnap("Assembleia", parts, tapPart(emptyTimer(), "i1", at(10, 35)), "down", at(10, 36));
    expect(snap.live?.title).toBe("Simpósio: Imite a fé");
    expect(snap.live?.label).toBe("PARTE 05");
    expect(snap.live?.pos).toEqual({ i: 1, n: 3 });
    expect(snap.live?.nextSpeaker).toBe("Irmão Costa");
    const last = buildSnap("Assembleia", parts, tapPart(emptyTimer(), "i3", at(10, 55)), "down", at(10, 56));
    expect(last.live?.nextSpeaker).toBeNull();
  });
  it("SC e filial aparecem pelo papel", () => {
    const snap = buildSnap("X", [P("a", 1, 30, { assigned_to: "co", speaker_name: null })], tapPart(emptyTimer(), "a", 0), "down", 1000);
    expect(snap.live?.speaker).toBe("Superintendente de circuito");
  });
  it("entre as partes mostra a próxima parte", () => {
    const parts = [P("a", 1, 10, { part_time: "13:20" }), P("b", 2, 5, { part_time: "13:30", theme: "Cântico 45" })];
    let s = tapPart(emptyTimer(), "a", 0); s = tapPart(s, "a", 10 * M);
    const snap = buildSnap("X", parts, s, "down", 10 * M);
    expect(snap.live).toBeNull();
    expect(snap.next).toEqual({ time: "13:30", title: "Cântico 45" });
  });
  it("o tablet continua contando sozinho e para quando pausado", () => {
    const parts = [P("a", 1, 30)];
    const run = buildSnap("X", parts, tapPart(emptyTimer(), "a", 0), "down", 60 * S);
    expect(liveElapsed(run.live!, 5000, 5000 + 20 * S)).toBe(80 * S);
    const paused = buildSnap("X", parts, togglePause(tapPart(emptyTimer(), "a", 0), 60 * S), "down", 90 * S);
    expect(liveElapsed(paused.live!, 5000, 5000 + 20 * S)).toBe(60 * S);
  });
  it("só aceita retratos válidos", () => {
    const snap = buildSnap("X", [P("a", 1, 30)], tapPart(emptyTimer(), "a", 0), "down", 1000);
    expect(parseSnap(JSON.parse(JSON.stringify(snap)))?.live?.elapsedMs).toBe(1000);
    expect(parseSnap({ v: 2 })).toBeNull();
    expect(parseSnap({ v: 1, mode: "down", sentAt: 1, live: { elapsedMs: -5 } })).toBeNull();
    expect(parseSnap("x")).toBeNull();
  });
});

describe("relógio espelhado — código e página local", () => {
  it("código aleatório de 10 caracteres", () => {
    const c = newMirrorCode();
    expect(isMirrorCode(c)).toBe(true);
    expect(isMirrorCode("abc")).toBe(false);
    expect(isMirrorCode("../../etc1")).toBe(false);
  });
  it("conta só aparelhos vistos nos últimos 25 s", () => {
    const m = new Map([["a", 0], ["b", 20_000], ["c", 30_000]]);
    expect(countRecent(m, 40_000)).toBe(2);
    expect(m.has("a")).toBe(false);
  });
  it("textos não quebram a página local", () => {
    const html = localMirrorHtml({ title: "R", live: "</script><b>", paused: "", noSignal: "", speaker: "", end: "", nextSpeaker: "", over: "", nextPart: "", waiting: "", tapFull: "", partOf: "" },
      { bg: "rgb(0,0,0)", fg: "rgb(1,1,1)", muted: "red;}</style>", ok: "x", warn: "x", danger: "x", border: "x" });
    expect(html).not.toContain("</script><b>");
    expect(html).not.toContain("}</style>\"");
    expect(html.match(/<\/script>/g)?.length).toBe(1);
  });
});
