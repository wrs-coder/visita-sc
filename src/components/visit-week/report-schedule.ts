// Helpers para exibir nos relatórios o mesmo dia/horário que a aba
// "Reuniões e Discursos" mostra (modelo vinculado ou ajuste da visita).

// Mesma ordem da aba (templates.weekdays): 0 = Segunda … 6 = Domingo.
const WEEKDAYS_PT = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

export const TO_BE_DEFINED = "A combinar";

/** "Terça-feira · 19:30" ou "A combinar" quando nada está definido. */
export function formatWeekdayTime(
  weekday: number | null | undefined,
  time: string | null | undefined,
): string {
  const day = weekday != null && weekday >= 0 && weekday <= 6 ? WEEKDAYS_PT[weekday] : null;
  const hhmm = time ? time.slice(0, 5) : null;
  if (!day && !hhmm) return TO_BE_DEFINED;
  return [day ?? TO_BE_DEFINED, hhmm].filter(Boolean).join(" · ");
}

/** Valor sempre visível ("—" quando vazio) para listas completas. */
export function kvAlways(label: string, value: string | null | undefined): string {
  const v = value == null ? "" : String(value).trim();
  return `${label}: ${v || "—"}`;
}

/**
 * Meio/Fim de semana guardam dia+hora numa data âncora (07/01/2024 = domingo
 * + dia escolhido). Lê só o dia da semana e o horário, como a aba faz.
 */
export function formatAnchorWeekdayTime(iso: string | null | undefined): string {
  if (!iso) return TO_BE_DEFINED;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return TO_BE_DEFINED;
  const pad = (n: number) => String(n).padStart(2, "0");
  return formatWeekdayTime((d.getDay() + 6) % 7, `${pad(d.getHours())}:${pad(d.getMinutes())}`);
}

/** Dia da semana da data âncora na ordem da aba (0 = Segunda). */
export function anchorWeekday(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : (d.getDay() + 6) % 7;
}
