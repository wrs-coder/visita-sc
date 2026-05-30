import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getVisitTemplateExtras, type VisitTemplateExtras } from "@/lib/visit-template-extras.functions";

const EMPTY: VisitTemplateExtras = {
  field: null, midweek: null, weekend: null, pioneer: null, elders: null, program: null,
};

/**
 * Lê uma única vez por visita os "extras" vindos do modelo vinculado
 * (observações + cânticos do fim de semana + observações gerais de refeições).
 * Não bloqueia o render; devolve EMPTY até estar disponível.
 */
export function useVisitTemplateExtras(visitId: string | null | undefined): VisitTemplateExtras {
  const fn = useServerFn(getVisitTemplateExtras);
  const [extras, setExtras] = useState<VisitTemplateExtras>(EMPTY);
  useEffect(() => {
    if (!visitId) { setExtras(EMPTY); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fn({ data: { visitId } });
        if (!cancelled && res?.ok) setExtras(res.extras);
      } catch { /* silencioso: bloco apenas decorativo */ }
    })();
    return () => { cancelled = true; };
  }, [visitId, fn]);
  return extras;
}
