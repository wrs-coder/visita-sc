/**
 * Bloco de tópico recolhível nos modos de leitura (esboço, imersivo, tela cheia).
 * Setinha no título e no final do tópico; recolhido mostra só o título.
 */
import type React from "react";
import { ChevronDown, ChevronUp, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { setTopicsCollapsed, toggleTopic, useCollapsedTopics } from "@/lib/outline-topics";
import { TopicDeviationPill, TopicTimeBadge, useTopicDone } from "@/components/notes/TopicTiming";

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
  const label = collapsed
    ? t("personalOutlines.topics.expand", { defaultValue: "Expandir tópico" })
    : t("personalOutlines.topics.collapse", { defaultValue: "Recolher tópico" });

  return (
    <section data-topic-id={id} className={cn("my-2 rounded-md border border-border bg-muted/30 transition-opacity", done && "opacity-60")}>
      {/* Linha de altura zero: só a pílula de tempo acompanha a rolagem dentro do tópico. */}
      <div className="pointer-events-none sticky top-2 z-10 flex h-0 justify-end pr-11">
        <div className="pointer-events-auto translate-y-2">
          <TopicTimeBadge topicId={id} floating />
        </div>
      </div>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="flex-1 min-w-0 pr-20 font-semibold text-foreground">{title}</div>
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
