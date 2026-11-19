// "Informações adicionais dos anciãos": cada ancião preenche o seu cartão (nome opcional, checklist,
// perguntas e texto). Fora da tela cheia só um balão com o total; as respostas abrem em carrossel.
import { useRef, useState } from "react";
import { CheckSquare, ChevronLeft, ChevronRight, MessageCircle, Pencil, Plus, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BibleRefText } from "@/components/bible/BibleRefText";
import { htmlToPlain, newId, responseName, type AgendaCard, type AgendaElderResponse } from "@/lib/elder-agenda/agenda";

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const toHtml = (t: string) => t.split(/\n/).map((l) => `<p>${esc(l)}</p>`).join("");
const fmt = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }); };

interface Props {
  card: AgendaCard; isSc: boolean; canWrite: boolean; myHash: string;
  onCommit: (responses: AgendaElderResponse[]) => Promise<boolean>;
  /** Tela cheia: carrossel direto no cartão. */ inline?: boolean;
}

export function ElderInfoResponses({ card, isSc, canWrite, myHash, onCommit, inline }: Props) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<AgendaElderResponse | null>(null);
  const list = card.responses;
  const mine = myHash ? list.find((r) => r.authorKey === myHash) : undefined;
  const canChange = (r: AgendaElderResponse) => canWrite && (isSc || (!!myHash && r.authorKey === myHash));

  const startNew = () => setEdit(mine ?? { id: newId(), authorKey: myHash, name: "", checks: {}, answers: {}, html: "", updatedAt: "" });
  const remove = async (r: AgendaElderResponse) => {
    if (!confirm("Apagar esta resposta?")) return;
    if (await onCommit(list.filter((x) => x.id !== r.id))) toast.success("Resposta apagada.");
  };

  const carousel = <ResponsesCarousel card={card} canChange={canChange} onEdit={(r) => { setOpen(false); setEdit(r); }} onRemove={(r) => void remove(r)} />;

  return (
    <div className="space-y-2">
      {inline ? (list.length ? carousel : <p className="text-sm text-muted-foreground">Nenhuma resposta ainda.</p>) : (
        <button type="button" onClick={() => setOpen(true)} disabled={!list.length}
          className="flex w-full items-center gap-2 rounded-xl border bg-background px-3 py-2.5 text-left text-sm disabled:opacity-60">
          <MessageCircle className="h-4 w-4 text-primary" />
          <span className="flex-1 font-medium">{list.length === 0 ? "Nenhuma resposta ainda" : list.length === 1 ? "1 resposta" : `${list.length} respostas`}</span>
          {list.length ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : null}
        </button>
      )}
      {canWrite && !inline ? (
        <Button type="button" variant="outline" className="w-full border-dashed" onClick={startNew}>
          {mine ? <><Pencil className="h-4 w-4" />Editar minhas informações</> : <><Plus className="h-4 w-4" />Inserir informações sobre o assunto</>}
        </Button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Respostas dos anciãos</DialogTitle></DialogHeader>
          {carousel}
        </DialogContent>
      </Dialog>

      <Sheet open={!!edit} onOpenChange={(v) => { if (!v) setEdit(null); }}>
        <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl pb-safe">
          {edit ? <ResponseForm card={card} value={edit} onCancel={() => setEdit(null)} onSave={async (r) => {
            const next = list.some((x) => x.id === r.id) ? list.map((x) => (x.id === r.id ? r : x)) : [...list, r];
            if (await onCommit(next)) { setEdit(null); toast.success("Informações enviadas."); }
          }} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ResponseForm({ card, value, onSave, onCancel }: { card: AgendaCard; value: AgendaElderResponse; onSave: (r: AgendaElderResponse) => Promise<void>; onCancel: () => void }) {
  const [r, setR] = useState(value);
  const [text, setText] = useState(htmlToPlain(value.html));
  const [busy, setBusy] = useState(false);
  const checklist = card.checklist.filter((q) => q.text.trim());
  const questions = card.questions.filter((q) => q.text.trim());
  const submit = async () => {
    setBusy(true);
    try { await onSave({ ...r, html: text.trim() ? toHtml(text.trim()) : "", updatedAt: new Date().toISOString() }); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <SheetHeader><SheetTitle>Minhas informações</SheetTitle></SheetHeader>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Nome (opcional)</Label>
        <Input value={r.name} maxLength={80} onChange={(e) => setR({ ...r, name: e.target.value })} placeholder="Ex.: João Silva" />
      </div>
      {checklist.length ? (
        <div className="space-y-1 rounded-xl border divide-y">
          {checklist.map((q) => {
            const on = !!r.checks[q.id];
            return (
              <button key={q.id} type="button" role="checkbox" aria-checked={on} onClick={() => setR({ ...r, checks: { ...r.checks, [q.id]: !on } })}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm">
                {on ? <CheckSquare className="h-5 w-5 text-primary shrink-0" /> : <Square className="h-5 w-5 text-muted-foreground shrink-0" />}
                <span className="break-words">{q.text}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      {questions.map((q, i) => (
        <div key={q.id} className="space-y-1">
          <Label className="text-sm">{i + 1}. {q.text}</Label>
          <Textarea value={r.answers[q.id] ?? ""} maxLength={5000} rows={3} onChange={(e) => setR({ ...r, answers: { ...r.answers, [q.id]: e.target.value } })} />
        </div>
      ))}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Informações</Label>
        <Textarea value={text} rows={5} maxLength={20000} onChange={(e) => setText(e.target.value)} placeholder="Escreva aqui" />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button type="button" className="flex-1" disabled={busy} onClick={() => void submit()}>Salvar</Button>
      </div>
    </div>
  );
}

export function ResponsesCarousel({ card, canChange, onEdit, onRemove }: {
  card: AgendaCard; canChange?: (r: AgendaElderResponse) => boolean; onEdit?: (r: AgendaElderResponse) => void; onRemove?: (r: AgendaElderResponse) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const list = card.responses;
  const go = (i: number) => { const el = ref.current; if (!el) return; const j = Math.max(0, Math.min(list.length - 1, i)); el.scrollTo({ left: j * el.clientWidth, behavior: "smooth" }); };
  if (!list.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground text-center">{idx + 1} de {list.length}</p>
      <div ref={ref} onScroll={(e) => { const el = e.currentTarget; setIdx(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); }}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {list.map((r, i) => (
          <article key={r.id} className="w-full shrink-0 snap-center px-0.5">
            <div className="space-y-2 rounded-2xl border bg-background p-3 min-h-32">
              <div className="flex items-center gap-2">
                <p className="flex-1 min-w-0 text-sm font-semibold break-words">{responseName(r, i)}{r.updatedAt ? <span className="font-normal text-muted-foreground"> · {fmt(r.updatedAt)}</span> : null}</p>
                {canChange?.(r) ? <>
                  <button type="button" onClick={() => onEdit?.(r)} aria-label="Editar resposta" className="p-1.5 text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => onRemove?.(r)} aria-label="Apagar resposta" className="p-1.5 text-destructive"><Trash2 className="h-4 w-4" /></button>
                </> : null}
              </div>
              {card.checklist.filter((q) => q.text.trim()).map((q) => (
                <p key={q.id} className="flex items-start gap-2 text-sm">
                  {r.checks[q.id] ? <CheckSquare className="h-4 w-4 mt-0.5 text-primary shrink-0" /> : <Square className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />}
                  <span className="break-words">{q.text}</span>
                </p>
              ))}
              {card.questions.filter((q) => q.text.trim()).map((q, k) => (
                <div key={q.id} className="text-sm">
                  <p className="font-medium break-words">{k + 1}. {q.text}</p>
                  <p className="text-muted-foreground whitespace-pre-wrap break-words">{r.answers[q.id]?.trim() || "—"}</p>
                </div>
              ))}
              {htmlToPlain(r.html) ? <BibleRefText text={htmlToPlain(r.html)} className="text-sm whitespace-pre-wrap" /> : null}
            </div>
          </article>
        ))}
      </div>
      {list.length > 1 ? (
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Anterior" className="p-2 text-primary disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button>
          <div className="flex gap-1.5">{list.map((r, i) => <span key={r.id} className={`h-1.5 w-1.5 rounded-full ${i === idx ? "bg-primary" : "bg-muted-foreground/30"}`} />)}</div>
          <button type="button" onClick={() => go(idx + 1)} disabled={idx >= list.length - 1} aria-label="Próxima" className="p-2 text-primary disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
        </div>
      ) : null}
    </div>
  );
}

/** Editor do SC na montagem: checklist e perguntas (ambos opcionais). */
export function ElderInfoQuestionsEditor({ card, onChange }: { card: AgendaCard; onChange: (next: Pick<AgendaCard, "checklist" | "questions">) => void }) {
  const section = (key: "checklist" | "questions", title: string, add: string) => {
    const items = card[key];
    const set = (list: typeof items) => onChange({ checklist: card.checklist, questions: card.questions, [key]: list });
    return (
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title} (opcional)</p>
        {items.map((q, i) => (
          <div key={q.id} className="flex items-center gap-1.5">
            {key === "checklist" ? <Square className="h-4 w-4 text-muted-foreground shrink-0" /> : <span className="w-4 text-xs text-muted-foreground">{i + 1}.</span>}
            <Input value={q.text} maxLength={300} className="h-9" placeholder={key === "checklist" ? "Ex.: Visitou os inativos?" : "Ex.: Qual a maior necessidade?"}
              onChange={(e) => set(items.map((x) => (x.id === q.id ? { ...x, text: e.target.value } : x)))} />
            <button type="button" onClick={() => set(items.filter((x) => x.id !== q.id))} aria-label="Tirar" className="p-1.5 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {items.length < 20 ? <button type="button" onClick={() => set([...items, { id: newId(), text: "" }])} className="text-primary text-sm font-medium inline-flex items-center gap-1"><Plus className="h-4 w-4" />{add}</button> : null}
      </div>
    );
  };
  return (
    <div className="w-full space-y-3 rounded-xl bg-muted/40 p-2.5">
      {section("checklist", "Checklist", "Adicionar item")}
      {section("questions", "Perguntas com resposta", "Adicionar pergunta")}
    </div>
  );
}
