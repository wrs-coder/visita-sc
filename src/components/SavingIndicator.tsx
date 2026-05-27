import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Indicador visual de salvamento.
 * - `saving=true` → Loader2 girando + "Salvando..."
 * - Transição saving→false → mostra "Salvo" por 2s.
 */
export function SavingIndicator({
  saving,
  className,
}: {
  saving: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (saving) {
      setJustSaved(false);
      return;
    }
    // ao terminar, mostra "Salvo" por 2s
    let timer: ReturnType<typeof setTimeout> | null = null;
    setJustSaved((prev) => prev); // no-op
    // Só dispara o "salvo" se já tinha estado saving antes (montagem fresca não dispara)
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [saving]);

  // Detecta transição true→false para mostrar "Salvo".
  const [wasSaving, setWasSaving] = useState(false);
  useEffect(() => {
    if (saving) {
      setWasSaving(true);
      setJustSaved(false);
      return;
    }
    if (wasSaving) {
      setJustSaved(true);
      setWasSaving(false);
      const t = setTimeout(() => setJustSaved(false), 2000);
      return () => clearTimeout(t);
    }
  }, [saving, wasSaving]);

  if (!saving && !justSaved) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        saving ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-400",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {saving ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{t("common.saving")}</span>
        </>
      ) : (
        <>
          <Check className="h-3.5 w-3.5" />
          <span>{t("common.saved")}</span>
        </>
      )}
    </div>
  );
}
