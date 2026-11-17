// Reunião na semana da visita do superintendente: aplicada só na hora de mostrar/cronometrar,
// nada é gravado, então fora da semana de visita a ordem normal continua.
// - "Estudo bíblico de congregação" vira o discurso de serviço de terça (Programa da visita), 30 min, com o SC.
// - "Comentários finais" passa para antes do discurso.
// - O cântico final passa a ser o cântico de terça do Programa da visita.
import type { MeetingPart, MeetingProgram } from "./meeting-store";

export interface VisitWeekInfo { serviceTalk: string | null; finalSong: string | null; scName: string | null }
export const VISIT_TALK_MIN = 30;
const STUDY = /estudo b[ií]blico de congrega|congregation bible study|estudio b[ií]blico de (la )?congregaci/i;
const PRAYER = /ora[cç][aã]o|prayer|oraci[oó]n/i;

export function songNumber(v: string | null | undefined): string | null {
  const m = /(\d{1,3})/.exec(v ?? "");
  return m ? m[1] : null;
}

export function applyVisitWeek(prog: MeetingProgram, info: VisitWeekInfo | null): { program: MeetingProgram; talkId: string | null } {
  if (!info) return { program: prog, talkId: null };
  let parts: MeetingPart[] = prog.parts.map((p) => ({ ...p }));
  const studyIdx = parts.findIndex((p) => p.kind === "part" && STUDY.test(p.theme));
  let talkId: string | null = null;
  if (studyIdx >= 0) {
    const old = parts[studyIdx];
    const theme = info.serviceTalk?.trim() || "Discurso de serviço";
    parts[studyIdx] = { ...old, theme: theme.slice(0, 200), minutes: VISIT_TALK_MIN, assigned: info.scName?.trim() || old.assigned, counsel: undefined };
    talkId = old.id;
    const finIdx = parts.findIndex((p) => p.kind === "comments" && p.section === "close");
    if (finIdx > studyIdx) {
      const [fin] = parts.splice(finIdx, 1);
      parts.splice(studyIdx, 0, fin);
    }
  }
  const num = songNumber(info.finalSong);
  if (num) {
    let lastSong = -1;
    parts.forEach((p, i) => { if (p.kind === "song" && PRAYER.test(p.theme)) lastSong = i; });
    if (lastSong > 0) parts[lastSong] = { ...parts[lastSong], theme: `Cântico ${num} e oração` };
  }
  parts = parts.slice();
  return { program: { ...prog, parts }, talkId };
}
