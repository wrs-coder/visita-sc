// Preenchimento automático dos oradores da reunião a partir de uma lista colada (um por linha, em ordem).
// Regras: cântico sozinho não recebe nome; "Cântico e oração" recebe; "Comentários iniciais" e
// "Comentários finais" usam o mesmo nome (uma linha só); todas as outras partes recebem um nome.
// Dois nomes na mesma linha ("A e B" ou "A/B") = parte de demonstração, aceitos juntos como "A / B".
// O conselho não é parte guardada, então nunca entra na contagem.
import type { MeetingPart } from "./meeting-store";

const PRAYER = /ora[cç][aã]o|prayer|oraci[oó]n/i;

/** Parte que recebe orador? */
export function takesSpeaker(p: MeetingPart): boolean {
  if (p.kind === "song") return PRAYER.test(p.theme);
  return true;
}

/** Limpa uma linha: tira numeração ("1.", "2 -"), e junta pares de demonstração como "A / B". */
export function normalizeSpeakerLine(line: string): string {
  const s = line.replace(/^\s*\d{1,2}\s*[.)\-–:]\s*/, "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  const pair = s.split(/\s*\/\s*|\s+e\s+|\s+&\s+/i).map((x) => x.trim()).filter(Boolean);
  return (pair.length >= 2 ? pair.slice(0, 2).join(" / ") : s).slice(0, 120);
}

export function parseSpeakerLines(text: string): string[] {
  return text.split(/\r?\n/).map(normalizeSpeakerLine).filter(Boolean).slice(0, 80);
}

export interface SpeakerAssignment { byId: Map<string, string>; used: number; missing: number; extra: number }

/** Distribui os nomes nas partes na ordem mostrada. `skip` = partes já preenchidas automaticamente (ex.: SC). */
export function assignSpeakers(parts: MeetingPart[], names: string[], skip: Set<string> = new Set()): SpeakerAssignment {
  const byId = new Map<string, string>();
  let i = 0, missing = 0;
  let commentsName: string | null = null;
  for (const p of parts) {
    if (skip.has(p.id) || !takesSpeaker(p)) continue;
    if (p.kind === "comments") {
      if (commentsName == null) { if (i < names.length) commentsName = names[i++]; else { missing++; continue; } }
      byId.set(p.id, commentsName);
      continue;
    }
    if (i < names.length) byId.set(p.id, names[i++]); else missing++;
  }
  return { byId, used: i, missing, extra: Math.max(0, names.length - i) };
}
