import { useTranslation } from "react-i18next";

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
