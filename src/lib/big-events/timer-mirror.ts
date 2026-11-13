// Espelho do relógio do Controle de tempo (tablet no púlpito / mesa de som).
// Lógica pura: o celular do superintendente monta um "retrato" pequeno e o envia; o tablet
// continua contando sozinho pelo próprio relógio a partir do tempo decorrido recebido,
// então diferença de hora entre aparelhos ou sinal fraco não congela a contagem.
import { buildRows, fmtClockTime, fmtHm, isFloating, plannedMs, plannedStarts, spentMs, type TimerMode, type TimerPart, type TimerState } from "./event-timer";

export interface MirrorLive {
  id: string;
  /** "PARTE 03" (número da parte ou do título da série). */
  label: string | null;
  /** Tema da parte ou, no simpósio, o título da série. */
  title: string;
  /** Simpósio: tema do "•" atual e posição "1 de 3". */
  item: string | null;
  pos: { i: number; n: number } | null;
  minutes: number | null;
  speaker: string | null;
  /** Congregação do orador (só quando a parte é de um orador). */
  speakerCong?: string | null;
  plannedMs: number | null;
  /** Tempo decorrido (ms) no instante sentAt. */
  elapsedMs: number;
  paused: boolean;
  /** "10:15" pela hora do celular do superintendente. */
  endLabel: string | null;
  /** Só no simpósio / série: quem fala depois. */
  nextSpeaker: string | null;
  nextCong?: string | null;
}
export interface MirrorSnap {
  v: 1;
  event: string;
  mode: TimerMode;
  live: MirrorLive | null;
  next: { time: string; title: string } | null;
  sentAt: number;
}

const pad2 = (s: string) => (/^\d$/.test(s) ? `0${s}` : s);
export function whoFor(p: TimerPart, labels: { co: string; branch: string } = { co: "Superintendente de circuito", branch: "Representante da filial" }): string | null {
  if (p.assigned_to === "speaker") return p.speaker_name?.trim() || null;
  if (p.assigned_to === "co") return labels.co;
  if (p.assigned_to === "branch") return labels.branch;
  return null;
}
const congFor = (p: TimerPart | null | undefined) => (p && p.assigned_to === "speaker" ? p.speaker_congregation?.trim() || null : null);

export function buildSnap(eventName: string, parts: TimerPart[], s: TimerState, mode: TimerMode, now: number, labels?: { co: string; branch: string }): MirrorSnap {
  const rows = buildRows(parts);
  const byId = new Map(parts.map((p) => [p.id, p]));
  let live: MirrorLive | null = null;
  const p = s.active ? byId.get(s.active) : undefined;
  if (p && s.startedAt != null) {
    const head = rows.find((r) => r.kind === "head" && r.children?.some((c) => c.id === p.id));
    const kids = head?.children ?? [];
    const i = kids.findIndex((c) => c.id === p.id);
    const numSrc = head ? head.part.outline_number : p.outline_number;
    const planned = plannedMs(p);
    const elapsed = spentMs(s, p.id, now);
    const paused = s.pausedAt != null;
    const nextKid = i >= 0 && i + 1 < kids.length ? kids[i + 1] : null;
    live = {
      id: p.id,
      label: numSrc?.trim() ? `PARTE ${pad2(numSrc.trim())}` : null,
      title: head ? head.part.theme : p.theme,
      item: head ? p.theme : null,
      pos: head && i >= 0 ? { i: i + 1, n: kids.length } : null,
      minutes: planned != null ? Math.round(planned / 60_000) : null,
      speaker: whoFor(p, labels),
      speakerCong: congFor(p),
      plannedMs: planned,
      elapsedMs: elapsed,
      paused,
      endLabel: planned != null ? fmtClockTime(now - elapsed + planned) : null,
      nextSpeaker: nextKid ? whoFor(nextKid, labels) : null,
      nextCong: congFor(nextKid),
    };
  }
  let next: MirrorSnap["next"] = null;
  if (!live) {
    const starts = plannedStarts(parts);
    const done = new Set(s.done);
    // Próxima parte = primeira depois da última concluída (pela ordem do programa) que ainda não terminou.
    let lastDone = -1;
    rows.forEach((r, idx) => { if (done.has(r.part.id)) lastDone = idx; });
    const cand = rows.slice(lastDone + 1).find((r) => r.kind !== "head" && !done.has(r.part.id))
      ?? rows.find((r) => r.kind !== "head" && !done.has(r.part.id) && !isFloating(r.part));
    if (cand) next = { time: fmtHm(starts[cand.part.id] ?? null), title: cand.part.theme };
  }
  return { v: 1, event: eventName, mode, live, next, sentAt: now };
}

/** Tempo decorrido agora no tablet: o recebido + o que passou desde que chegou (se não pausado). */
export function liveElapsed(live: MirrorLive, receivedAt: number, now: number): number {
  return live.elapsedMs + (live.paused ? 0 : Math.max(0, now - receivedAt));
}

export type MirrorTone = "ok" | "warn" | "danger" | "over" | "idle";
/** Verde → amarelo faltando 2 min → vermelho faltando 1 min (ou no zero) → vermelho estourado. */
export function mirrorTone(planned: number | null, elapsed: number): MirrorTone {
  if (planned == null) return "idle";
  const left = planned - elapsed;
  if (left < 0) return "over";
  if (left <= 60_000) return "danger";
  if (left <= 120_000) return "warn";
  return "ok";
}
const mmss = (ms: number) => {
  const t = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};
/** Regressivo: 14:25 → 00:00 → +01:10. Cronômetro (ou parte sem tempo): 00:00 → 31:10. */
export function mirrorClock(mode: TimerMode, planned: number | null, elapsed: number): string {
  if (mode === "up" || planned == null) return mmss(elapsed);
  const left = planned - elapsed;
  return left < 0 && Math.floor(-left / 1000) >= 1 ? `+${mmss(-left)}` : mmss(Math.max(0, left));
}

/** Aceita só retratos bem formados (o canal é aberto para quem tem o código). */
export function parseSnap(x: unknown): MirrorSnap | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (o.v !== 1 || typeof o.sentAt !== "number" || (o.mode !== "up" && o.mode !== "down")) return null;
  const str = (v: unknown, max = 300) => (typeof v === "string" ? v.slice(0, max) : null);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  let live: MirrorLive | null = null;
  if (o.live && typeof o.live === "object") {
    const l = o.live as Record<string, unknown>;
    const elapsed = num(l.elapsedMs);
    if (elapsed == null || elapsed < 0) return null;
    const pos = l.pos && typeof l.pos === "object" ? l.pos as Record<string, unknown> : null;
    live = {
      id: str(l.id, 80) ?? "", label: str(l.label, 40), title: str(l.title) ?? "", item: str(l.item),
      pos: pos && num(pos.i) != null && num(pos.n) != null ? { i: num(pos.i)!, n: num(pos.n)! } : null,
      minutes: num(l.minutes), speaker: str(l.speaker, 120), speakerCong: str(l.speakerCong, 120), plannedMs: num(l.plannedMs), elapsedMs: elapsed,
      paused: l.paused === true, endLabel: str(l.endLabel, 8), nextSpeaker: str(l.nextSpeaker, 120), nextCong: str(l.nextCong, 120),
    };
  }
  const n = o.next && typeof o.next === "object" ? o.next as Record<string, unknown> : null;
  return { v: 1, event: str(o.event, 200) ?? "", mode: o.mode, live, next: n ? { time: str(n.time, 8) ?? "", title: str(n.title) ?? "" } : null, sentAt: o.sentAt };
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
/** Código aleatório do espelho (10 letras/números, sem os parecidos 0/o, 1/l/i). */
export function newMirrorCode(rand: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  return Array.from(rand(10), (b) => ALPHABET[b % ALPHABET.length]).join("");
}
export const isMirrorCode = (c: string) => /^[a-z2-9]{10}$/.test(c);
export const MIRROR_ORIGIN = "https://visitasc.com.br";
export const mirrorUrl = (code: string, origin: string = MIRROR_ORIGIN) => `${origin.replace(/\/+$/, "")}/relogio/${code}`;
/** Linha do orador: "Nome · Congregação". */
export const withCong = (name: string | null | undefined, cong: string | null | undefined) => [name, cong].filter((x) => !!x && x.trim()).join(" · ");
/** Linha 1 do relógio: "PARTE 05 • Série • tema atual (1 de 3) (10 min)". */
export function mirrorHeadline(l: MirrorLive, partOf: (i: number, n: number) => string): string {
  return [l.label, l.title, l.item].filter(Boolean).join(" • ") + (l.pos ? ` (${partOf(l.pos.i, l.pos.n)})` : "") + (l.minutes != null ? ` (${l.minutes} min)` : "");
}
export const mirrorChannel = (code: string) => `timer-mirror:${code}`;
