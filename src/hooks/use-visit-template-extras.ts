import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getVisitTemplateExtras, type VisitTemplateExtras } from "@/lib/visit-template-extras.functions";

const EMPTY: VisitTemplateExtras = {
  field: null, midweek: null, weekend: null, pioneer: null, elders: null, program: null,
};

export type VisitTemplateExtrasState = {
  extras: VisitTemplateExtras;
  templateExtras: VisitTemplateExtras;
  reload: () => void;
};

/**
 * Lê os "extras" da visita (modelo + override) e expõe também os valores
 * brutos do modelo para placeholders/restauração. Não bloqueia o render.
 */
export function useVisitTemplateExtras(visitId: string | null | undefined): VisitTemplateExtrasState {
  const fn = useServerFn(getVisitTemplateExtras);
  const [extras, setExtras] = useState<VisitTemplateExtras>(EMPTY);
  const [templateExtras, setTemplateExtras] = useState<VisitTemplateExtras>(EMPTY);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!visitId) { setExtras(EMPTY); setTemplateExtras(EMPTY); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fn({ data: { visitId } });
        if (cancelled || !res?.ok) return;
        setExtras(res.extras);
        setTemplateExtras((res as { templateExtras?: VisitTemplateExtras }).templateExtras ?? res.extras);
      } catch { /* silencioso */ }
    })();
    return () => { cancelled = true; };
  }, [visitId, fn, tick]);
  return { extras, templateExtras, reload: () => setTick((n) => n + 1) };
}
