// Leitor da apostila "Nossa Vida e Ministério Cristão" (.rtf ou .zip com vários .rtf).
// Tudo no aparelho; o arquivo é entrada não confiável: limites de tamanho, arquivos e partes.
// Formato: cabeçalho "11 a 17 de Janeiro (Ezequiel 13 a 14)", seções, partes "N. Tema (X min)",
// cânticos e comentários. Perguntas de estudo ("7. O que…?") não têm "(min)" e são ignoradas.
import { rtfToText } from "@/lib/big-events/rtf-program-import";
import type { MeetingPart, MeetingProgram, MeetingSection } from "./meeting-store";

export const MAX_RTF_BYTES = 3_000_000;
export const MAX_ZIP_BYTES = 15_000_000;
export const MAX_ZIP_ENTRIES = 40;
export const MAX_PARTS_PER_WEEK = 30;
/** Cântico com oração e o cântico do meio: minutos previstos (a apostila não informa). */
export const SONG_MIN = 5;
export const MID_SONG_MIN = 3;

const MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  enero: 1, febrero: 2, marzo: 3, mayo: 5, junio: 6, julio: 7, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const month = (s: string) => MONTHS[norm(s)] ?? null;

// "4 a 10 de Janeiro (…)" ou "28 de dezembro a 3 de janeiro (…)"
const WEEK = /^(\d{1,2})º?(?:\s+de\s+([A-Za-zÀ-ÿ]+))?\s+a\s+(\d{1,2})º?\s+de\s+([A-Za-zÀ-ÿ]+)\s*(?:\((.{1,120})\))?\s*$/;
const PART = /^(\d{1,2})\.\s*(.+?)\s*\((\d{1,3})\s*min\)\s*$/i;
const COMMENTS = /^coment[aá]rios\s+(iniciais|finais)\s*\((\d{1,2})\s*min\)/i;
const SONG = /^c[aâ]ntico\s+(\d{1,3})(\s+e\s+ora[cç][aã]o)?\s*$/i;
const SECTION: Array<[RegExp, MeetingSection]> = [
  [/^tesouros da palavra de deus$/i, "treasures"],
  [/^fa[cç]a seu melhor no minist[eé]rio$/i, "ministry"],
  [/^nossa vida crist[aã]$/i, "living"],
];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Ano mais próximo de "hoje" para um dia/mês sem ano (a apostila só traz o ano na capa). */
export function resolveYear(day: number, mon: number, today: Date): number {
  const y = today.getFullYear();
  let best = y, bestDiff = Infinity;
  for (const c of [y - 1, y, y + 1]) {
    const diff = Math.abs(new Date(c, mon - 1, day).getTime() - today.getTime());
    if (diff < bestDiff) { bestDiff = diff; best = c; }
  }
  return best;
}
export function mondayIso(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return iso(x);
}

const clean = (s: string) => s.replace(/^["“”‘’']+|["“”‘’']+$/g, "").replace(/\s+/g, " ").trim();
let seq = 0;
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `m${Date.now()}${++seq}`);

/** Lê o texto (já sem RTF) e devolve uma reunião por semana encontrada. */
export function parseMwbText(text: string, today: Date, defaultStart = "19:30"): MeetingProgram[] {
  const lines = text.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const out: MeetingProgram[] = [];
  let cur: MeetingProgram | null = null;
  let section: MeetingSection = "open";
  let ended = false;
  const push = (p: Omit<MeetingPart, "id" | "assigned">) => {
    if (!cur || ended || cur.parts.length >= MAX_PARTS_PER_WEEK) return;
    cur.parts.push({ id: newId(), assigned: "", ...p });
  };
  for (const l of lines) {
    const w = WEEK.exec(l);
    if (w) {
      const m2 = month(w[4]); const m1 = w[2] ? month(w[2]) : m2;
      if (!m1 || !m2) continue;
      const d1 = Number(w[1]);
      const y = resolveYear(d1, m1, today);
      const start = new Date(y, m1 - 1, d1);
      if (start.getDate() !== d1) continue;
      const monday = mondayIso(start);
      const tue = new Date(`${monday}T00:00:00`); tue.setDate(tue.getDate() + 1);
      cur = { id: newId(), monday, date: iso(tue), start: defaultStart, title: clean(w[5] ?? ""), parts: [], updatedAt: new Date().toISOString() };
      out.push(cur); section = "open"; ended = false;
      continue;
    }
    if (!cur || ended) continue;
    const sec = SECTION.find(([re]) => re.test(l));
    if (sec) { section = sec[1]; continue; }
    const c = COMMENTS.exec(l);
    if (c) {
      const final = /finais/i.test(c[1]);
      push({ theme: final ? "Comentários finais" : "Comentários iniciais", minutes: Number(c[2]), section: final ? "close" : "open", kind: "comments" });
      continue;
    }
    const s = SONG.exec(l);
    if (s) {
      const withPrayer = !!s[2];
      const closing = withPrayer && cur.parts.length > 0;
      push({ theme: `Cântico ${s[1]}${withPrayer ? " e oração" : ""}`, minutes: withPrayer ? SONG_MIN : MID_SONG_MIN, section: closing ? "close" : section, kind: "song" });
      if (closing) ended = true;
      continue;
    }
    const p = PART.exec(l);
    if (p) {
      const minutes = Number(p[3]);
      if (minutes < 1 || minutes > 90) continue;
      push({ theme: `${p[1]}. ${clean(p[2])}`.slice(0, 200), minutes, section, kind: "part" });
    }
  }
  return out.filter((m) => m.parts.some((p) => p.kind === "part"));
}

export function parseMwbRtf(rtf: string, today: Date, defaultStart?: string): MeetingProgram[] {
  if (rtf.length > MAX_RTF_BYTES) throw new Error("Arquivo muito grande.");
  if (!/^\s*\{\\rtf/.test(rtf)) throw new Error("Este arquivo não é um .rtf da apostila.");
  return parseMwbText(rtfToText(rtf), today, defaultStart);
}

/** RTF em bytes → texto (o RTF é ASCII com escapes; latin1 preserva os bytes). */
const bytesToRtf = (b: Uint8Array) => { let s = ""; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192)); return s; };

/** Aceita um .rtf ou um .zip com vários .rtf. Semanas repetidas: fica a última lida. */
export async function parseMwbFile(name: string, bytes: Uint8Array, today: Date, defaultStart?: string): Promise<MeetingProgram[]> {
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (!isZip) {
    if (bytes.length > MAX_RTF_BYTES) throw new Error("Arquivo muito grande.");
    return parseMwbRtf(bytesToRtf(bytes), today, defaultStart);
  }
  if (bytes.length > MAX_ZIP_BYTES) throw new Error("Arquivo .zip muito grande.");
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(bytes);
  const entries = Object.values(zip.files).filter((f) => !f.dir && /\.rtf$/i.test(f.name) && !f.name.includes("__MACOSX"));
  if (!entries.length) throw new Error(`Nenhum .rtf dentro de ${name}.`);
  if (entries.length > MAX_ZIP_ENTRIES) throw new Error("Arquivos demais dentro do .zip.");
  entries.sort((a, b) => a.name.localeCompare(b.name));
  const byMonday = new Map<string, MeetingProgram>();
  let total = 0;
  for (const e of entries) {
    const b = await e.async("uint8array");
    total += b.length;
    if (b.length > MAX_RTF_BYTES || total > MAX_ZIP_BYTES * 3) throw new Error("Conteúdo do .zip muito grande.");
    for (const m of parseMwbRtf(bytesToRtf(b), today, defaultStart)) byMonday.set(m.monday, m);
  }
  return [...byMonday.values()].sort((a, b) => a.monday.localeCompare(b.monday));
}
