// Cartão da aba "Anciãos" do Dashboard: resumo da pauta (recolhe/expande) com os links funcionando.
import { Link } from "@tanstack/react-router";
import { ChevronRight, ClipboardList, Loader2, WifiOff } from "lucide-react";
import { CollapsibleCard } from "@/components/dashboard/CollapsibleCard";
import { agendaView, itemUrls, shownParts, numberedBlocks } from "@/lib/elder-agenda/agenda";
import { AgendaLinkRow, formatMeetingWhen } from "./ElderAgendaView";
import { useElderAgenda } from "./use-elder-agenda";

export default function ElderAgendaDashboardCard({ visitId }: { visitId: string }) {
  const { data, loading, error } = useElderAgenda(visitId);
  const view = data ? agendaView(data.payload, data.auto) : null;
  const list = data ? numberedBlocks(data.payload.blocks, data.auto) : [];
  return (
    <CollapsibleCard
      id="elder-agenda"
      accent="elder"
      icon={<ClipboardList className="h-4 w-4 text-primary" />}
      title="Pauta – reunião com os anciãos"
      headerRight={
        <Link to="/pauta-ancioes" className="text-primary text-xs font-medium inline-flex items-center hover:underline shrink-0">
          Abrir <ChevronRight className="h-3 w-3" />
        </Link>
      }
    >
      {loading && !data ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : !data || !view ? (
        <p className="text-sm text-muted-foreground">{error ?? "Pauta indisponível."}</p>
      ) : (
        <div className="space-y-2 text-sm min-w-0">
          {data.offline ? <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><WifiOff className="h-3.5 w-3.5" />Cópia guardada no aparelho</p> : null}
          {data.auto.meetingAt ? <p className="text-muted-foreground break-words">{[formatMeetingWhen(data.auto.meetingAt), data.auto.location].filter(Boolean).join(" · ")}</p> : null}
          <ul className="space-y-1.5">
            {list.map(({ block: b, n }) => {
              const cards = b.cards.filter((c) => c.type !== "private");
              const links = cards.flatMap((c) => (c.type === "links" ? c.items.filter((it) => shownParts(it).length) : []));
              const extra = cards.some((c) => c.type === "recs") ? data.auto.recommendations.length : cards.some((c) => c.type === "local") ? data.auto.local.length : 0;
              const subject = cards.find((c) => c.showSubject && c.subject)?.subject;
              return (
                <li key={b.id} className="space-y-1">
                  <div className="flex justify-between gap-2">
                    <span className="break-words"><span className="font-semibold text-primary">{n}.</span> {b.title}{extra ? ` (${extra})` : ""}</span>
                    {b.minutes ? <span className="text-muted-foreground shrink-0">{b.minutes} min</span> : null}
                  </div>
                  {subject ? <p className="pl-4 text-muted-foreground break-words">{subject}</p> : null}
                  {links.length ? <div className="ml-4 divide-y rounded-xl border px-3">{links.map((it) => <AgendaLinkRow key={it.id} item={it} />)}</div> : null}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground text-right">Tempo total: {view.totalMinutes} min</p>
        </div>
      )}
    </CollapsibleCard>
  );
}
