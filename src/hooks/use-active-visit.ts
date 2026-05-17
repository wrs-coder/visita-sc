import { useEffect, useState } from "react";
import { useActiveCongregation } from "./use-active-congregation";
import { supabase } from "@/integrations/supabase/client";

export interface Visit {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  congregation_id: string;
}

export function useActiveVisit() {
  const congregation = useActiveCongregation();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!congregation) { setVisit(null); setLoading(false); return; }
    const load = async () => {
      const { data } = await supabase
        .from("visits").select("*").eq("congregation_id", congregation.id)
        .order("is_active", { ascending: false }).order("start_date", { ascending: false }).limit(1).maybeSingle();
      setVisit(data as Visit | null);
      setLoading(false);
    };
    load();
    const ch = supabase.channel(`visits-${congregation.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "visits", filter: `congregation_id=eq.${congregation.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [congregation]);

  return { visit, loading };
}
