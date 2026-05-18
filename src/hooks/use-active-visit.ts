import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const congId = congregation?.id ?? null;

  const queryKey = ["visits", "active", congId] as const;

  const { data: visit, isLoading } = useQuery<Visit | null>({
    queryKey,
    enabled: !!congId,
    queryFn: async () => {
      const { data } = await supabase
        .from("visits").select("*").eq("congregation_id", congId!)
        .order("is_active", { ascending: false })
        .order("start_date", { ascending: false })
        .limit(1).maybeSingle();
      return (data as Visit | null) ?? null;
    },
  });

  useEffect(() => {
    if (!congId) return;
    const ch = supabase.channel(`visits-${congId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "visits", filter: `congregation_id=eq.${congId}` },
        () => { queryClient.invalidateQueries({ queryKey: ["visits", "active", congId] }); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [congId, queryClient]);

  return { visit: visit ?? null, loading: !!congId && isLoading };
}
