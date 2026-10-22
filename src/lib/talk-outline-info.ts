// Tipos de esboço da pasta "Esboços da Semana" e seus campos extras.
// Os dados ficam em FieldNote.talk (opcional): esboços antigos não mudam.

export const TALK_KINDS = [
  "public_talk",
  "service_initial",
  "pioneer_meeting",
  "elders_meeting",
  "service_final",
  "event_talk",
] as const;
export type TalkKind = (typeof TALK_KINDS)[number];

export const TALK_FIELDS = [
  "talk_title",
  "song",
  "prayer",
  "opening_prayer",
  "closing_prayer",
  "next_congregation",
  "next_theme",
  "next_speaker",
] as const;
export type TalkField = (typeof TALK_FIELDS)[number];

export type TalkInfo = { kind?: TalkKind | null } & Partial<Record<TalkField, string | null>>;

export const FIELDS_BY_KIND: Record<TalkKind, TalkField[]> = {
  public_talk: ["talk_title", "song"],
  service_initial: ["talk_title", "song", "prayer"],
  service_final: ["talk_title", "song", "next_congregation"],
  event_talk: ["talk_title", "song", "next_theme", "next_speaker"],
  pioneer_meeting: ["talk_title", "opening_prayer", "closing_prayer"],
  elders_meeting: ["talk_title", "opening_prayer", "closing_prayer"],
};

export const DEFAULT_LABELS: Record<TalkKind | TalkField, string> = {
  public_talk: "Discurso Público",
  service_initial: "Discurso de Serviço – Inicial",
  pioneer_meeting: "Reunião – Pioneiros",
  elders_meeting: "Reunião – Anciãos",
  service_final: "Discurso de Serviço – Final",
  event_talk: "Discurso — Eventos",
  talk_title: "Título",
  song: "Cântico",
  prayer: "Oração",
  opening_prayer: "Oração inicial",
  closing_prayer: "Oração final",
  next_congregation: "Próxima congregação",
  next_theme: "Tema do próximo discurso",
  next_speaker: "Próximo orador",
};

/** Rótulo do campo dependendo do tipo (Discurso Público usa "Cântico inicial"). */
export function fieldLabelKey(kind: TalkKind, f: TalkField): { key: string; fallback: string } {
  if (kind === "public_talk" && f === "song") return { key: "talkOutline.fields.opening_song", fallback: "Cântico inicial" };
  return { key: `talkOutline.fields.${f}`, fallback: DEFAULT_LABELS[f] };
}

export function isTalkKind(v: unknown): v is TalkKind {
  return typeof v === "string" && (TALK_KINDS as readonly string[]).includes(v);
}

export function sanitizeTalk(v: unknown): TalkInfo | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const out: TalkInfo = { kind: isTalkKind(o.kind) ? o.kind : null };
  for (const f of TALK_FIELDS) if (typeof o[f] === "string") out[f] = (o[f] as string).slice(0, 2000);
  return out;
}

/** Valores de origem vindos da aba "Reuniões e Discursos". */
export interface TalkSyncSource {
  weekend_opening_song?: string | null;
  weekend_closing_song?: string | null;
  midweek_final_song?: string | null;
  midweek_closing_prayer?: string | null;
  pioneer_opening_prayer?: string | null;
  pioneer_closing_prayer?: string | null;
  elders_opening_prayer?: string | null;
  elders_closing_prayer?: string | null;
}

const SYNC_MAP: Record<TalkKind, Partial<Record<TalkField, keyof TalkSyncSource>>> = {
  public_talk: { song: "weekend_opening_song" },
  service_final: { song: "weekend_closing_song" },
  service_initial: { song: "midweek_final_song", prayer: "midweek_closing_prayer" },
  pioneer_meeting: { opening_prayer: "pioneer_opening_prayer", closing_prayer: "pioneer_closing_prayer" },
  elders_meeting: { opening_prayer: "elders_opening_prayer", closing_prayer: "elders_closing_prayer" },
  event_talk: {},
};

export function canSyncKind(kind: TalkKind | null | undefined): boolean {
  return !!kind && Object.keys(SYNC_MAP[kind]).length > 0;
}

/** Só devolve campos que têm valor na origem. */
export function talkSyncPatch(kind: TalkKind, src: TalkSyncSource): Partial<Record<TalkField, string>> {
  const out: Partial<Record<TalkField, string>> = {};
  for (const [f, s] of Object.entries(SYNC_MAP[kind]) as [TalkField, keyof TalkSyncSource][]) {
    const v = src[s];
    if (typeof v === "string" && v.trim()) out[f] = v.trim();
  }
  return out;
}

type Tr = (key: string, fallback: string) => string;

/** Linhas do balão Detalhes: tipo + campos preenchidos do tipo. */
export function talkOutlineInfoRows(talk: TalkInfo | null | undefined, t: Tr): [string, string][] {
  if (!talk?.kind) return [];
  const kind = talk.kind;
  const rows: [string, string][] = [[t("talkOutline.kindLabel", "Tipo"), t(`talkOutline.kinds.${kind}`, DEFAULT_LABELS[kind])]];
  for (const f of FIELDS_BY_KIND[kind]) {
    const v = talk[f];
    if (typeof v === "string" && v.trim()) {
      const l = fieldLabelKey(kind, f);
      rows.push([t(l.key, l.fallback), v.trim()]);
    }
  }
  return rows;
}
