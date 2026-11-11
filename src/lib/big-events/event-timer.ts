// Controle de tempo do evento: tudo no aparelho (localStorage), calculado pelo relógio real
// (Date.now), para continuar certo ao fechar/reabrir o app. Lógica pura e testável.
// Regras: Oração/Presidente não contam; os "•" da Série somam dentro do tempo do título,
// e o resultado da série entra uma única vez no total do programa.
import { isFloatingType, SERIES_HEAD, SERIES_ITEM } from "./program-rules";

export interface TimerPart {
  id: string; sort_order: number; theme: string; part_time: string | null; duration_min: number | null;
  outline_number: string | null; part_type_id: string | null; part_type_label: string | null;
  assigned_to: string; speaker_name: string | null;
}
export interface TimerState {
  v: 1; active: string | null; startedAt: number | null; pausedAt: number | null;
  /** Tempo real acumulado (ms) por parte, sem contar o trecho em andamento. */
  spent: Record<string, number>;
  done: string[];
  /** Hora real (Date.now) em que cada parte começou pela primeira vez. */
  firstStart?: Record<string, number>;
}
export const emptyTimer = (): TimerState => ({ v: 1, active: null, startedAt: null, pausedAt: null, spent: {}, done: [], firstStart: {} });

const key = (eventId: string) => `bigEventTimer.${eventId}`;
export function loadTimer(eventId: string): TimerState {
  try {
    const raw = JSON.parse(localStorage.getItem(key(eventId)) ?? "null");
    if (!raw || raw.v !== 1 || typeof raw.spent !== "object") return emptyTimer();
    const spent: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw.spent)) if (typeof v === "number" && v >= 0 && Number.isFinite(v)) spent[k] = v;
    const firstStart: Record<string, number> = {};
    if (raw.firstStart && typeof raw.firstStart === "object") for (const [k, v] of Object.entries(raw.firstStart)) if (typeof v === "number" && Number.isFinite(v)) firstStart[k] = v;
    const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);
    return { v: 1, active: typeof raw.active === "string" ? raw.active : null, startedAt: num(raw.startedAt), pausedAt: num(raw.pausedAt),
      spent, done: Array.isArray(raw.done) ? raw.done.filter((x: unknown) => typeof x === "string") : [], firstStart };
  } catch { return emptyTimer(); }
}
export function saveTimer(eventId: string, s: TimerState): void {
  try { localStorage.setItem(key(eventId), JSON.stringify(s)); } catch { /* */ }
}
export function clearTimer(eventId: string): void { try { localStorage.removeItem(key(eventId)); } catch { /* */ } }
export const hasTimer = (eventId: string) => { const s = loadTimer(eventId); return !!s.active || s.done.length > 0; };

/** Tempo real (ms) de uma parte, incluindo o trecho em andamento. */
export function spentMs(s: TimerState, id: string, now: number): number {
  let ms = s.spent[id] ?? 0;
  if (s.active === id && s.startedAt != null) ms += Math.max(0, (s.pausedAt ?? now) - s.startedAt);
  return ms;
}

const close = (s: TimerState, now: number): TimerState => {
  if (!s.active) return s;
  const id = s.active;
  return { ...s, spent: { ...s.spent, [id]: spentMs(s, id, now) }, done: s.done.includes(id) ? s.done : [...s.done, id], active: null, startedAt: null, pausedAt: null };
};
/** Toque numa parte: encerra a que está rodando e inicia (ou retoma) a tocada. Tocar na ativa encerra. */
export function tapPart(s: TimerState, id: string, now: number): TimerState {
  if (s.active === id) return close(s, now);
  const c = close(s, now);
  const fs = c.firstStart ?? {};
  return { ...c, active: id, startedAt: now, pausedAt: null, done: c.done.filter((x) => x !== id), firstStart: fs[id] != null ? fs : { ...fs, [id]: now } };
}
export function togglePause(s: TimerState, now: number): TimerState {
  if (!s.active || s.startedAt == null) return s;
  if (s.pausedAt != null) return { ...s, startedAt: s.startedAt + (now - s.pausedAt), pausedAt: null };
  return { ...s, pausedAt: now };
}
export function stopAll(s: TimerState, now: number): TimerState { return close(s, now); }
/** Refazer: zera a parte (se estiver rodando, recomeça do zero). */
export function resetPart(s: TimerState, id: string, now: number): TimerState {
  const spent = { ...s.spent }; delete spent[id];
  const done = s.done.filter((x) => x !== id);
  const firstStart = { ...(s.firstStart ?? {}) }; delete firstStart[id];
  if (s.active === id) return { ...s, spent, done, startedAt: now, pausedAt: null, firstStart: { ...firstStart, [id]: now } };
  return { ...s, spent, done, firstStart };
}
/** Corrigir: define o tempo real em minutos de uma parte já concluída. */
export function setPartMinutes(s: TimerState, id: string, minutes: number): TimerState {
  if (!Number.isFinite(minutes) || minutes < 0) return s;
  const spent = { ...s.spent, [id]: Math.round(minutes * 60_000) };
  return { ...s, spent, done: s.done.includes(id) || s.active === id ? s.done : [...s.done, id] };
}

export const plannedMs = (p: TimerPart) => (p.duration_min && p.duration_min > 0 ? p.duration_min * 60_000 : null);
export const isFloating = (p: TimerPart) => isFloatingType(p.part_type_label);

export interface Row { part: TimerPart; kind: "part" | "head" | "item"; children?: TimerPart[] }
/** Agrupa a lista: o título da série recebe seus "•" como filhos. */
export function buildRows(parts: TimerPart[]): Row[] {
  const sorted = [...parts].sort((a, b) => a.sort_order - b.sort_order);
  const rows: Row[] = [];
  let head: Row | null = null;
  for (const p of sorted) {
    if (p.part_type_id === SERIES_ITEM && head) { head.children!.push(p); rows.push({ part: p, kind: "item" }); continue; }
    head = p.part_type_id === SERIES_HEAD ? { part: p, kind: "head", children: [] } : null;
    rows.push(head ?? { part: p, kind: "part" });
  }
  return rows;
}

export interface PartResult { id: string; planned: number | null; actual: number; diff: number | null; done: boolean }
export interface Summary {
  /** Desvio acumulado do programa (ms): + atrasado, − adiantado. */
  programDiff: number;
  parts: Record<string, PartResult>;
  /** Desvio por ancião (ms), só partes com tempo previsto e concluídas. */
  bySpeaker: Array<{ name: string; diff: number; parts: number }>;
}

export function summarize(partsIn: TimerPart[], s: TimerState, now: number): Summary {
  const rows = buildRows(partsIn);
  const parts: Record<string, PartResult> = {};
  const done = new Set(s.done);
  const res = (p: TimerPart): PartResult => {
    const planned = plannedMs(p), actual = spentMs(s, p.id, now), isDone = done.has(p.id);
    const live = s.active === p.id;
    // Em andamento só conta se já estourou; concluída conta o desvio inteiro.
    const diff = planned == null ? null : isDone ? actual - planned : live ? Math.max(0, actual - planned) : null;
    return { id: p.id, planned, actual, diff, done: isDone };
  };
  let programDiff = 0;
  for (const r of rows) {
    if (r.kind === "item") continue;
    const p = r.part;
    if (r.kind === "head" && r.children!.length) {
      const kids = r.children!.map(res);
      kids.forEach((k) => (parts[k.id] = k));
      const actual = kids.reduce((a, k) => a + k.actual, 0);
      const planned = plannedMs(p);
      const allDone = kids.every((k) => k.done);
      const started = kids.some((k) => k.done || s.active === k.id);
      // Série completa: real total × tempo do título. Em andamento: soma dos desvios dos "•";
      // e nunca menos que o estouro do próprio título.
      let diff: number | null = null;
      if (planned != null && allDone) diff = actual - planned;
      else if (started) {
        const partial = kids.reduce((a, k) => a + (k.diff ?? 0), 0);
        diff = planned != null ? Math.max(partial, actual - planned) : partial;
      }
      parts[p.id] = { id: p.id, planned, actual, diff, done: allDone };
      if (diff != null) programDiff += diff;
      continue;
    }
    const r1 = res(p);
    parts[p.id] = r1;
    if (!isFloating(p) && r1.diff != null) programDiff += r1.diff;
  }
  const sp = new Map<string, { diff: number; parts: number }>();
  for (const p of partsIn) {
    const name = p.speaker_name?.trim();
    const r = parts[p.id];
    if (!name || p.assigned_to !== "speaker" || !r?.done || r.diff == null || p.part_type_id === SERIES_HEAD && rows.some((x) => x.part.id === p.id && x.children?.length)) continue;
    const cur = sp.get(name) ?? { diff: 0, parts: 0 };
    sp.set(name, { diff: cur.diff + r.diff, parts: cur.parts + 1 });
  }
  const clockDiff = clockProgramDiff(partsIn, s, now);
  if (clockDiff != null) programDiff = clockDiff;
  return { programDiff, parts, bySpeaker: [...sp].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.diff - a.diff) };
}

export type Tone = "ok" | "warn" | "over" | "idle";
/** Cor da contagem: verde → âmbar no último minuto → vermelho estourado. */
export function toneFor(planned: number | null, actual: number): Tone {
  if (planned == null) return "idle";
  const left = planned - actual;
  return left < 0 ? "over" : left <= 60_000 ? "warn" : "ok";
}
/** "8:24", "-0:42" → sinal opcional; arredonda para baixo por segundo. */
export function clock(ms: number): string {
  const neg = ms < 0, t = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  const body = h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
  return neg ? `-${body}` : body;
}
export const signed = (ms: number) => (Math.abs(ms) < 1000 ? "0:00" : (ms > 0 ? "+" : "−") + clock(Math.abs(ms)));
export function programLabel(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min === 0) return "Programa no horário";
  const a = Math.abs(min), txt = a >= 60 ? `${Math.floor(a / 60)}h${String(a % 60).padStart(2, "0")}` : `${a} min`;
  return min > 0 ? `Programa +${txt} atrasado` : `Programa ${txt} adiantado`;
}

// ---- Modo de exibição: temporizador (regressivo) ou cronômetro (progressivo) ----
export type TimerMode = "down" | "up";
const MODE_KEY = "bigEventTimer.mode";
export function loadMode(): TimerMode { try { return localStorage.getItem(MODE_KEY) === "up" ? "up" : "down"; } catch { return "down"; } }
export function saveMode(m: TimerMode): void { try { localStorage.setItem(MODE_KEY, m); } catch { /* */ } }
/** Texto do relógio grande. Temporizador: 16:00 → 0:00 → -0:45. Cronômetro: 0:00 → 16:45. */
export function displayClock(mode: TimerMode, planned: number | null, actual: number): string {
  if (mode === "up" || planned == null) return clock(actual);
  return clock(planned - actual);
}

// ---- Início previsto × início real ----
const hm = (t: string | null) => { const m = t?.match(/^(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
/** Minutos do dia em que cada parte deveria começar ("•" seguem o título somando os tempos anteriores). */
export function plannedStarts(parts: TimerPart[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const r of buildRows(parts)) {
    if (r.kind === "item") continue;
    const base = hm(r.part.part_time);
    out[r.part.id] = base;
    let acc = base;
    for (const k of r.children ?? []) {
      const own = hm(k.part_time);
      out[k.id] = own ?? acc;
      acc = (own ?? acc) == null ? null : (own ?? acc)! + (k.duration_min ?? 0);
    }
  }
  return out;
}
/** Minutos inteiros de atraso no início (+ atrasou, − adiantou). null = sem referência. */
export function startDelayMin(plannedMinOfDay: number | null, eventDate: string | null, actualStart: number | null, now: number): number | null {
  if (plannedMinOfDay == null) return null;
  const ref = actualStart ?? now;
  const d = new Date(ref);
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  // Antes de começar, só avisa atraso no dia do evento; depois de começar, compara sempre pela hora do dia.
  if (actualStart == null && (!eventDate || eventDate !== today)) return null;
  const plannedAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(plannedMinOfDay / 60), plannedMinOfDay % 60).getTime();
  const diff = Math.round((ref - plannedAt) / 60_000);
  if (actualStart == null && diff <= 0) return null; // ainda não chegou a hora
  return diff;
}
/** Desvio do programa pela hora do celular (ms): fim real (ou projetado, se ainda corre) da
 *  última parte iniciada − fim que o programa marcava. null = sem referência de horário. */
export function clockProgramDiff(parts: TimerPart[], s: TimerState, now: number): number | null {
  const fs = s.firstStart ?? {};
  let last: TimerPart | null = null;
  for (const p of parts) {
    if (fs[p.id] == null || isFloating(p) || (s.active !== p.id && !s.done.includes(p.id))) continue;
    if (!last || fs[p.id] > fs[last.id]) last = p;
  }
  if (!last) return null;
  const starts = plannedStarts(parts);
  const pStart = starts[last.id], planned = plannedMs(last);
  if (pStart == null || planned == null) return null;
  const begin = fs[last.id], d = new Date(begin);
  const plannedEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(pStart / 60), pStart % 60).getTime() + planned;
  const actual = spentMs(s, last.id, now);
  const realEnd = begin + (s.active === last.id ? Math.max(actual, planned) : actual);
  return realEnd - plannedEnd;
}
/** "+5", "−12", "−7h37" (minutos inteiros; horas quando passar de 60). */
export function fmtDelay(min: number): string {
  const a = Math.abs(min), sign = min > 0 ? "+" : min < 0 ? "−" : "";
  return a >= 60 ? `${sign}${Math.floor(a / 60)}h${String(a % 60).padStart(2, "0")}` : `${sign}${a}`;
}
export const fmtHm = (min: number | null) => (min == null ? "--:--" : `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`);
export const fmtClockTime = (ms: number) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

/** Números do resumo executivo do relatório (só partes concluídas com tempo previsto). */
export interface ExecStats { onTime: number; over: number; under: number; worst: { name: string; diff: number } | null; best: { name: string; diff: number } | null }
export function executiveStats(sum: Summary): ExecStats {
  let onTime = 0, over = 0, under = 0;
  for (const r of Object.values(sum.parts)) {
    if (!r.done || r.diff == null) continue;
    if (r.diff > 30_000) over++; else if (r.diff < -30_000) under++; else onTime++;
  }
  const sp = sum.bySpeaker;
  const worst = sp.length && sp[0].diff > 30_000 ? { name: sp[0].name, diff: sp[0].diff } : null;
  const last = sp[sp.length - 1];
  const best = last && last.diff < -30_000 ? { name: last.name, diff: last.diff } : null;
  return { onTime, over, under, worst, best };
}
