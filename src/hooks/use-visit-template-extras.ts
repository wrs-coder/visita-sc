import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getVisitTemplateExtras, type VisitTemplateExtras } from "@/lib/visit-template-extras.functions";

const EMPTY: VisitTemplateExtras = {
  field: null, midweek: null, weekend: null, pioneer: null, elders: null, program: null,
};

export type VisitTemplateExtrasState = VisitTemplateExtras & {
  templateExtras: VisitTemplateExtras;
  reload: () => void;
};

/**
 * Lê os "extras" da visita (modelo + override) com cache compartilhado pelo
 * React Query — alternar entre abas da Semana da Visita não re-busca.
 * Mantém a assinatura legada (`reload`, `templateExtras` + campos achatados).
 */
export function useVisitTemplateExtras(visitId: string | null | undefined): VisitTemplateExtrasState {
  const fn = useServerFn(getVisitTemplateExtras);
  const qc = useQueryClient();
  const key = ["visit-template-extras", visitId ?? "none"] as const;

  const { data } = useQuery({
    queryKey: key,
    enabled: !!visitId,
    queryFn: async () => {
      const res = await fn({ data: { visitId: visitId! } });
      if (!res?.ok) return { extras: EMPTY, templateExtras: EMPTY };
      const templateExtras =
        (res as { templateExtras?: VisitTemplateExtras }).templateExtras ?? res.extras;
      return { extras: res.extras, templateExtras };
    },
  });

  const extras = data?.extras ?? EMPTY;
  const templateExtras = data?.templateExtras ?? EMPTY;
  const reload = useCallback(() => {
    if (visitId) qc.invalidateQueries({ queryKey: key });
  }, [qc, visitId]);

  return { ...extras, templateExtras, reload };
}
