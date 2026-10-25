import { addDays, format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

/**
 * Busca na "Reunião de Campo" da visita os dados de uma Consideração de Campo
 * (mesma consulta da tela de Esboços). Retorna null quando não há dados.
 */
export async function fetchFieldNoteSync(opts: {
  visit: { id: string; start_date: string; end_date: string };
  weekday: string;
  periodLabel: string;
}): Promise<{ territory: string; assistants: string; prayer: string } | null> {
  const map: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  };
  const dow = map[opts.weekday];
  if (dow === undefined) return null;
  let dateKey: string | null = null;
  for (let d = parseISO(opts.visit.start_date); format(d, "yyyy-MM-dd") <= opts.visit.end_date; d = addDays(d, 1)) {
    if (d.getDay() === dow) { dateKey = format(d, "yyyy-MM-dd"); break; }
  }
  if (!dateKey) return null;
  const { data, error } = await supabase
    .from("field_meetings")
    .select("territory_number,territory_location,auxiliary_leaders,closing_prayer")
    .eq("visit_id", opts.visit.id)
    .eq("event_date", dateKey)
    .eq("period", opts.periodLabel)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const parts: string[] = [];
  if (data.territory_number && String(data.territory_number).trim()) parts.push(`S-13 nº ${String(data.territory_number).trim()}`);
  if (data.territory_location && String(data.territory_location).trim()) parts.push(String(data.territory_location).trim());
  return {
    territory: parts.join(" — "),
    assistants: data.auxiliary_leaders ?? "",
    prayer: data.closing_prayer ?? "",
  };
}
