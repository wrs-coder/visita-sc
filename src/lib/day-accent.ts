// Onda 6.7 — Mapeia o dia da semana para a cor lateral (CSS var).
// Usado pelo `.day-accent` para colorir a borda esquerda dos blocos
// do Cronograma. Cores definidas em src/styles.css.
import type { CSSProperties } from "react";

const DAY_VARS = [
  "var(--weekday-sun)", // 0 — domingo
  "var(--weekday-mon)", // 1 — segunda
  "var(--weekday-tue)", // 2
  "var(--weekday-wed)", // 3
  "var(--weekday-thu)", // 4
  "var(--weekday-fri)", // 5
  "var(--weekday-sat)", // 6
] as const;

export function dayAccentStyle(date: Date): CSSProperties {
  return { ["--day-color" as never]: DAY_VARS[date.getDay()] } as CSSProperties;
}
