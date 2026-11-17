// Estrela "Para comentar": mesmo botão nas listas, na criação e na edição.
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function StarToggle({ on, onToggle, className }: { on: boolean; onToggle: () => void; className?: string }) {
  const { t } = useTranslation();
  const label = t("guestWs.star", { defaultValue: "Para comentar" });
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={on}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-accent/60", className)}>
      <Star className={cn("h-4 w-4", on ? "fill-primary text-primary" : "text-muted-foreground")} />
    </button>
  );
}
