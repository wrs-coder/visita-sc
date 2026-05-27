import * as React from "react";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface CharCounterTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> {
  value: string;
  onValueChange: (v: string) => void;
  max?: number;
  /** Optional accessible id base for the counter element. */
  counterId?: string;
}

/**
 * Textarea com contador "n / max" e limite duro (corta excedente).
 * - Mostra contagem em muted; vira destructive quando >= max ou perto do limite.
 * - aria-live para feedback ao chegar/exceder.
 */
export function CharCounterTextarea({
  value,
  onValueChange,
  max = 4000,
  className,
  counterId,
  ...rest
}: CharCounterTextareaProps) {
  const { t } = useTranslation();
  const len = value?.length ?? 0;
  const over = len > max;
  const near = !over && len >= Math.floor(max * 0.9);
  const remaining = max - len;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    onValueChange(v.length > max ? v.slice(0, max) : v);
  };

  const message = over
    ? t("common.charsOver", { defaultValue: "Limite excedido", n: len - max })
    : t("common.charsRemaining", { defaultValue: "{{n}} restantes", n: remaining });

  return (
    <div className="grid gap-1">
      <Textarea
        {...rest}
        value={value}
        onChange={handleChange}
        maxLength={max}
        className={cn(className, over && "border-destructive focus-visible:ring-destructive")}
        aria-describedby={counterId}
      />
      <div
        id={counterId}
        aria-live="polite"
        className={cn(
          "text-[11px] text-right tabular-nums",
          over ? "text-destructive font-medium" : near ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
        )}
      >
        {len} / {max}
        {(near || over) && <span className="ml-2">· {message}</span>}
      </div>
    </div>
  );
}
