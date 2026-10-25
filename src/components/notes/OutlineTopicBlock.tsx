/**
 * Bloco de tópico recolhível nos modos de leitura (esboço, imersivo, tela cheia).
 * Setinha no título e no final do tópico; recolhido mostra só o título.
 */
import type React from "react";
import { ChevronDown, ChevronUp, ChevronsDownUp, ChevronsUpDown, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { setTopicsCollapsed, toggleTopic, useCollapsedTopics } from "@/lib/outline-topics";
import { TopicDeviationPill, TopicTimeBadge, useHasTimedTopics, useTopicDone, useTopicHasTime } from "@/components/notes/TopicTiming";
import { resetBadgePrefs, setBadgePrefs, useBadgePrefs, type BadgePosition, type BadgeSize } from "@/lib/topic-badge-prefs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export function OutlineTopicBlock({
  id,
  title,
  children,
}: {
  id: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const collapsedMap = useCollapsedTopics();
  const collapsed = !!collapsedMap[id];
  const done = useTopicDone(id);
  const hasTime = useTopicHasTime(id);
  const badgePrefs = useBadgePrefs();
  const label = collapsed
    ? t("personalOutlines.topics.expand", { defaultValue: "Expandir tópico" })
    : t("personalOutlines.topics.collapse", { defaultValue: "Recolher tópico" });

  const pos = badgePrefs.position;
  return (
    <section data-topic-id={id} className={cn("my-2 rounded-md border border-border bg-muted/30 transition-opacity", done && "opacity-60")}>
      {/* Linha de altura zero: só a pílula de tempo acompanha a rolagem dentro do tópico. */}
      <div
        className={cn(
          "pointer-events-none sticky top-2 z-10 flex h-0",
          pos === "left" ? "justify-start pl-2" : pos === "center" ? "justify-center" : "justify-end pr-11",
        )}
      >
        <div className="pointer-events-auto translate-y-2">
          <TopicTimeBadge topicId={id} floating />
        </div>
      </div>
      <div className={cn("flex items-center gap-2 px-2 py-1.5", hasTime && pos === "center" && "pt-8")}>
        <div
          className={cn(
            "flex-1 min-w-0 font-semibold text-foreground",
            hasTime && pos === "right" && (badgePrefs.size === "lg" ? "pr-28" : "pr-20"),
            hasTime && pos === "left" && (badgePrefs.size === "lg" ? "pl-28" : "pl-20"),
          )}
        >
          {title}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleTopic(id);
          }}
          aria-expanded={!collapsed}
          aria-label={label}
          title={label}
          className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {collapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
        </button>
      </div>
      {!collapsed && (
        <>
          <div className="px-2 pb-1">{children}</div>
          <div className="flex justify-end px-2 pb-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleTopic(id);
              }}
              aria-label={label}
              title={label}
              className="h-8 w-8 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export function OutlineTopicsToolbar({ ids }: { ids: string[] }) {
  const { t } = useTranslation();
  const map = useCollapsedTopics();
  if (ids.length === 0) return null;
  const allCollapsed = ids.every((id) => map[id]);
  const label = allCollapsed
    ? t("personalOutlines.topics.expandAll", { defaultValue: "Expandir todos" })
    : t("personalOutlines.topics.collapseAll", { defaultValue: "Recolher todos" });
  return (
    <div className="flex items-center justify-end gap-2 mb-1">
      <TopicDeviationPill />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setTopicsCollapsed(ids, !allCollapsed);
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground",
          "hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary",
        )}
      >
        {allCollapsed ? <ChevronsUpDown className="h-3.5 w-3.5" /> : <ChevronsDownUp className="h-3.5 w-3.5" />}
        {label}
      </button>
    </div>
  );
}

/** Ajustes da pílula de tempo (tamanho, opacidade, posição) — só neste aparelho. */
function TopicBadgeSettings() {
  const { t } = useTranslation();
  const prefs = useBadgePrefs();
  const title = t("personalOutlines.topicTime.settings", { defaultValue: "Ajustes da pílula de tempo" });
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label={title}
          title={title}
          className="h-7 w-7 inline-flex items-center justify-center rounded-full border text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold">{title}</p>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">{t("personalOutlines.topicTime.size", { defaultValue: "Tamanho" })}</p>
          <ToggleGroup type="single" size="sm" variant="outline" value={prefs.size} onValueChange={(v) => v && setBadgePrefs({ size: v as BadgeSize })} className="justify-start">
            <ToggleGroupItem value="sm">{t("personalOutlines.topicTime.small", { defaultValue: "P" })}</ToggleGroupItem>
            <ToggleGroupItem value="md">{t("personalOutlines.topicTime.medium", { defaultValue: "M" })}</ToggleGroupItem>
            <ToggleGroupItem value="lg">{t("personalOutlines.topicTime.large", { defaultValue: "G" })}</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            {t("personalOutlines.topicTime.opacity", { defaultValue: "Opacidade" })}: {prefs.opacity}%
          </p>
          <Slider min={30} max={100} step={5} value={[prefs.opacity]} onValueChange={([v]) => setBadgePrefs({ opacity: v })} />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">{t("personalOutlines.topicTime.position", { defaultValue: "Posição" })}</p>
          <ToggleGroup type="single" size="sm" variant="outline" value={prefs.position} onValueChange={(v) => v && setBadgePrefs({ position: v as BadgePosition })} className="justify-start">
            <ToggleGroupItem value="left">{t("personalOutlines.topicTime.left", { defaultValue: "Esquerda" })}</ToggleGroupItem>
            <ToggleGroupItem value="center">{t("personalOutlines.topicTime.center", { defaultValue: "Centro" })}</ToggleGroupItem>
            <ToggleGroupItem value="right">{t("personalOutlines.topicTime.right", { defaultValue: "Direita" })}</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <Button type="button" variant="ghost" size="sm" className="w-full" onClick={resetBadgePrefs}>
          {t("personalOutlines.topicTime.reset", { defaultValue: "Restaurar padrão" })}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
