import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveCongregation } from "./use-active-congregation";
import { useAuth } from "./use-auth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface Visit {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  congregation_id: string;
}

/**
 * Retorna uma visita utilizável para a congregação ativa.
 *
 * - Pega a visita mais recente da congregação selecionada (independente de
 *   estar marcada como ativa no itinerário).
 * - Se ainda não existe nenhuma visita e o utilizador é o Superintendente
 *   da congregação, cria silenciosamente uma "Programação geral" placeholder
 *   para que os painéis de Reuniões e Discursos abram imediatamente para
 *   edição, mesmo com os campos vazios.
 */
export function useActiveVisit() {
  const congregation = useActiveCongregation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const congId = congregation?.id ?? null;
  const isSuperOfCong =
    !!user && !!congregation && congregation.superintendent_id === user.id;

  const queryKey = ["visits", "ensured", congId] as const;

  const { data: visit, isLoading } = useQuery<Visit | null>({
    queryKey,
    enabled: !!congId,
    queryFn: async () => {
      const { data } = await supabase
        .from("visits")
        .select("*")
        .eq("congregation_id", congId!)
        .order("is_active", { ascending: false })
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) return data as Visit;

      // Sem visitas: cria placeholder se for o Superintendente.
      if (!isSuperOfCong) return null;
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: inserted } = await supabase
        .from("visits")
        .insert({
          congregation_id: congId!,
          title: "Programação geral",
          start_date: today,
          end_date: today,
          is_active: true,
        })
        .select("*")
        .maybeSingle();
      return (inserted as Visit | null) ?? null;
    },
  });

  useEffect(() => {
    if (!congId) return;
    const ch = supabase
      .channel(`visits-${congId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visits", filter: `congregation_id=eq.${congId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["visits", "ensured", congId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [congId, queryClient]);

  return { visit: visit ?? null, loading: !!congId && isLoading };
}
