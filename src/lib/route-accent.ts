// Onda 6.8 — Mapeia a rota ativa para um accent semântico por domínio.
// Reaproveita os tokens --weekday-* e adiciona aliases por área do app.
// O accent é injetado como --section-color no <main>, e cascateia para
// cards/abas/borders via utilitários .section-accent / .tabs-premium.
import type { CSSProperties } from "react";

export type AccentKey =
  | "visit"
  | "meetings"
  | "couple"
  | "checklist"
  | "meals"
  | "elder"
  | "notes"
  | "admin";

const ACCENT_VAR: Record<AccentKey, string> = {
  visit: "var(--accent-visit)",
  meetings: "var(--accent-meetings)",
  couple: "var(--accent-couple)",
  checklist: "var(--accent-checklist)",
  meals: "var(--accent-meals)",
  elder: "var(--accent-elder)",
  notes: "var(--accent-notes)",
  admin: "var(--accent-admin)",
};

const ACCENT_BG: Record<AccentKey, string> = {
  visit: "var(--accent-visit-bg)",
  meetings: "var(--accent-meetings-bg)",
  couple: "var(--accent-couple-bg)",
  checklist: "var(--accent-checklist-bg)",
  meals: "var(--accent-meals-bg)",
  elder: "var(--accent-elder-bg)",
  notes: "var(--accent-notes-bg)",
  admin: "var(--accent-admin-bg)",
};

// Mapeamento por prefixo de rota — ordem importa (mais específico primeiro).
const ROUTE_MAP: Array<[string, AccentKey]> = [
  ["/comunicacao-casal", "couple"],
  ["/reunioes-discursos", "meetings"],
  ["/reunioes-de-campo", "meetings"],
  ["/modelo-reunioes-discursos", "meetings"],
  ["/modelo-reunioes-de-campo", "meetings"],
  ["/refeicoes", "meals"],
  ["/transporte", "checklist"],
  ["/checklist-modelos", "checklist"],
  ["/checklist", "checklist"],
  ["/programa-ancioes", "elder"],
  ["/modelo-programacao-ancioes", "elder"],
  ["/notas", "notes"],
  ["/consideracoes-campo", "notes"],
  ["/lixeira", "admin"],
  ["/modelos", "admin"],
  ["/configuracoes", "admin"],
  ["/perfil", "admin"],
  ["/congregacoes", "admin"],
  ["/resumo-semana", "visit"],
  ["/cronograma", "visit"],
  ["/escala", "visit"],
  ["/relatorio", "visit"],
  ["/dashboard", "visit"],
];

export function accentForPath(pathname: string): AccentKey {
  for (const [prefix, key] of ROUTE_MAP) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return key;
  }
  return "visit";
}

export function accentStyle(key: AccentKey): CSSProperties {
  return {
    ["--section-color" as never]: ACCENT_VAR[key],
    ["--section-bg" as never]: ACCENT_BG[key],
  } as CSSProperties;
}
