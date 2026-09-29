// Helpers para exibir nos relatórios o mesmo dia/horário que a aba
// "Reuniões e Discursos" mostra (modelo vinculado ou ajuste da visita).

const WEEKDAYS_PT = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
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
