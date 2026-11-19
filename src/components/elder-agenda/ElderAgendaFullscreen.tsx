// Pauta em tela cheia: leitura limpa (só o que foi preenchido), cronômetro igual ao dos esboços,
// navegação por tópico e links/anexos acessíveis. Nada é editado aqui.
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BibleRefText } from "@/components/bible/BibleRefText";
import { OutlineTimer } from "@/components/notes/OutlineTimer";
import { useFocusChromeWhile } from "@/lib/focus-chrome";
import {
  CARD_TYPE_LABEL, agendaView, htmlToPlain, itemUrls, numberedBlocks, prayerRecShown, recInfoView,
  type AgendaCard, type AgendaPayload,
} from "@/lib/elder-agenda/agenda";
import { AgendaAttachments } from "./AgendaAttachments";
import { AgendaLinkRow, formatMeetingWhen, type AgendaData } from "./ElderAgendaView";

export function ElderAgendaFullscreen({ data, payload, isSc, onClose }: { data: AgendaData; payload: AgendaPayload; isSc: boolean; onClose: () => void }) {
  useFocusChromeWhile(true);
  const list = numberedBlocks(payload.blocks, data.auto);
  const v = agendaView(payload, data.auto);
  const [idx, setIdx] = useState(0);
  const refs = useRef<Array<HTMLElement | null>>([]);
  const go = (i: number) => { const j = Math.max(0, Math.min(list.length - 1, i)); setIdx(j); refs.current[j]?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const visibleCard = (c: AgendaCard) => isSc || (c.type !== "private" && !c.hidden);
  const text = (html: string) => { const t = htmlToPlain(html); return t ? <BibleRefText text={t} className="text-base leading-relaxed whitespace-pre-wrap" /> : null; };

  const cardBody = (c: AgendaCard, n: number) => {
    const parts: React.ReactNode[] = [];
    if (c.showSubject && c.subject) parts.push(<p key="s" className="text-base font-semibold break-words">{c.subject}</p>);
    if (c.type === "recs") data.auto.recommendations.forEach((r, i) => {
      const ri = recInfoView(c, r);
      parts.push(
        <div key={r.id} className={`space-y-1 ${i > 0 ? "border-t border-border pt-4 mt-1" : ""}`}>
          <p className="font-semibold break-words">{n}.{i + 1} — {r.title}</p>
          {ri.family ? <p className="text-sm text-muted-foreground break-words">Família: {ri.family}</p> : null}
          {ri.fieldGroup ? <p className="text-sm text-muted-foreground break-words">Grupo: {ri.fieldGroup}</p> : null}
          {text(ri.info)}
          {isSc && payload.scRecs[r.id]?.decision ? <p className="text-xs font-semibold text-primary">Decisão: {payload.scRecs[r.id].decision === "assign" ? "Designar" : "Não designar"}</p> : null}
        </div>,
      );
    });
    if (c.type === "local") data.auto.local.forEach((l) => parts.push(
      <div key={l.id} className="space-y-0.5 text-sm"><p className="font-semibold break-words">{l.subject || "Assunto"}</p>{l.suggestedBy ? <p className="text-muted-foreground">Quem indicou: {l.suggestedBy}</p> : null}{l.sources ? <p className="whitespace-pre-wrap">{l.sources}</p> : null}</div>,
    ));
    if (c.type === "links") c.items.filter((it) => it.text || itemUrls(it).length).forEach((it) => parts.push(<AgendaLinkRow key={it.id} item={it} />));
    if (c.type !== "recs") { const t = text(c.html); if (t) parts.push(<div key="h">{t}</div>); }
    if (c.attachments.length) parts.push(<AgendaAttachments key="a" card={c} editable={false} api={data.attachmentApi} offline={!!data.offline} onChange={() => undefined} />);
    return parts;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-modal="true" aria-label="Pauta em tela cheia">
      <header className="flex items-center gap-2 border-b px-3 py-2 pt-safe">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar tela cheia"><X className="h-5 w-5" /></Button>
        <span className="flex-1 min-w-0 truncate font-semibold">{payload.headerTitle || "Pauta"}</span>
        <OutlineTimer outlineId={`agenda-${data.visitId}`} variant="fullscreen" />
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        <div className="text-center space-y-1">
          {payload.headerVerses ? <BibleRefText text={payload.headerVerses} className="text-xs text-primary" /> : null}
          <p className="text-sm text-muted-foreground">{[data.congregation, formatMeetingWhen(data.auto.meetingAt), data.auto.location].filter(Boolean).join(" · ")}</p>
          <p className="text-sm">
            Oração inicial: <b>{v.prayerOpen || "—"}</b>
            {prayerRecShown(payload, data.auto) ? <> · Recomendação: <b>{payload.prayerRec || "—"}</b></> : null}
            {" "}· Final: <b>{v.prayerClose || "—"}</b>{payload.showMinutes ? <> · Ata: <b>{payload.minutesTaker || "—"}</b></> : null}
          </p>
        </div>
        {list.map(({ block: b, n }, i) => {
          const cards = b.cards.filter(visibleCard);
          return (
            <section key={b.id} ref={(el) => { refs.current[i] = el; }} className={`scroll-mt-4 space-y-3 rounded-2xl p-4 ${i === idx ? "bg-primary/5 ring-1 ring-primary/30" : "bg-muted/30"}`} onClick={() => setIdx(i)}>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-primary">{n}.</span>
                <h3 className="flex-1 min-w-0 text-lg font-semibold break-words">{b.title}</h3>
                {b.minutes ? <span className="text-sm text-muted-foreground shrink-0">{b.minutes} min</span> : null}
              </div>
              {cards.map((c) => {
                const body = cardBody(c, n);
                if (!body.length) return null;
                return (
                  <div key={c.id} className="space-y-2">
                    {cards.length > 1 ? <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{CARD_TYPE_LABEL[c.type]}</p> : null}
                    {body}
                  </div>
                );
              })}
            </section>
          );
        })}
        <div className="h-20" />
      </div>
      <footer className="flex gap-2 border-t p-2 pb-safe">
        <Button variant="outline" className="flex-1" disabled={idx === 0} onClick={() => go(idx - 1)}><ChevronLeft className="h-4 w-4" />Anterior</Button>
        <Button className="flex-1" disabled={idx >= list.length - 1} onClick={() => go(idx + 1)}>Próximo<ChevronRight className="h-4 w-4" /></Button>
      </footer>
    </div>
  );
}
