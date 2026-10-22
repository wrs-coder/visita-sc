export interface FieldNoteInfoSource {
  event_date?: string | null;
  period?: string | null;
  title?: string | null;
  prayer?: string | null;
  territory?: string | null;
  assistants?: string | null;
}

type Tr = (key: string, fallback: string) => string;

const clean = (v?: string | null) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Linhas "título → valor" da Consideração de Campo; campos vazios ficam de fora. */
export function fieldNoteInfoRows(n: FieldNoteInfoSource, t: Tr): [string, string][] {
  const day = clean(n.event_date);
  const per = clean(n.period);
  const rows: [string, string | null][] = [
    [t("fieldConsiderations.fields.date", "Data"), day && t(`fieldConsiderations.fields.weekdays.${day}`, day)],
    [t("fieldConsiderations.fields.period", "Período"), per && t(`fieldConsiderations.fields.${per}`, per)],
    [t("fieldConsiderations.fields.title", "Título"), clean(n.title)],
    [t("fieldConsiderations.fields.prayer", "Oração"), clean(n.prayer)],
    [t("fieldConsiderations.fields.territory", "Território"), clean(n.territory)],
    [t("fieldConsiderations.fields.assistants", "Ajudantes"), clean(n.assistants)],
  ];
  return rows.filter((r): r is [string, string] => !!r[1]);
}
