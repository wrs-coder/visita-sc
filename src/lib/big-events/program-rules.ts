// Regras comuns a todas as importações de programa (.rtf, .etim, .csv, .json):
// numeração dos esboços, tipo automático, parte de Oração e Presidente do programa.
// Só preenche o que o arquivo não trouxe; o .visitasc não passa por aqui.
import type { EtimPart } from "./etim-import";
import { fromMin, toMin } from "./invite";

export const PRAYER_TYPE = "Oração";
export const CHAIR_TYPE = "Presidência do programa";
/** Partes que acontecem "junto" com outra: não somam tempo nem recebem número. */
export const isFloatingType = (label: string | null | undefined) => label === PRAYER_TYPE || label === CHAIR_TYPE;

const PRAYER_SONG = /^c[aâ]ntico\b.*\be\s+ora[cç][aã]o\b/i;
const MUSIC = /^(m[uú]sica|v[ií]deo musical)\b/i;
const IS_PRAYER = /^ora[cç][aã]o\b/i;
const IS_CHAIR = /presid/i;

/** Tipo pelo texto do tema (mesma ordem de prioridade do .etim). */
export function typeForTheme(theme: string, symposium: boolean): string {
  if (/batismo/i.test(theme)) return "Discurso Batismo";
  if (/discurso\s+(para o\s+)?p[úu]blico/i.test(theme)) return "Discurso Público";
  if (/sentinela/i.test(theme)) return "A Sentinela";
  if (symposium || /^s[eé]rie de discursos/i.test(theme)) return "Simpósio";
  if (/experi[êe]ncias|entrevista/i.test(theme)) return "Entrevistas";
  return "Discurso";
}

const blank = (theme: string, label: string, time: string | null): EtimPart => ({
  part_time: time, duration_min: null, theme, outline_number: null, instructions: null,
  part_type_id: null, part_type_label: label, symposium: false, talk_includes: [], assigned_to: "speaker",
  time_mode: time ? "manual" : "auto",
});

export function applyProgramRules(input: EtimPart[], opts: { renumber?: boolean } = {}): EtimPart[] {
  const out: EtimPart[] = [];
  input.forEach((p0, i) => {
    const p = { ...p0 };
    const prev = out[out.length - 1];
    // (04) Presidente do programa: 40 min antes da Música / Vídeo musical.
    if (MUSIC.test(p.theme) && !(prev && (isFloatingType(prev.part_type_label) && prev.part_type_label === CHAIR_TYPE || IS_CHAIR.test(prev.theme)))) {
      const m = toMin(p.part_time);
      out.push(blank("Presidente do programa", CHAIR_TYPE, m == null ? null : fromMin(Math.max(0, m - 40))));
      if (m != null) p.time_mode = "manual"; // a Música mantém o horário do programa
    }
    // (02) Tipo automático para quem tem designado.
    if (p.assigned_to !== "none" && !p.part_type_label) p.part_type_label = typeForTheme(p.theme, p.symposium);
    out.push(p);
    // (03) Oração junto com "Cântico (Nº) e oração".
    const next = input[i + 1];
    if (PRAYER_SONG.test(p.theme) && !(next && (IS_PRAYER.test(next.theme) || next.part_type_label === PRAYER_TYPE))) {
      out.push(blank("Oração", PRAYER_TYPE, p.part_time));
    }
  });
  // (01) Numeração: todas as partes com designado, menos Oração e Presidente.
  const numbered = (p: EtimPart) => p.assigned_to !== "none" && !isFloatingType(p.part_type_label);
  if (opts.renumber || !out.some((p) => numbered(p) && p.outline_number)) {
    let n = 0;
    for (const p of out) p.outline_number = numbered(p) ? String(++n) : null;
  }
  return out;
}
