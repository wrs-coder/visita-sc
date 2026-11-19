// Tela da "Pauta – Reunião com Anciãos", montada em blocos.
// SC: renomeia, reordena, oculta, apaga e adiciona blocos, escolhe quem edita cada um, define um prazo
// e usa/salva modelos. Anciãos (com ou sem cadastro) preenchem o que foi liberado até o prazo.
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown, ArrowUp, BookOpen, CalendarClock, ChevronDown, Eye, EyeOff, FileDown, Layers, Library, Link2, Loader2,
  Lock, Pencil, PlayCircle, Plus, Save, Trash2, Users, UserCog, WifiOff, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BibleRefText } from "@/components/bible/BibleRefText";
import { saveBlob } from "@/lib/share";
import {
  ACCESS_LABEL, BLOCK_TYPE_LABEL, MAX_BLOCKS, agendaView, canEditNow, isLocked, itemUrls, newBlock, newId, numberedBlocks, safeUrl,
  type AgendaAccess, type AgendaAuto, type AgendaBlock, type AgendaBlockType, type AgendaLinkItem, type AgendaLinkKind, type AgendaPayload, type AgendaRole,
} from "@/lib/elder-agenda/agenda";
import { AGENDA_PDF_STYLES, AGENDA_VERSES, type AgendaPdfStyle } from "@/lib/elder-agenda/agenda-pdf";
import { readPdfStyle, writePdfStyle } from "@/lib/elder-agenda/agenda-cache";
import { openAllLinks } from "./open-all-links";
import { AgendaTemplatesDialog } from "./AgendaTemplatesDialog";

const RichNoteEditor = lazy(() => import("@/components/notes/RichNoteEditor").then((m) => ({ default: m.RichNoteEditor })));

export interface AgendaData {
  visitId: string; congregation: string; range: string; role: AgendaRole;
  payload: AgendaPayload; auto: AgendaAuto; offline?: boolean;
}
export type AgendaSaver = (payload: AgendaPayload) => Promise<{ ok: boolean; error?: string }>;

const ACCESS_NEXT: Record<AgendaAccess, AgendaAccess> = { sc: "coordinator", coordinator: "all", all: "sc" };
const ACCESS_ICON: Record<AgendaAccess, typeof Lock> = { sc: Lock, coordinator: UserCog, all: Users };
export const LINK_KIND_UI: Record<AgendaLinkKind, { label: string; icon: typeof BookOpen }> = {
  book: { label: "Leitura", icon: BookOpen }, article: { label: "Artigo", icon: Library }, video: { label: "Vídeo", icon: PlayCircle },
};

export function formatMeetingWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const wd = d.toLocaleDateString("pt-BR", { weekday: "long" });
  const dm = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const hm = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${dm} · ${hm}`;
}
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export async function exportAgendaPdf(data: AgendaData, payload: AgendaPayload, style: AgendaPdfStyle) {
  const { renderAgendaPdf } = await import("@/lib/elder-agenda/agenda-pdf");
  const blob = await renderAgendaPdf({ payload, auto: data.auto, congregation: data.congregation, range: data.range, style });
  await saveBlob(blob, { filename: `pauta-reuniao-anciaos-${style}-${data.visitId.slice(0, 8)}.pdf`, mimeType: "application/pdf" });
}

/** Linha de links só para ler: ícone + texto + "Clique aqui" (abre todos os links da linha). */
export function AgendaLinkRow({ item }: { item: AgendaLinkItem }) {
  const { icon: Icon, label } = LINK_KIND_UI[item.kind];
  const urls = itemUrls(item);
  return (
    <div className="flex items-center gap-3 min-w-0 py-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0"><Icon className="h-4 w-4 text-primary" aria-label={label} /></span>
      <span className="flex-1 min-w-0 text-sm break-words">{item.text || <span className="text-muted-foreground">{label}</span>}</span>
      {urls.length ? (
        <button type="button" onClick={() => void openAllLinks(urls)} className="text-primary text-sm font-semibold shrink-0 hover:underline">
          Clique aqui{urls.length > 1 ? ` (${urls.length})` : ""}
        </button>
      ) : null}
    </div>
  );
}

export function ElderAgendaView({ data, save }: { data: AgendaData; save: AgendaSaver }) {
  const [p, setP] = useState<AgendaPayload>(data.payload);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [building, setBuilding] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfStyle, setPdfStyle] = useState<AgendaPdfStyle>("timeline");
  const isSc = data.role === "sc";
  const offline = !!data.offline;
  const openKey = "visita-sc:agenda-open";
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try { setClosed(JSON.parse(localStorage.getItem(openKey) || "{}")); } catch { /* sem preferência */ }
    setPdfStyle(readPdfStyle());
  }, []);
  const toggle = (id: string) => setClosed((cur) => { const next = { ...cur, [id]: !cur[id] }; try { localStorage.setItem(openKey, JSON.stringify(next)); } catch { /* cheio */ } return next; });
  const locked = isLocked(p);
  const can = (perm: AgendaAccess) => !offline && canEditNow(data.role, perm, p);
  const view = useMemo(() => agendaView(p, data.auto), [p, data.auto]);
  const numbered = useMemo(() => new Map(numberedBlocks(p.blocks).map((n) => [n.block.id, n.n])), [p.blocks]);
  const patch = (next: Partial<AgendaPayload>) => { setP((cur) => ({ ...cur, ...next })); setDirty(true); };
  const patchBlock = (id: string, next: Partial<AgendaBlock>) => {
    setP((cur) => ({ ...cur, blocks: cur.blocks.map((b) => (b.id === id ? { ...b, ...next } : b)) })); setDirty(true);
  };
  const move = (i: number, d: -1 | 1) => setP((cur) => {
    const j = i + d; if (j < 0 || j >= cur.blocks.length) return cur;
    const blocks = cur.blocks.slice(); [blocks[i], blocks[j]] = [blocks[j], blocks[i]]; setDirty(true); return { ...cur, blocks };
  });
  const addBlock = (type: AgendaBlockType) => {
    if (p.blocks.length >= MAX_BLOCKS) { toast.error(`Limite de ${MAX_BLOCKS} blocos.`); return; }
    patch({ blocks: [...p.blocks, newBlock(type)] });
  };
  const removeBlock = (b: AgendaBlock) => {
    if (!confirm(`Apagar o bloco "${b.title}"? O conteúdo dele também sai da pauta.`)) return;
    patch({ blocks: p.blocks.filter((x) => x.id !== b.id) });
  };

  const onSave = async () => {
    setBusy(true);
    try {
      const r = await save(p);
      if (r.ok) { setDirty(false); toast.success("Pauta salva."); } else toast.error(r.error ?? "Não foi possível salvar.");
    } catch { toast.error("Sem conexão. Tente salvar de novo."); }
    finally { setBusy(false); }
  };
  const onExport = async (style: AgendaPdfStyle) => {
    setPdfStyle(style); writePdfStyle(style); setPdfOpen(false); setExporting(true);
    try { await exportAgendaPdf(data, p, style); } catch { toast.error("Não foi possível gerar o PDF."); } finally { setExporting(false); }
  };

  const accessBadge = (perm: AgendaAccess, onChange: (a: AgendaAccess) => void, what: string) => {
    if (!isSc) return can(perm) ? null : <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Lock className="h-3 w-3" />Leitura</span>;
    const Icon = ACCESS_ICON[perm];
    return (
      <button type="button" onClick={() => onChange(ACCESS_NEXT[perm])}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shrink-0"
        aria-label={`Quem edita ${what}: ${ACCESS_LABEL[perm]}. Tocar para trocar.`}>
        <Icon className="h-3 w-3" />{ACCESS_LABEL[perm]}
      </button>
    );
  };

  const rich = (b: AgendaBlock, placeholder: string) =>
    can(b.perm) ? (
      <Suspense fallback={<div className="h-24 rounded-lg bg-muted/40 animate-pulse" />}>
        <RichNoteEditor value={b.html} onChange={(html) => patchBlock(b.id, { html })} placeholder={placeholder} minHeight="84px" maxHeight="55vh" />
      </Suspense>
    ) : b.html ? <BibleRefText text={b.html} className="text-sm" /> : <p className="text-sm text-muted-foreground italic">—</p>;

  const linksEditor = (b: AgendaBlock) => {
    const setItems = (items: AgendaLinkItem[]) => patchBlock(b.id, { items });
    const setItem = (i: number, next: Partial<AgendaLinkItem>) => setItems(b.items.map((x, j) => (j === i ? { ...x, ...next } : x)));
    if (!can(b.perm)) {
      const shown = b.items.filter((it) => it.text || itemUrls(it).length);
      return shown.length ? <div className="divide-y rounded-xl border px-3">{shown.map((it) => <AgendaLinkRow key={it.id} item={it} />)}</div> : null;
    }
    return (
      <div className="space-y-2">
        {b.items.map((it, i) => (
          <div key={it.id} className="rounded-xl border p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              {(Object.keys(LINK_KIND_UI) as AgendaLinkKind[]).map((k) => {
                const { icon: Icon, label } = LINK_KIND_UI[k];
                const on = it.kind === k;
                return (
                  <button key={k} type="button" onClick={() => setItem(i, { kind: k })} aria-label={label} aria-pressed={on}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
              <span className="flex-1" />
              <button type="button" onClick={() => setItems(b.items.filter((_, j) => j !== i))} aria-label="Apagar linha" className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
            </div>
            <Input value={it.text} placeholder="Título (ex.: Salmo 23 — meditar)" onChange={(e) => setItem(i, { text: e.target.value })} maxLength={500} />
            {it.urls.map((u, k) => (
              <div key={k} className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input value={u} placeholder="https://www.jw.org/..." inputMode="url" className="h-9"
                  onChange={(e) => setItem(i, { urls: it.urls.map((x, j) => (j === k ? e.target.value : x)) })}
                  onBlur={(e) => setItem(i, { urls: it.urls.map((x, j) => (j === k ? safeUrl(e.target.value) : x)) })} />
                {it.urls.length > 1 ? <button type="button" onClick={() => setItem(i, { urls: it.urls.filter((_, j) => j !== k) })} aria-label="Tirar link" className="p-1.5 text-muted-foreground"><X className="h-4 w-4" /></button> : null}
              </div>
            ))}
            {it.urls.length < 10 ? <button type="button" onClick={() => setItem(i, { urls: [...it.urls, ""] })} className="text-primary text-sm font-medium inline-flex items-center gap-1"><Plus className="h-4 w-4" />Adicionar link</button> : null}
          </div>
        ))}
        {b.items.length < 30 ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setItems([...b.items, { id: newId(), kind: "book", text: "", urls: [""] }])}>
            <Plus className="h-4 w-4" />Nova recomendação
          </Button>
        ) : null}
      </div>
    );
  };

  const blockContent = (b: AgendaBlock, n: number) => (
    <>
      {b.showSubject ? (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Tema / Assunto</Label>
          {can(b.perm) ? <Input value={b.subject} placeholder="Assunto escolhido pelo SC" onChange={(e) => patchBlock(b.id, { subject: e.target.value })} maxLength={300} />
            : <p className="text-sm break-words">{b.subject || "—"}</p>}
        </div>
      ) : null}
      {b.type === "recs" ? (
        data.auto.recommendations.length === 0
          ? <p className="text-sm text-muted-foreground">Nenhuma recomendação lançada no Programa dos anciãos.</p>
          : data.auto.recommendations.map((r, i) => (
            <div key={r.id} className="rounded-xl border p-3 space-y-2">
              <p className="text-sm font-semibold break-words">{n}.{i + 1} — {r.title}</p>
              {r.info ? <p className="text-sm whitespace-pre-wrap break-words text-muted-foreground">{r.info}</p> : null}
              <Label className="text-xs text-muted-foreground">Informação partilhada pelo CA</Label>
              {can(b.perm) ? (
                <Suspense fallback={<div className="h-20 rounded-lg bg-muted/40 animate-pulse" />}>
                  <RichNoteEditor value={b.notes[r.id] ?? ""} onChange={(html) => patchBlock(b.id, { notes: { ...b.notes, [r.id]: html } })} placeholder="Informação do CA" minHeight="84px" maxHeight="45vh" />
                </Suspense>
              ) : b.notes[r.id] ? <BibleRefText text={b.notes[r.id]} className="text-sm" /> : <p className="text-sm text-muted-foreground italic">—</p>}
            </div>
          ))
      ) : null}
      {b.type === "local" ? data.auto.local.map((l) => (
        <div key={l.id} className="rounded-xl border p-3 space-y-1 text-sm">
          <p className="break-words"><span className="text-muted-foreground">Quem indicou: </span>{l.suggestedBy || "—"}</p>
          <p className="break-words"><span className="text-muted-foreground">Tema: </span>{l.subject || "—"}</p>
          {l.sources ? <p className="break-words whitespace-pre-wrap"><span className="text-muted-foreground">Fontes: </span>{l.sources}</p> : null}
        </div>
      )) : null}
      {b.type === "links" ? linksEditor(b) : null}
      {b.type === "links" && !can(b.perm) && !b.html ? null : (
        <div className="space-y-1">
          {b.type !== "text" ? <Label className="text-xs text-muted-foreground">Anotações</Label> : null}
          {rich(b, b.type === "text" ? "Escreva aqui" : "Anotações")}
        </div>
      )}
    </>
  );

  const structureControls = (b: AgendaBlock, i: number) => (
    <div className="space-y-2 rounded-xl bg-muted/40 p-3">
      <Input value={b.title} onChange={(e) => patchBlock(b.id, { title: e.target.value.replace(/^\s*\d+[).]\s*/, "") })} maxLength={200} aria-label="Título do bloco" className="font-semibold" />
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Input type="number" inputMode="numeric" min={0} max={240} value={b.minutes} onChange={(e) => patchBlock(b.id, { minutes: Math.max(0, Math.min(240, Number(e.target.value) || 0)) })} className="h-8 w-16" />min
        </label>
        {accessBadge(b.perm, (perm) => patchBlock(b.id, { perm }), b.title)}
        {b.type === "text" ? (
          <button type="button" onClick={() => patchBlock(b.id, { showSubject: !b.showSubject })}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${b.showSubject ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
            Tema/Assunto
          </button>
        ) : null}
        <span className="flex-1" />
        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir" className="p-1.5 text-muted-foreground disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
        <button type="button" onClick={() => move(i, 1)} disabled={i === p.blocks.length - 1} aria-label="Descer" className="p-1.5 text-muted-foreground disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
        <button type="button" onClick={() => patchBlock(b.id, { hidden: !b.hidden })} aria-label={b.hidden ? "Mostrar" : "Ocultar"} className="p-1.5 text-muted-foreground">{b.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        <button type="button" onClick={() => removeBlock(b)} aria-label="Apagar bloco" className="p-1.5 text-destructive"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );

  const meetingMs = data.auto.meetingAt ? Date.parse(data.auto.meetingAt) : NaN;
  const deadlineMs = p.deadlineAt ? Date.parse(p.deadlineAt) : NaN;

  return (
    <div className="space-y-3 pb-24">
      <header className="text-center space-y-0.5">
        <h2 className="text-lg font-bold tracking-tight">Pauta – Reunião com Anciãos</h2>
        <p className="text-[11px] text-primary break-words">{AGENDA_VERSES}</p>
        <p className="text-xs text-muted-foreground break-words">
          {[data.congregation, formatMeetingWhen(data.auto.meetingAt), data.auto.location].filter(Boolean).join(" · ")}
        </p>
      </header>

      {offline ? (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2 text-xs text-muted-foreground"><WifiOff className="h-4 w-4 shrink-0" />Sem internet: mostrando a pauta guardada neste aparelho (somente leitura).</div>
      ) : locked && !isSc ? (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2 text-xs text-muted-foreground"><Lock className="h-4 w-4 shrink-0" />O prazo para preencher terminou. A pauta fica guardada neste aparelho para a reunião.</div>
      ) : p.deadlineAt && !isSc ? (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2 text-xs text-muted-foreground"><CalendarClock className="h-4 w-4 shrink-0" />Preencha até {formatMeetingWhen(p.deadlineAt)}.</div>
      ) : null}

      {isSc && !offline ? (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex gap-2">
              <Button type="button" variant={building ? "default" : "outline"} className="flex-1" onClick={() => setBuilding((v) => !v)}>
                <Pencil className="h-4 w-4" />{building ? "Concluir montagem" : "Montar pauta"}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => setTplOpen(true)}><Layers className="h-4 w-4" />Modelos</Button>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />Prazo para os anciãos preencherem</Label>
              <div className="flex items-center gap-2">
                <Input type="datetime-local" value={toLocalInput(p.deadlineAt)} className="h-9"
                  onChange={(e) => { const t = Date.parse(e.target.value); patch({ deadlineAt: Number.isFinite(t) ? new Date(t).toISOString() : null }); }} />
                {p.deadlineAt ? <button type="button" onClick={() => patch({ deadlineAt: null })} aria-label="Tirar prazo" className="p-2 text-muted-foreground"><X className="h-4 w-4" /></button> : null}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {!p.deadlineAt ? "Sem prazo: os anciãos podem preencher até a reunião."
                  : Number.isFinite(meetingMs) && deadlineMs < meetingMs ? "Depois do prazo, a pauta fica só para leitura e abre sem internet nos aparelhos que já a abriram."
                  : "O prazo é depois do horário da reunião."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="pt-4 space-y-1">
          <div className="flex justify-end">{accessBadge(p.prayersPerm, (prayersPerm) => patch({ prayersPerm }), "Orações e ata")}</div>
          {([["Oração inicial", "prayerOpen", data.auto.openingPrayer ?? ""], ["Oração recomendação", "prayerRec", ""], ["Oração final", "prayerClose", data.auto.closingPrayer ?? ""], ["Ata [Sfg 1:6]", "minutesTaker", ""]] as const).map(([label, k, fb]) => (
            <div key={k} className="flex items-center gap-2 min-w-0 py-1">
              <Label className="w-32 shrink-0 text-xs text-muted-foreground">{label}</Label>
              {can(p.prayersPerm)
                ? <Input value={p[k]} placeholder={fb || "—"} onChange={(e) => patch({ [k]: e.target.value } as Partial<AgendaPayload>)} className="h-9" maxLength={120} />
                : <span className="text-sm break-words">{p[k] || fb || "—"}</span>}
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-2 mt-1">
            <span className="text-xs text-muted-foreground">Tempo total</span>
            <span className="text-sm font-semibold">{view.totalMinutes} min</span>
          </div>
        </CardContent>
      </Card>

      {p.blocks.map((b, i) => {
        if (b.hidden && !(isSc && building)) return null;
        const n = numbered.get(b.id);
        const open = building || !closed[b.id];
        return (
          <Card key={b.id} className={`overflow-hidden ${b.hidden ? "opacity-60" : ""}`}>
            <button type="button" onClick={() => !building && toggle(b.id)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-left min-w-0">
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-bold text-primary shrink-0">{n ?? "–"}</span>
              <span className="flex-1 min-w-0 font-semibold break-words">{b.title}</span>
              {b.minutes ? <span className="text-xs text-muted-foreground shrink-0">{b.minutes} min</span> : null}
              {!building ? <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} /> : null}
            </button>
            <CardContent className={open ? "space-y-3 pt-0" : "hidden"}>
              {isSc && building ? structureControls(b, i) : !isSc && !can(b.perm) ? <div className="flex justify-end">{accessBadge(b.perm, () => undefined, b.title)}</div> : null}
              {blockContent(b, n ?? 0)}
            </CardContent>
          </Card>
        );
      })}

      {isSc && building ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="w-full border-dashed"><Plus className="h-4 w-4" />Adicionar bloco</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-64">
            {(Object.keys(BLOCK_TYPE_LABEL) as AgendaBlockType[]).map((t) => (
              <DropdownMenuItem key={t} onSelect={() => addBlock(t)}>{BLOCK_TYPE_LABEL[t]}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <div className="sticky bottom-3 z-10 flex gap-2 rounded-2xl border bg-background/95 p-2 shadow-lg backdrop-blur">
        <Button variant="outline" className="flex-1" onClick={() => setPdfOpen(true)} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} PDF
        </Button>
        {!offline ? (
          <Button className="flex-1" onClick={onSave} disabled={busy || !dirty}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {dirty ? "Salvar" : "Salvo"}
          </Button>
        ) : null}
      </div>

      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Estilo do PDF</DialogTitle></DialogHeader>
          <div className="divide-y rounded-xl border">
            {AGENDA_PDF_STYLES.map((s) => (
              <button key={s.id} type="button" onClick={() => void onExport(s.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{s.hint}</span>
                </span>
                {pdfStyle === s.id ? <span className="text-[11px] font-medium text-primary">Último usado</span> : null}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {isSc ? (
        <AgendaTemplatesDialog open={tplOpen} onOpenChange={setTplOpen} blocks={p.blocks}
          onApply={(blocks) => { patch({ blocks }); setBuilding(true); toast.success("Modelo aplicado. Toque em Salvar para gravar."); }} />
      ) : null}
    </div>
  );
}
