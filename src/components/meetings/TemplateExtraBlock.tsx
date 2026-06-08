import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Undo2 } from "lucide-react";
import { setVisitTemplateOverride } from "@/lib/visit-template-extras.functions";

/**
 * Bloco read-only para exibir informações vindas do modelo (observações/cânticos).
 * Vermelho por padrão; azul opcional para o campo "observações do campo".
 */
export function TemplateExtraBlock({
  label,
  value,
  variant = "red",
}: {
  label: string;
  value: string | null | undefined;
  variant?: "red" | "blue";
}) {
  if (!value || !value.trim()) return null;
  const tone =
    variant === "blue"
      ? "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/5"
      : "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/5";
  return (
    <div className={`rounded-md border px-3 py-2 ${tone}`}>
      <div className="text-[11px] uppercase tracking-wide font-medium opacity-80">{label}</div>
      <div className="text-sm whitespace-pre-wrap mt-0.5">{value}</div>
    </div>
  );
}

export function TemplateExtraFromTemplateHint() {
  const { t } = useTranslation();
  return (
    <p className="text-[11px] text-muted-foreground italic mt-0.5">
      {t("meetingsTalks.fromTemplate.hint")}
    </p>
  );
}

type EditableProps = {
  label: string;
  /** Valor atualmente em vigor (override OU modelo) */
  value: string | null | undefined;
  /** Valor original do modelo (placeholder + alvo de "restaurar") */
  templateValue: string | null | undefined;
  visitId: string | null | undefined;
  field:
    | "field_observations"
    | "midweek_observations"
    | "midweek_final_song"
    | "weekend_opening_song"
    | "weekend_closing_song"
    | "weekend_observations"
    | "pioneer_observations"
    | "elders_observations"
    | "program_general_observations";
  /** Habilita modo edição (super + edição ativa). Quando false, comporta-se como TemplateExtraBlock. */
  editable: boolean;
  variant?: "red" | "blue";
  type?: "text" | "textarea";
  onSaved?: () => void;
};

/**
 * Versão editável dos blocos "from template". Quando `editable` é true,
 * renderiza um input/textarea pré-preenchido com o valor em vigor; salva
 * no blur via `setVisitTemplateOverride`. Mostra "Restaurar do modelo"
 * quando o valor difere do modelo.
 */
export function TemplateExtraEditable({
  label,
  value,
  templateValue,
  visitId,
  field,
  editable,
  variant = "red",
  type = "text",
  onSaved,
}: EditableProps) {
  const { t } = useTranslation();
  const save = useServerFn(setVisitTemplateOverride);
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => { setLocal(value ?? ""); }, [value]);

  if (!editable) return <TemplateExtraBlock label={label} value={value ?? null} variant={variant} />;

  const tone =
    variant === "blue"
      ? "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/5"
      : "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/5";

  const commit = async (next: string | null) => {
    if (!visitId) return;
    await save({ data: { visitId, patch: { [field]: next } as Record<string, string | null> } });
    onSaved?.();
  };

  const hasOverride = (templateValue ?? "") !== (value ?? "");

  return (
    <div className={`rounded-md border px-3 py-2 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-wide font-medium opacity-80">{label}</div>
        {hasOverride && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            onClick={async () => { setLocal(templateValue ?? ""); await commit(null); }}
          >
            <Undo2 className="h-3 w-3 mr-1" />
            {t("meetingsTalks.fromTemplate.restoreFromTemplate")}
          </Button>
        )}
      </div>
      {type === "textarea" ? (
        <Textarea
          rows={2}
          value={local}
          placeholder={templateValue ?? ""}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => { if (local !== (value ?? "")) commit(local.trim() === "" ? null : local); }}
          className="mt-1 bg-background/60"
        />
      ) : (
        <Input
          value={local}
          placeholder={templateValue ?? ""}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => { if (local !== (value ?? "")) commit(local.trim() === "" ? null : local); }}
          className="h-9 mt-1 bg-background/60"
        />
      )}
      {hasOverride && (
        <div className="text-[10px] mt-1 opacity-70">{t("meetingsTalks.fromTemplate.overrideHint")}</div>
      )}
    </div>
  );
}
