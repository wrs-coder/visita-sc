/** Dia de um slot de pastoreio ("Ter 09:00" → "Ter"). Vazio quando sem slot. */
export function slotDay(label: string | null | undefined): string {
  if (!label) return "";
  const m = label.trim().match(/^[^\s\-–—·,|:0-9]+/);
  return m ? m[0] : "";
}

/** Dias distintos na ordem em que aparecem nos slots. */
export function slotDays(labels: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const l of labels) { const d = slotDay(l); if (d && !out.includes(d)) out.push(d); }
  return out;
}
