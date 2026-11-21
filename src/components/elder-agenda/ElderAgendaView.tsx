// Tela da "Pauta – Reunião com Anciãos", montada em blocos.
// SC: renomeia, reordena, oculta, apaga e adiciona blocos, escolhe quem edita cada um, define um prazo
// e usa/salva modelos. Anciãos (com ou sem cadastro) preenchem o que foi liberado até o prazo.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { BookOpenCheck, Hammer, Maximize2, RefreshCw } from "lucide-react";
import { useFocusChromeWhile } from "@/lib/focus-chrome";
import { toast } from "sonner";
import {
  ArrowDown, ArrowUp, BookOpen, CalendarClock, ChevronDown, Eye, EyeOff, FileDown, FileText, HandHeart, Layers, Library, Link2, Loader2,
  Lock, MapPin, MessageSquareReply, Pencil, PlayCircle, Plus, Save, Send, Trash2, Users, UserCog, WifiOff, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BibleRefText } from "@/components/bible/BibleRefText";
import { saveBlob } from "@/lib/share";
import {
  ACCESS_LABEL, ATTACHABLE, CARD_TYPES, CARD_TYPE_LABEL, MAX_BLOCKS, MAX_CARDS, agendaView, autoHidden, canEditCard, isLocked, itemUrls,
  newBlock, newCard, newId, numberedBlocks, prayerRecShown, recInfoView, safeUrl, withoutPrivate, withParts, newLinkItem, shownParts,
  type AgendaRecDecision,
  type AgendaAccess, type AgendaAttachment, type AgendaAuto, type AgendaBlock, type AgendaCard, type AgendaCardType, type AgendaLinkItem, type AgendaLinkPart,
  type AgendaLinkKind, type AgendaPayload, type AgendaRecInfo, type AgendaRole,
} from "@/lib/elder-agenda/agenda";
import { AGENDA_PDF_STYLES, type AgendaPdfStyle } from "@/lib/elder-agenda/agenda-pdf";
import { readPdfStyle, writePdfStyle } from "@/lib/elder-agenda/agenda-cache";
import { openAllLinks } from "./open-all-links";
import { AgendaTemplatesDialog } from "./AgendaTemplatesDialog";
import { AgendaTopicPill } from "./AgendaTopicPill";
import { AttachmentViewerHost } from "./AttachmentViewer";
import { AgendaAttachments, type AgendaAttachmentApi } from "./AgendaAttachments";
import { EditorResizeHandle } from "@/components/outlines/EditorResizeHandle";
import { ElderInfoQuestionsEditor, ElderInfoResponses } from "./ElderInfoResponses";
import { authorHash } from "./agenda-author";
import type { AgendaElderResponse } from "@/lib/elder-agenda/agenda";
import { wallClock } from "@/lib/elder-agenda/agenda";
import { s303ForWeek, upsertDeclineNote } from "@/lib/elder-agenda/agenda-notes";

const ElderAgendaFullscreen = lazy(() => import("./ElderAgendaFullscreen").then((m) => ({ default: m.ElderAgendaFullscreen })));
const H_KEY = "visita-sc:agenda-field-h";
function readHeights(): Record<string, number> { try { return JSON.parse(localStorage.getItem(H_KEY) || "{}"); } catch { return {}; } }

const RichNoteEditor = lazy(() => import("@/components/notes/RichNoteEditor").then((m) => ({ default: m.RichNoteEditor })));

export interface AgendaData {
  visitId: string; congregation: string; range: string; role: AgendaRole;
  /** Para ligar com as Notas privadas (só vem do servidor nas versões novas). */ congregationId?: string; startDate?: string;
  payload: AgendaPayload; auto: AgendaAuto; offline?: boolean;
  attachmentApi?: AgendaAttachmentApi;
  /** Quando a pauta veio da nuvem pela última vez (ms). */ loadedAt?: number | null;
  /** Último envio aos anciãos. */ publishedAt?: string | null;
  /** Ancião: o SC ainda não enviou. */ notPublished?: boolean;
  /** SC: ajustes salvos ainda não enviados. */ unsent?: boolean;
}
export type AgendaPublisher = () => Promise<{ ok: boolean; error?: string }>;
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
  const blob = await renderAgendaPdf({ payload: withoutPrivate(payload), auto: data.auto, congregation: data.congregation, range: data.range, style });
  await saveBlob(blob, { filename: `pauta-reuniao-anciaos-${style}-${data.visitId.slice(0, 8)}.pdf`, mimeType: "application/pdf" });
}

/** Linha de links só para ler: ícone + texto + "Clique aqui" (abre todos os links da linha). */
export function AgendaLinkRow({ item }: { item: AgendaLinkItem }) {
  const { icon: Icon, label } = LINK_KIND_UI[item.kind];
  const parts = shownParts(item);
  return (
    <div className="flex items-center gap-3 min-w-0 py-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0"><Icon className="h-4 w-4 text-primary" aria-label={label} /></span>
      <span className="flex-1 min-w-0 text-sm break-words">
        {parts.length ? parts.map((pt, k) => (
          <span key={pt.id}>{k ? <span className="text-muted-foreground"> | </span> : null}
            {pt.url ? <button type="button" onClick={() => void openAllLinks([pt.url])} className="text-primary underline underline-offset-2 text-left">{pt.title}</button> : pt.title}
          </span>
        )) : <span className="text-muted-foreground">{label}</span>}
      </span>
    </div>
  );
}

export const CARD_ICON: Record<AgendaCardType, typeof Lock> = {
  notes: FileText, links: PlayCircle, eldersInfo: Users, scReply: MessageSquareReply, recs: HandHeart, local: MapPin, private: Lock,
};

/** Modos do SC: Leitura (pauta pronta), Preparar (escrever, links, anexos) e Montar (estrutura). */
export type AgendaMode = "read" | "prepare" | "build";
/** Pauta já preparada abre em Leitura; vazia abre em Preparar. */
export function initialMode(p: AgendaPayload): AgendaMode {
  const filled = p.blocks.some((b) => b.cards.some((c) => !!c.html.replace(/<[^>]*>/g, "").trim() || c.items.some((it) => shownParts(it).length) || c.attachments.length || c.responses.length));
  return filled ? "read" : "prepare";
}

export function ElderAgendaView({ data, save, onRefresh, onPublish }: { data: AgendaData; save: AgendaSaver; onRefresh?: () => Promise<void> | void; onPublish?: AgendaPublisher }) {
  const [publishOpen, setPublishOpen] = useState(false);
  // Índice lateral (iPad/tablet deitado) acompanha a rolagem: o main não pode recortar com overflow hidden.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("outline-sticky");
    return () => root.classList.remove("outline-sticky");
  }, []);
  const [publishing, setPublishing] = useState(false);
  const [p, setP] = useState<AgendaPayload>(data.payload);
  const [dirty, setDirtyState] = useState(false);
  const dirtyRef = useRef(false);
  const setDirty = (v: boolean) => { dirtyRef.current = v; setDirtyState(v); };
  // Nova versão vinda da nuvem (Atualizar / depois de salvar): entra na tela se não há nada por salvar.
  useEffect(() => { if (!dirtyRef.current) setP(data.payload); }, [data.payload]);
  const [mode, setMode] = useState<AgendaMode>(() => initialMode(data.payload));
  const [refreshing, setRefreshing] = useState(false);
  const [fieldEdit, setFieldEdit] = useState<{ title: string; value: string; apply: (html: string) => void } | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const building = data.role === "sc" && mode === "build";
  const setBuilding = (v: boolean | ((x: boolean) => boolean)) => setMode((m) => ((typeof v === "function" ? v(m === "build") : v) ? "build" : "prepare"));
  const [tplOpen, setTplOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [addTo, setAddTo] = useState<string | null>(null);
  const [pdfStyle, setPdfStyle] = useState<AgendaPdfStyle>("timeline");
  const [full, setFull] = useState(false);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [syncing, setSyncing] = useState<string | null>(null);
  const setHeight = (k: string, px: number) => setHeights((cur) => { const next = { ...cur, [k]: px }; try { localStorage.setItem(H_KEY, JSON.stringify(next)); } catch { /* cheio */ } return next; });
  const isSc = data.role === "sc";
  const offline = !!data.offline;
  /** Leitura do SC: tudo visível, sem caixas abertas; campos só do SC editam um por vez. */
  const reading = isSc && mode === "read";
  const preparing = isSc && mode === "prepare" && !offline;
  useFocusChromeWhile(preparing);
  const openKey = "visita-sc:agenda-open";
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try { setClosed(JSON.parse(localStorage.getItem(openKey) || "{}")); } catch { /* sem preferência */ }
    setPdfStyle(readPdfStyle());
    setHeights(readHeights());
    void authorHash().then(setMyHash).catch(() => undefined);
  }, []);
  const [myHash, setMyHash] = useState("");
  const toggle = (id: string) => setClosed((cur) => { const next = { ...cur, [id]: !cur[id] }; try { localStorage.setItem(openKey, JSON.stringify(next)); } catch { /* cheio */ } return next; });
  const locked = isLocked(p);
  const canPerm = (perm: AgendaAccess) => !offline && !reading && (isSc || (!locked && canEditCard(data.role, { type: "notes", perm })));
  const canCard = (c: AgendaCard) => !offline && !reading && (isSc || (!locked && canEditCard(data.role, c)));
  const view = useMemo(() => agendaView(p, data.auto), [p, data.auto]);
  const numbered = useMemo(() => new Map(numberedBlocks(p.blocks, data.auto).map((n) => [n.block.id, n.n])), [p.blocks, data.auto]);
  const patch = (next: Partial<AgendaPayload>) => { setP((cur) => ({ ...cur, ...next })); setDirty(true); };
  const patchBlock = (id: string, next: Partial<AgendaBlock>) => {
    setP((cur) => ({ ...cur, blocks: cur.blocks.map((b) => (b.id === id ? { ...b, ...next } : b)) })); setDirty(true);
  };
  const patchCard = (id: string, next: Partial<AgendaCard>) => {
    setP((cur) => ({ ...cur, blocks: cur.blocks.map((b) => ({ ...b, cards: b.cards.map((c) => (c.id === id ? { ...c, ...next } : c)) })) })); setDirty(true);
  };
  const move = (i: number, d: -1 | 1) => setP((cur) => {
    const j = i + d; if (j < 0 || j >= cur.blocks.length) return cur;
    const blocks = cur.blocks.slice(); [blocks[i], blocks[j]] = [blocks[j], blocks[i]]; setDirty(true); return { ...cur, blocks };
  });
  const moveCard = (b: AgendaBlock, i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= b.cards.length) return;
    const cards = b.cards.slice(); [cards[i], cards[j]] = [cards[j], cards[i]]; patchBlock(b.id, { cards });
  };
  const addBlock = () => {
    if (p.blocks.length >= MAX_BLOCKS) { toast.error(`Limite de ${MAX_BLOCKS} tópicos.`); return; }
    patch({ blocks: [...p.blocks, newBlock()] });
  };
  const addCard = (blockId: string, type: AgendaCardType) => {
    const b = p.blocks.find((x) => x.id === blockId); setAddTo(null);
    if (!b) return;
    if (b.cards.length >= MAX_CARDS) { toast.error(`Limite de ${MAX_CARDS} cartões por tópico.`); return; }
    patchBlock(b.id, { cards: [...b.cards, newCard(type)] });
  };
  const removeBlock = (b: AgendaBlock) => {
    if (!confirm(`Apagar o tópico "${b.title}"? Os cartões dele também saem da pauta.`)) return;
    patch({ blocks: p.blocks.filter((x) => x.id !== b.id) });
  };
  const removeCard = (b: AgendaBlock, c: AgendaCard) => {
    if (!confirm(`Tirar o cartão "${CARD_TYPE_LABEL[c.type]}" deste tópico?`)) return;
    patchBlock(b.id, { cards: b.cards.filter((x) => x.id !== c.id) });
  };

  const onSave = async (after?: AgendaMode): Promise<boolean> => {
    setBusy(true);
    try {
      const r = await save(p);
      if (r.ok) { setDirty(false); toast.success("Pauta salva."); if (after) setMode(after); return true; }
      toast.error(r.error ?? "Não foi possível salvar."); return false;
    } catch { toast.error("Sem conexão. Tente salvar de novo."); return false; }
    finally { setBusy(false); }
  };
  /** Grava na hora uma versão já pronta (anexo tirado, campo do SC na Leitura). */
  const persist = async (next: AgendaPayload, ok: string) => {
    setP(next); setDirty(true);
    try {
      const r = await save(next);
      if (r.ok) { setDirty(false); toast.success(ok); } else toast.error(r.error ?? "Não foi possível salvar.");
    } catch { toast.error("Sem conexão. Toque em Salvar depois."); }
  };
  // Na Leitura, Designar/Não designar e outros toques rápidos gravam sozinhos.
  useEffect(() => {
    if (!reading || !dirty || busy) return;
    const t = setTimeout(() => { void onSave(); }, 700);
    return () => clearTimeout(t);
  }, [reading, dirty, p]); // eslint-disable-line react-hooks/exhaustive-deps
  const switchMode = async (m: AgendaMode) => {
    if (m === mode) return;
    if (dirty && mode !== "read") {
      if (confirm("Salvar as alterações antes de trocar de modo?")) { if (!(await onSave())) return; }
      else if (!confirm("Descartar as alterações não salvas?")) return;
      else { setDirty(false); setP(data.payload); }
    }
    setMode(m);
  };
  const refresh = async () => {
    if (!onRefresh) return;
    if (dirty && !confirm("Há alterações não salvas. Descartar e atualizar a pauta?")) return;
    setDirty(false); setRefreshing(true);
    try { await onRefresh(); toast.success("Pauta atualizada."); } catch { toast.error("Sem conexão."); } finally { setRefreshing(false); }
  };
  /** Campo só do SC na Leitura: lápis abre uma folha só com ele. */
  const scField = (title: string, value: string, apply: (html: string) => AgendaPayload, placeholder = "—") => (
    <div className="flex items-start gap-2 min-w-0">
      <div className="flex-1 min-w-0">{value ? <BibleRefText text={value} className="text-sm" /> : <p className="text-sm text-muted-foreground italic">{placeholder}</p>}</div>
      {!offline ? (
        <button type="button" onClick={() => setFieldEdit({ title, value, apply: (html) => void persist(apply(html), "Salvo.") })} aria-label={`Editar ${title}`}
          className="flex h-8 w-8 items-center justify-center rounded-full text-primary active:bg-primary/10 shrink-0"><Pencil className="h-4 w-4" /></button>
      ) : null}
    </div>
  );
  const withCard = (cur: AgendaPayload, id: string, next: Partial<AgendaCard>): AgendaPayload =>
    ({ ...cur, blocks: cur.blocks.map((b) => ({ ...b, cards: b.cards.map((c) => (c.id === id ? { ...c, ...next } : c)) })) });
  /** Resposta do ancião: grava na hora, sem esperar o botão Salvar. */
  const commitResponses = async (cardId: string, responses: AgendaElderResponse[]) => {
    const next: AgendaPayload = { ...p, blocks: p.blocks.map((b) => ({ ...b, cards: b.cards.map((c) => (c.id === cardId ? { ...c, responses } : c)) })) };
    try {
      const res = await save(next);
      if (!res.ok) { toast.error(res.error ?? "Não foi possível salvar."); return false; }
      setP((cur) => ({ ...cur, blocks: cur.blocks.map((b) => ({ ...b, cards: b.cards.map((c) => (c.id === cardId ? { ...c, responses } : c)) })) }));
      return true;
    } catch { toast.error("Sem conexão. Tente de novo."); return false; }
  };
  const onExport = async (style: AgendaPdfStyle) => {
    setPdfOpen(false); setExporting(true);
    if (isSc) { setPdfStyle(style); writePdfStyle(style); if (p.pdfStyle !== style) patch({ pdfStyle: style }); }
    try { await exportAgendaPdf(data, isSc ? { ...p, pdfStyle: style } : p, style); } catch { toast.error("Não foi possível gerar o PDF."); } finally { setExporting(false); }
  };

  const accessBadge = (perm: AgendaAccess, onChange: (a: AgendaAccess) => void, what: string, editable: boolean) => {
    if (!isSc) return editable ? null : <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Lock className="h-3 w-3" />Leitura</span>;
    const Icon = ACCESS_ICON[perm];
    return (
      <button type="button" onClick={() => onChange(ACCESS_NEXT[perm])}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shrink-0"
        aria-label={`Quem edita ${what}: ${ACCESS_LABEL[perm]}. Tocar para trocar.`}>
        <Icon className="h-3 w-3" />{ACCESS_LABEL[perm]}
      </button>
    );
  };

  const richField = (value: string, onChange: (html: string) => void, editable: boolean, placeholder: string, hKey = "") => {
    const extra = hKey ? heights[hKey] ?? 0 : 0;
    return editable ? (
      <div>
        <Suspense fallback={<div className="h-24 rounded-lg bg-muted/40 animate-pulse" />}>
          <RichNoteEditor value={value} onChange={onChange} placeholder={placeholder} minHeight={`${84 + extra}px`} maxHeight={extra ? "none" : "55vh"} />
        </Suspense>
        {hKey ? <EditorResizeHandle value={extra} onChange={(px) => setHeight(hKey, px)} /> : null}
      </div>
    ) : value ? <BibleRefText text={value} className="text-sm" /> : <p className="text-sm text-muted-foreground italic">—</p>;
  };

  const decide = async (recId: string, decision: AgendaRecDecision, c: AgendaCard) => {
    const prev = p.scRecs[recId] ?? { comment: "", decision: null };
    patch({ scRecs: { ...p.scRecs, [recId]: { ...prev, decision } } });
    if (decision !== "decline") return;
    const rec = data.auto.recommendations.find((x) => x.id === recId);
    if (!rec || !data.congregationId) { toast.error("Abra a pauta com internet uma vez para ligar com as Notas privadas."); return; }
    const ri = recInfoView(c, rec);
    try {
      const r = await upsertDeclineNote({ congregationId: data.congregationId, rec, commentHtml: prev.comment, family: ri.family, fieldGroup: ri.fieldGroup, info: ri.info });
      toast.success(r === "updated" ? "Nota em Recomendados atualizada." : r === "queued" ? "Nota guardada no aparelho; envia ao sincronizar." : "Nota criada em Notas privadas › Recomendados.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível criar a nota."); }
  };

  const syncS303 = async (c: AgendaCard) => {
    if (!data.congregationId || !data.startDate) { toast.error("Abra a pauta com internet uma vez para sincronizar."); return; }
    setSyncing(c.id);
    try {
      const html = await s303ForWeek(data.congregationId, data.startDate);
      if (!html) { toast.info("Nenhuma S-303 nesta semana em Notas privadas."); return; }
      patchCard(c.id, { html: c.html ? `${c.html}${html}` : html });
      toast.success("S-303 inserida. Toque em Salvar para gravar.");
    } catch { toast.error("Não foi possível ler as Notas privadas."); } finally { setSyncing(null); }
  };

  const linksEditor = (c: AgendaCard, editable: boolean) => {
    const setItems = (items: AgendaLinkItem[]) => patchCard(c.id, { items });
    const setItem = (i: number, next: Partial<AgendaLinkItem>) => setItems(c.items.map((x, j) => (j === i ? { ...x, ...next } : x)));
    if (!editable) {
      const shown = c.items.filter((it) => shownParts(it).length);
      return shown.length ? <div className="divide-y rounded-xl border px-3">{shown.map((it) => <AgendaLinkRow key={it.id} item={it} />)}</div> : null;
    }
    return (
      <div className="space-y-2">
        {c.items.map((it, i) => (
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
              <button type="button" onClick={() => setItems(c.items.filter((_, j) => j !== i))} aria-label="Apagar linha" className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
            </div>
            {it.parts.map((pt, k) => {
              const setPart = (next: Partial<AgendaLinkPart>) => setItem(i, withParts({ ...it, parts: it.parts.map((x, j) => (j === k ? { ...x, ...next } : x)) }));
              return (
                <div key={pt.id} className={`space-y-1.5 ${k ? "border-t pt-2" : ""}`}>
                  <div className="flex items-center gap-2">
                    <Input value={pt.title} placeholder={k ? "Outro nome" : "Nome (ex.: A Sentinela 15/2/2015 págs. 15-18)"} maxLength={300} onChange={(e) => setPart({ title: e.target.value })} />
                    {it.parts.length > 1 ? <button type="button" onClick={() => setItem(i, withParts({ ...it, parts: it.parts.filter((_, j) => j !== k) }))} aria-label="Tirar este item" className="p-1.5 text-muted-foreground"><X className="h-4 w-4" /></button> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input value={pt.url} placeholder="Link (opcional) https://www.jw.org/..." inputMode="url" className="h-9"
                      onChange={(e) => setPart({ url: e.target.value })} onBlur={(e) => setPart({ url: safeUrl(e.target.value) })} />
                  </div>
                </div>
              );
            })}
            {it.parts.length < 10 ? <button type="button" onClick={() => setItem(i, withParts({ ...it, parts: [...it.parts, { id: newId(), title: "", url: "" }] }))} className="text-primary text-sm font-medium inline-flex items-center gap-1"><Plus className="h-4 w-4" />Adicionar {it.kind === "video" ? "outro vídeo" : it.kind === "article" ? "outro artigo" : "outra leitura"}</button> : null}
          </div>
        ))}
        {c.items.length < 30 ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setItems([...c.items, newLinkItem("book")])}>
            <Plus className="h-4 w-4" />Nova fonte
          </Button>
        ) : null}
      </div>
    );
  };

  const recField = (c: AgendaCard, recId: string, cur: AgendaRecInfo, key: keyof AgendaRecInfo, label: string, editable: boolean) => {
    const set = (v: string) => patchCard(c.id, { recInfo: { ...c.recInfo, [recId]: { ...cur, ...(c.recInfo[recId] ?? {}), [key]: v } } });
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {key === "info" ? richField(cur.info, set, editable, label, `${c.id}.${recId}.info`)
          : editable ? <Input value={cur[key]} onChange={(e) => set(e.target.value)} maxLength={key === "family" ? 1000 : 300} className="h-9" />
          : <p className="text-sm break-words whitespace-pre-wrap">{cur[key] || "—"}</p>}
      </div>
    );
  };

  const cardBody = (c: AgendaCard, n: number) => {
    const editable = canCard(c);
    const set = (attachments: AgendaAttachment[]) => {
      // Tirar um anexo grava na hora: ele some para todos e o arquivo sai da nuvem.
      if (isSc && attachments.length < c.attachments.length) void persist(withCard(p, c.id, { attachments }), "Anexo removido.");
      else patchCard(c.id, { attachments });
    };
    return (
      <>
        {c.showSubject ? (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tema / Assunto</Label>
            {editable ? <Input value={c.subject} placeholder="Assunto escolhido pelo SC" onChange={(e) => patchCard(c.id, { subject: e.target.value })} maxLength={300} />
              : <p className="text-sm break-words">{c.subject || "—"}</p>}
          </div>
        ) : null}
        {c.type === "recs" ? (
          data.auto.recommendations.length === 0
            ? <p className="text-sm text-muted-foreground">Nenhuma recomendação lançada no Programa dos anciãos.</p>
            : data.auto.recommendations.map((r, i) => {
              const cur = recInfoView(c, r);
              return (
                <div key={r.id} className="rounded-xl border p-3 space-y-2">
                  <p className="text-sm font-semibold break-words">{n}.{i + 1} — {r.title}</p>
                  {recField(c, r.id, cur, "family", "Membros da família", editable)}
                  {recField(c, r.id, cur, "fieldGroup", "Grupo de campo", editable)}
                  {recField(c, r.id, cur, "info", "Informações espirituais, pessoais e familiares", editable)}
                  {c.notes[r.id] ? (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Informação partilhada pelo CA</Label>
                      {richField(c.notes[r.id], (html) => patchCard(c.id, { notes: { ...c.notes, [r.id]: html } }), editable, "Informação do CA", `${c.id}.${r.id}.ca`)}
                    </div>
                  ) : null}
                  {isSc ? (
                    <div className="space-y-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-2.5">
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-primary"><Lock className="h-3 w-3" />Só SC · fora do PDF</p>
                      <Label className="text-xs text-muted-foreground">Comentários do SC</Label>
                      {reading
                        ? scField("Comentários do SC", p.scRecs[r.id]?.comment ?? "", (html) => ({ ...p, scRecs: { ...p.scRecs, [r.id]: { decision: p.scRecs[r.id]?.decision ?? null, comment: html } } }), "Toque no lápis para comentar")
                        : richField(p.scRecs[r.id]?.comment ?? "", (html) => patch({ scRecs: { ...p.scRecs, [r.id]: { decision: p.scRecs[r.id]?.decision ?? null, comment: html } } }), !offline, "Seus comentários sobre o recomendado", `${c.id}.${r.id}.sc`)}
                      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1" role="radiogroup" aria-label="Decisão">
                        {([["assign", "Designar"], ["decline", "Não designar"]] as const).map(([d, lbl]) => {
                          const on = p.scRecs[r.id]?.decision === d;
                          return (
                            <button key={d} type="button" role="radio" aria-checked={on} disabled={offline}
                              onClick={() => void decide(r.id, on ? null : d, c)}
                              className={`rounded-full px-2 py-1.5 text-xs font-semibold transition-colors ${on ? (d === "decline" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground") : "text-muted-foreground"}`}>
                              {lbl}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
        ) : null}
        {c.type === "local" ? (
          data.auto.local.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum assunto local lançado no Programa dos anciãos.</p>
          : data.auto.local.map((l) => (
            <div key={l.id} className="rounded-xl border p-3 space-y-1 text-sm">
              <p className="break-words"><span className="text-muted-foreground">Quem indicou: </span>{l.suggestedBy || "—"}</p>
              <p className="break-words"><span className="text-muted-foreground">Tema: </span>{l.subject || "—"}</p>
              {l.sources ? <p className="break-words whitespace-pre-wrap"><span className="text-muted-foreground">Fontes: </span>{l.sources}</p> : null}
            </div>
          ))
        ) : null}
        {c.type === "links" ? linksEditor(c, editable) : null}
        {c.type === "eldersInfo" ? (
          <ElderInfoResponses card={c} isSc={isSc} canWrite={editable} myHash={myHash} onCommit={(list) => commitResponses(c.id, list)} />
        ) : null}
        {c.type === "recs" || c.type === "eldersInfo" || (c.type === "links" && !editable && !c.html) ? null : (
          <div className="space-y-1">
            {c.type === "links" || c.type === "local" ? <Label className="text-xs text-muted-foreground">Anotações</Label> : null}
            {reading && (c.type === "private" || c.type === "notes" || c.type === "scReply" || c.hidden)
              ? scField(CARD_TYPE_LABEL[c.type], c.html, (html) => withCard(p, c.id, { html }), "Toque no lápis para escrever")
              : richField(c.html, (html) => patchCard(c.id, { html }), editable, c.type === "private" ? "Só você vê esta nota" : "Escreva aqui", `${c.id}.html`)}
          </div>
        )}
        {ATTACHABLE.includes(c.type) ? (
          <AgendaAttachments card={c} editable={isSc && !offline && !reading} api={data.attachmentApi} offline={offline} onChange={set} />
        ) : null}
      </>
    );
  };

  const cardView = (c: AgendaCard, n: number) => {
    const Icon = CARD_ICON[c.type];
    const editable = canCard(c);
    return (
      <section key={c.id} className={`space-y-2 rounded-2xl p-3 ${c.type === "private" || c.hidden ? "border border-dashed border-primary/40 bg-primary/5" : "bg-muted/30"}`}>
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 min-w-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground break-words">{CARD_TYPE_LABEL[c.type]}</span>
          {c.type === "notes" && isSc && !offline ? (
            <button type="button" onClick={() => void syncS303(c)} disabled={syncing === c.id} aria-label="Sincronizar com a S-303 da semana"
              className="flex h-8 w-8 items-center justify-center rounded-full text-primary hover:bg-primary/10 shrink-0">
              {syncing === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
          ) : null}
          {c.type === "private" ? <span className="text-[11px] text-muted-foreground shrink-0">Só você vê · fora do PDF</span>
            : c.hidden ? <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground shrink-0"><EyeOff className="h-3 w-3" />Oculto</span>
            : isSc ? <span className="text-[11px] text-muted-foreground shrink-0">{ACCESS_LABEL[c.perm]}</span>
            : !editable ? accessBadge(c.perm, () => undefined, CARD_TYPE_LABEL[c.type], false) : null}
        </div>
        {cardBody(c, n)}
      </section>
    );
  };

  const buildCardRow = (b: AgendaBlock, c: AgendaCard, i: number) => {
    const Icon = CARD_ICON[c.type];
    return (
      <div key={c.id} className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-background px-2.5 py-2">
        <div className="flex w-full items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 min-w-0 text-sm font-medium break-words">{CARD_TYPE_LABEL[c.type]}</span>
        </div>
        {c.type === "private" ? <span className="text-[11px] text-muted-foreground">Só você</span>
          : accessBadge(c.perm, (perm) => patchCard(c.id, { perm }), CARD_TYPE_LABEL[c.type], true)}
        {c.type === "notes" ? (
          <button type="button" onClick={() => patchCard(c.id, { showSubject: !c.showSubject })}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${c.showSubject ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
            Tema/Assunto
          </button>
        ) : null}
        {c.type !== "private" ? (
          <button type="button" onClick={() => patchCard(c.id, { hidden: !c.hidden })} aria-pressed={c.hidden}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${c.hidden ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
            {c.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}{c.hidden ? "Oculto dos anciãos" : "Visível"}
          </button>
        ) : null}
        <span className="flex-1" />
        {c.type === "eldersInfo" ? <ElderInfoQuestionsEditor card={c} onChange={(next) => patchCard(c.id, next)} /> : null}
        <button type="button" onClick={() => moveCard(b, i, -1)} disabled={i === 0} aria-label="Subir cartão" className="p-1.5 text-muted-foreground disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
        <button type="button" onClick={() => moveCard(b, i, 1)} disabled={i === b.cards.length - 1} aria-label="Descer cartão" className="p-1.5 text-muted-foreground disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
        <button type="button" onClick={() => removeCard(b, c)} aria-label="Tirar cartão" className="p-1.5 text-destructive"><Trash2 className="h-4 w-4" /></button>
      </div>
    );
  };

  const structureControls = (b: AgendaBlock, i: number) => (
    <div className="space-y-2 rounded-xl bg-muted/40 p-3">
      <Input value={b.title} onChange={(e) => patchBlock(b.id, { title: e.target.value.replace(/^\s*\d+[).]\s*/, "") })} maxLength={200} aria-label="Título do tópico" className="font-semibold" />
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Input type="number" inputMode="numeric" min={0} max={240} value={b.minutes} onChange={(e) => patchBlock(b.id, { minutes: Math.max(0, Math.min(240, Number(e.target.value) || 0)) })} className="h-8 w-16" />min
        </label>
        <span className="flex-1" />
        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir tópico" className="p-1.5 text-muted-foreground disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
        <button type="button" onClick={() => move(i, 1)} disabled={i === p.blocks.length - 1} aria-label="Descer tópico" className="p-1.5 text-muted-foreground disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
        <button type="button" onClick={() => patchBlock(b.id, { hidden: !b.hidden })} aria-label={b.hidden ? "Mostrar" : "Ocultar"} className="p-1.5 text-muted-foreground">{b.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        <button type="button" onClick={() => removeBlock(b)} aria-label="Apagar tópico" className="p-1.5 text-destructive"><Trash2 className="h-4 w-4" /></button>
      </div>
      {autoHidden(b, data.auto) ? <p className="text-[11px] text-muted-foreground">Oculto: nada no Programa dos anciãos.</p> : null}
      <div className="space-y-1.5">
        {b.cards.map((c, j) => buildCardRow(b, c, j))}
        {b.cards.length === 0 ? <p className="text-xs text-muted-foreground">Sem cartões: só o título aparece.</p> : null}
        <button type="button" onClick={() => setAddTo(b.id)} className="w-full rounded-xl border border-dashed py-2 text-sm font-medium text-primary inline-flex items-center justify-center gap-1">
          <Plus className="h-4 w-4" />Adicionar cartão
        </button>
      </div>
    </div>
  );

  /** Índice lateral: abre o tópico (se recolhido) e rola até ele. */
  const goTopic = (id: string) => {
    if (closed[id]) toggle(id);
    requestAnimationFrame(() => document.getElementById(`agenda-topic-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const responseTotal = p.blocks.reduce((n, b) => n + b.cards.reduce((m, c) => m + (c.type === "eldersInfo" ? c.responses.length : 0), 0), 0);
  const meetingMs = view.meetingAt ? Date.parse(view.meetingAt) : NaN;
  const deadlineMs = p.deadlineAt ? Date.parse(p.deadlineAt) : NaN;
  const onSend = async () => {
    if (!onPublish) return;
    setPublishing(true);
    try {
      if (dirty && !(await onSave())) return;
      const r = await onPublish();
      if (r.ok) { toast.success("Pauta enviada aos anciãos."); setPublishOpen(false); } else toast.error(r.error ?? "Não foi possível enviar.");
    } catch { toast.error("Sem conexão. Conecte-se para enviar."); } finally { setPublishing(false); }
  };
  const fmtSent = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", " às");

  if (!isSc && data.notPublished) {
    return (
      <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <CalendarClock className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">O superintendente ainda não enviou a pauta.</p>
        {onRefresh ? <Button variant="outline" size="sm" onClick={() => void onRefresh()}><RefreshCw className="h-4 w-4" /> Atualizar</Button> : null}
      </CardContent></Card>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      {/* iPad/tablet na horizontal: índice dos tópicos à esquerda, conteúdo à direita. */}
      <nav aria-label="Tópicos da pauta" className="hidden lg:block sticky top-16 max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl border bg-card p-2">
        <p className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tópicos</p>
        <button type="button" onClick={() => goTopic("__prayers")} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm active:bg-muted hover:bg-muted/60">
          <span className="flex-1 min-w-0 truncate">Orações e tempo</span>
        </button>
        {p.blocks.map((b) => {
          const n = numbered.get(b.id);
          if ((b.hidden || autoHidden(b, data.auto)) && !(isSc && building)) return null;
          return (
            <button key={b.id} type="button" onClick={() => goTopic(b.id)} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm active:bg-muted hover:bg-muted/60">
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1 text-[11px] font-bold text-primary shrink-0">{n ?? "–"}</span>
              <span className="flex-1 min-w-0 truncate">{b.title}</span>
            </button>
          );
        })}
      </nav>
    <div className="space-y-3 pb-24 min-w-0">
      {preparing ? (
        <div className="pt-safe sticky top-0 z-20 flex items-center gap-2 border-b bg-background/90 px-3 pb-2 backdrop-blur-xl">
          <button type="button" onClick={() => void switchMode("read")} aria-label="Fechar e ir para a Leitura" className="flex h-10 w-10 items-center justify-center rounded-full text-primary active:bg-muted shrink-0"><X className="h-5 w-5" /></button>
          <p className="flex-1 min-w-0 truncate text-center text-[15px] font-semibold">Preparar a pauta</p>
          <Button size="sm" className="rounded-full shrink-0" onClick={() => void onSave("read")} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar
          </Button>
        </div>
      ) : null}
      {isSc && !offline ? (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <div className="grid grid-cols-3 gap-0.5 rounded-full bg-muted p-0.5 text-xs font-semibold" role="tablist" aria-label="Modo da pauta">
                {([["read", "Leitura", BookOpenCheck], ["prepare", "Preparar", Pencil], ["build", "Montar", Hammer]] as const).map(([m, lbl, Icon]) => (
                  <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => void switchMode(m)}
                    className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-full px-2 py-1.5 transition-colors ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
                    <Icon className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{lbl}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setTplOpen(true)} aria-label="Modelos" className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-primary shrink-0"><Layers className="h-4 w-4" /></button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {mode === "read" ? "Pauta pronta. Use o lápis para escrever nos campos só seus." : mode === "prepare" ? "Escreva, cole links e anexe. Ao salvar, a pauta vai para a Leitura." : "Tópicos, cartões, ordem e quem vê cada parte."}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="pt-4 space-y-2">
          <header className="text-center space-y-0.5">
            <h2 className="text-lg font-bold tracking-tight break-words">{p.headerTitle || "Pauta"}</h2>
            {p.headerVerses ? <BibleRefText text={p.headerVerses} className="text-[11px] text-primary break-words" /> : null}
            <p className="text-xs text-muted-foreground break-words">
              {[data.congregation, formatMeetingWhen(view.meetingAt), data.auto.location].filter(Boolean).join(" · ")}
            </p>
          </header>

          <Button type="button" variant="outline" className="w-full" onClick={() => setFull(true)}><Maximize2 className="h-4 w-4" />Tela cheia</Button>
          {onRefresh ? (
            <div className="flex items-center gap-2 pt-1">
              <span className="flex-1 min-w-0 truncate text-[11px] text-muted-foreground">
                {offline ? "Cópia do aparelho" : data.loadedAt ? `Atualizada às ${new Date(data.loadedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                {reading ? ` · ${responseTotal} resposta${responseTotal === 1 ? "" : "s"} dos anciãos` : ""}
              </span>
              <Button type="button" variant="ghost" size="sm" className="shrink-0 text-primary" onClick={() => void refresh()} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Atualizar pauta
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isSc && building ? (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cabeçalho da pauta</p>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Título</Label>
              <Input value={p.headerTitle} onChange={(e) => patch({ headerTitle: e.target.value })} maxLength={200} placeholder="Pauta – Reunião com Anciãos" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Versículos (pode deixar em branco)</Label>
              <Input value={p.headerVerses} onChange={(e) => patch({ headerVerses: e.target.value })} maxLength={600} placeholder="Isa 50:4; Pro 18:13,17" />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isSc && !offline && (data.unsent || dirty) ? (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground"><span className="h-2 w-2 shrink-0 rounded-full bg-primary" />{data.publishedAt ? "Alterações não enviadas aos anciãos." : "Os anciãos ainda não veem esta pauta. Toque em “Enviar pauta para os anciãos”."}</div>
      ) : null}
      {offline ? (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2 text-xs text-muted-foreground"><WifiOff className="h-4 w-4 shrink-0" />Sem internet: mostrando a pauta guardada neste aparelho (somente leitura).</div>
      ) : locked && !isSc ? (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2 text-xs text-muted-foreground"><Lock className="h-4 w-4 shrink-0" />O prazo para preencher terminou. A pauta fica guardada neste aparelho para a reunião.</div>
      ) : p.deadlineAt && !isSc ? (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2 text-xs text-muted-foreground"><CalendarClock className="h-4 w-4 shrink-0" />Preencha até {formatMeetingWhen(p.deadlineAt)}.</div>
      ) : null}


      <Card id="agenda-topic-__prayers" className="overflow-hidden scroll-mt-20">
        <button type="button" onClick={() => toggle("__prayers")} aria-expanded={!closed.__prayers} className="flex w-full items-center gap-2 px-4 py-3 text-left min-w-0">
          <span className="flex-1 min-w-0 font-semibold">Orações e tempo</span>
          <span className="text-xs text-muted-foreground shrink-0">{view.totalMinutes} min</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${closed.__prayers ? "" : "rotate-180"}`} />
        </button>
        {!closed.__prayers ? (
        <CardContent className="pt-0 space-y-1">
          <div className="flex justify-end">{accessBadge(p.prayersPerm, (prayersPerm) => patch({ prayersPerm }), "Orações e ata", canPerm(p.prayersPerm))}</div>
          {isSc && !offline ? (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {([["showPrayerRec", "Oração recomendação"], ["showMinutes", "Ata"]] as const).map(([k, lbl]) => (
                <button key={k} type="button" role="switch" aria-checked={p[k]} onClick={() => patch({ [k]: !p[k] } as Partial<AgendaPayload>)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${p[k] ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                  <span className={`h-3 w-5 rounded-full p-0.5 ${p[k] ? "bg-primary" : "bg-muted-foreground/40"}`}><span className={`block h-2 w-2 rounded-full bg-background transition-transform ${p[k] ? "translate-x-2" : ""}`} /></span>{lbl}
                </button>
              ))}
              {p.showPrayerRec && !data.auto.recommendations.length ? <span className="text-[11px] text-muted-foreground self-center">Sem recomendações: oração recomendação oculta.</span> : null}
            </div>
          ) : null}
          {([["Oração inicial", "prayerOpen", data.auto.openingPrayer ?? ""], ["Oração recomendação", "prayerRec", ""], ["Oração final", "prayerClose", data.auto.closingPrayer ?? ""], ["Ata [Sfg 1:6]", "minutesTaker", ""]] as const)
            .filter(([, k]) => (k === "prayerRec" ? prayerRecShown(p, data.auto) : k === "minutesTaker" ? p.showMinutes : true)).map(([label, k, fb]) => (
            <div key={k} className="flex items-center gap-2 min-w-0 py-1">
              <Label className="w-32 shrink-0 text-xs text-muted-foreground">{label}</Label>
              {canPerm(p.prayersPerm)
                ? <Input value={p[k]} placeholder={fb || "—"} onChange={(e) => patch({ [k]: e.target.value } as Partial<AgendaPayload>)} className="h-9" maxLength={120} />
                : <span className="text-sm break-words">{p[k] || fb || "—"}</span>}
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-2 mt-1">
            <span className="text-xs text-muted-foreground">Tempo total</span>
            <span className="text-sm font-semibold">{view.totalMinutes} min</span>
          </div>
          {isSc && !offline ? (
            <div className="border-t pt-2 mt-1 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />Dia e horário</Label>
              <div className="inline-flex rounded-full bg-muted p-0.5 text-xs font-medium" role="group">
                <button type="button" aria-pressed={!p.meetingAtOverride} onClick={() => patch({ meetingAtOverride: null })}
                  className={`rounded-full px-3 py-1 ${!p.meetingAtOverride ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Da agenda</button>
                <button type="button" aria-pressed={!!p.meetingAtOverride} onClick={() => patch({ meetingAtOverride: wallClock(data.auto.meetingAt ? toLocalInput(data.auto.meetingAt) : `${data.startDate ?? new Date().toISOString().slice(0, 10)}T19:00`) })}
                  className={`rounded-full px-3 py-1 ${p.meetingAtOverride ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Manual</button>
              </div>
              {p.meetingAtOverride ? (
                <>
                  <Input type="datetime-local" value={p.meetingAtOverride} className="h-9"
                    onChange={(e) => { const v = wallClock(e.target.value); if (v) patch({ meetingAtOverride: v }); }} />
                  <p className="text-[11px] text-muted-foreground">Só vale para esta pauta; a aba "Reunião anciãos e servos" não muda.</p>
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground">{formatMeetingWhen(data.auto.meetingAt) || "A agenda ainda não tem dia e horário."}</p>
              )}
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
            </div>
          ) : null}
        </CardContent>
        ) : null}
      </Card>

      {p.blocks.map((b, i) => {
        const hiddenNow = b.hidden || autoHidden(b, data.auto);
        if (hiddenNow && !(isSc && building)) return null;
        const n = numbered.get(b.id);
        const open = building || !closed[b.id];
        return (
          <Card key={b.id} id={`agenda-topic-${b.id}`} className={`overflow-hidden scroll-mt-20 ${hiddenNow ? "opacity-60" : ""}`}>
            <button type="button" onClick={() => !building && toggle(b.id)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-left min-w-0">
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-bold text-primary shrink-0">{n ?? "–"}</span>
              <span className="flex-1 min-w-0 font-semibold break-words">{b.title}</span>
              {b.minutes ? <span className="text-xs text-muted-foreground shrink-0">{b.minutes} min</span> : null}
              {!building ? <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} /> : null}
            </button>
            <CardContent className={open ? "space-y-3 pt-0" : "hidden"}>
              {isSc && building ? structureControls(b, i) : b.cards.map((c) => cardView(c, n ?? 0))}
            </CardContent>
          </Card>
        );
      })}

      {isSc && building ? (
        <Button type="button" variant="outline" className="w-full border-dashed" onClick={addBlock}><Plus className="h-4 w-4" />Adicionar tópico</Button>
      ) : null}

      <Sheet open={!!addTo} onOpenChange={(v) => { if (!v) setAddTo(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-8">
          <SheetHeader><SheetTitle>Escolha o estilo do cartão</SheetTitle></SheetHeader>
          <div className="mt-3 divide-y rounded-2xl border">
            {CARD_TYPES.map((t) => {
              const Icon = CARD_ICON[t];
              return (
                <button key={t} type="button" onClick={() => addTo && addCard(addTo, t)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <Icon className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm font-medium">{CARD_TYPE_LABEL[t]}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <div className="sticky bottom-3 z-10 flex gap-2 rounded-2xl border bg-background/95 p-2 shadow-lg backdrop-blur">
        <Button variant="outline" className="flex-1" onClick={() => (isSc ? setPdfOpen(true) : void onExport(p.pdfStyle))} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} PDF
        </Button>
        {!offline ? (
          <Button className="flex-1" onClick={() => void onSave(preparing ? "read" : undefined)} disabled={busy || (!dirty && !preparing)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {dirty ? "Salvar" : "Salvo"}
          </Button>
        ) : null}
      </div>
      {!full && !preparing && !building ? <AgendaTopicPill visitId={data.visitId} list={numberedBlocks(p.blocks, data.auto)} onGoTopic={goTopic} /> : null}
      {isSc && onPublish && !preparing ? (
        <div className="space-y-1 text-center">
          <Button className="w-full" variant={data.unsent || dirty || !data.publishedAt ? "default" : "outline"} onClick={() => setPublishOpen(true)} disabled={offline || publishing}>
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar pauta para os anciãos
          </Button>
          <p className="text-[11px] text-muted-foreground">{offline ? "Conecte-se para enviar." : data.publishedAt ? `Último envio: ${fmtSent(data.publishedAt)}` : "Ainda não enviada."}</p>
        </div>
      ) : null}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Enviar pauta aos anciãos?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Eles passarão a ver esta versão. Itens “Só você vê” continuam ocultos.{dirty ? " As alterações serão salvas antes." : ""}</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPublishOpen(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={() => void onSend()} disabled={publishing}>{publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Enviar</Button>
          </div>
        </DialogContent>
      </Dialog>

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
          header={{ title: p.headerTitle, verses: p.headerVerses }} onHeader={(h) => patch({ headerTitle: h.title, headerVerses: h.verses })}
          onApply={(blocks) => { patch({ blocks }); setBuilding(true); toast.success("Modelo aplicado. Toque em Salvar para gravar."); }} />
      ) : null}

      {full ? (
        <Suspense fallback={null}>
          <ElderAgendaFullscreen data={data} payload={p} isSc={isSc} onClose={() => setFull(false)} />
        </Suspense>
      ) : null}
      <Sheet open={!!fieldEdit} onOpenChange={(v) => { if (!v) setFieldEdit(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-8 md:mx-auto md:max-w-xl md:rounded-3xl md:bottom-6">
          <SheetHeader><SheetTitle className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-primary" />{fieldEdit?.title}</SheetTitle></SheetHeader>
          {fieldEdit ? (
            <div className="mt-3 space-y-3">
              <Suspense fallback={<div className="h-24 rounded-lg bg-muted/40 animate-pulse" />}>
                <RichNoteEditor value={fieldEdit.value} onChange={(html) => setFieldEdit((f) => (f ? { ...f, value: html } : f))} placeholder="Escreva aqui" minHeight="120px" maxHeight="45vh" />
              </Suspense>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setFieldEdit(null)}>Cancelar</Button>
                <Button onClick={() => { fieldEdit.apply(fieldEdit.value); setFieldEdit(null); }}><Save className="h-4 w-4" />Salvar</Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
      <AttachmentViewerHost />
    </div>
    </div>
  );
}
