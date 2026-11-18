// Dados da semana da visita para a data da reunião: discurso de serviço de terça,
// cântico final de terça (Programa da visita) e nome do superintendente.
// Lê pelos clientes de sempre (cópia do aparelho primeiro); sem visita = null.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVisitTemplateExtras } from "@/hooks/use-visit-template-extras";
import type { VisitWeekInfo } from "@/lib/meeting/visit-week-meeting";

export function useVisitWeekInfo(userId: string, date: string | null): VisitWeekInfo | null {
  const [visit, setVisit] = useState<{ id: string; talk: string | null; sc: string | null } | null>(null);
  useEffect(() => {
    if (!date) { setVisit(null); return; }
    let off = false;
    (async () => {
      try {
        const { data: v } = await supabase.from("visits").select("id").lte("start_date", date).gte("end_date", date).limit(1).maybeSingle();
        if (!v?.id) { if (!off) setVisit(null); return; }
        const [mw, pr] = await Promise.all([
          supabase.from("midweek_meetings").select("service_talk_theme").eq("visit_id", v.id).maybeSingle(),
          supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
        ]);
        if (!off) setVisit({ id: v.id, talk: mw.data?.service_talk_theme ?? null, sc: (pr.data as { full_name?: string | null } | null)?.full_name ?? null });
      } catch { if (!off) setVisit(null); }
    })();
    return () => { off = true; };
  }, [userId, date]);
  const extras = useVisitTemplateExtras(visit?.id ?? null);
  if (!visit) return null;
  return { serviceTalk: visit.talk, finalSong: extras.midweek?.final_song ?? null, scName: visit.sc };
}
