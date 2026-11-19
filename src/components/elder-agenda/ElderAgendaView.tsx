// Tela da "Pauta – Reunião com Anciãos": mesmos tópicos do modelo do SC.
// Usada pelo SC (Programa da visita), anciãos com cadastro e o acesso "Corpo de anciãos".
// Cada bloco mostra quem pode editar; o servidor grava só o que o papel permite.
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { BookOpen, ChevronDown, FileDown, FileText, Loader2, Lock, PlayCircle, Save, Users, UserCog } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BibleRefText } from "@/components/bible/BibleRefText";
import { EXTERNAL_LINK_PROPS, handleExternalLinkClick } from "@/lib/external-link";
import { saveBlob } from "@/lib/share";
import {
  AGENDA_GROUP_LABEL, agendaView, canEdit, safeUrl,
  type AgendaAccess, type AgendaAuto, type AgendaGroup, type AgendaLinkKind, type AgendaPayload, type AgendaPermissions, type AgendaRole,
} from "@/lib/elder-agenda/agenda";
import { AGENDA_VERSES } from "@/lib/elder-agenda/agenda-pdf";

const RichNoteEditor = lazy(() => import("@/components/notes/RichNoteEditor").then((m) => ({ default: m.RichNoteEditor })));

export interface AgendaData {
  visitId: string; congregation: string; range: string; role: AgendaRole;
  payload: AgendaPayload; permissions: AgendaPermissions; auto: AgendaAuto;
}
export type AgendaSaver = (payload: AgendaPayload, permissions?: AgendaPermissions) => Promise<{ ok: boolean; error?: string }>;

const ACCESS_NEXT: Record<AgendaAccess, AgendaAccess> = { sc: "coordinator", coordinator: "all", all: "sc" };
const ACCESS_UI: Record<AgendaAccess, { label: string; icon: typeof Lock }> = {
  sc: { label: "Só SC", icon: Lock }, coordinator: { label: "Coordenador", icon: UserCog }, all: { label: "Todos", icon: Users },
};
const LINK_UI: Record<AgendaLinkKind, { label: string; icon: typeof BookOpen }> = {
  book: { label: "Leitura", icon: BookOpen }, article: { label: "Artigo", icon: FileText }, video: { label: "Vídeo", icon: PlayCircle },
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

export async function exportAgendaPdf(data: AgendaData, payload: AgendaPayload) {
  const { renderAgendaPdf } = await import("@/lib/elder-agenda/agenda-pdf");
  const blob = await renderAgendaPdf({ payload, auto: data.auto, congregation: data.congregation, range: data.range });
  await saveBlob(blob, { filename: `pauta-reuniao-anciaos-${data.visitId.slice(0, 8)}.pdf`, mimeType: "application/pdf" });
}

export function AgendaLinkRow({ kind, label, url }: { kind: AgendaLinkKind; label: string; url: string }) {
  const { icon: Icon, label: kindLabel } = LINK_UI[kind];
  return (
    <div className="flex items-center gap-2 min-w-0 py-1.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
      <span className="flex-1 min-w-0 text-sm break-words">{label || <span className="text-muted-foreground">{kindLabel}</span>}</span>
      {url ? (
        <a href={url} {...EXTERNAL_LINK_PROPS} onClick={(e) => handleExternalLinkClick(e, url)} className="text-primary text-sm font-medium shrink-0 hover:underline">
          Abrir
        </a>
      ) : null}
    </div>
  );
}

export function ElderAgendaView({ data, save }: { data: AgendaData; save: AgendaSaver }) {
  const [p, setP] = useState<AgendaPayload>(data.payload);
  const [perms, setPerms] = useState<AgendaPermissions>(data.permissions);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const isSc = data.role === "sc";
  const openKey = "visita-sc:agenda-open";
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  useEffect(() => { try { setClosed(JSON.parse(localStorage.getItem(openKey) || "{}")); } catch { /* sem preferência */ } }, []);
  const toggle = (id: string) => setClosed((cur) => { const next = { ...cur, [id]: !cur[id] }; try { localStorage.setItem(openKey, JSON.stringify(next)); } catch { /* cheio */ } return next; });
  const can = (g: AgendaGroup) => canEdit(data.role, perms[g]);
  const view = useMemo(() => agendaView(p, data.auto), [p, data.auto]);
  const set = <K extends keyof AgendaPayload>(k: K, v: AgendaPayload[K]) => { setP((cur) => ({ ...cur, [k]: v })); setDirty(true); };

  const onSave = async () => {
    setBusy(true);
    try {
      const r = await save(p, isSc ? perms : undefined);
      if (r.ok) { setDirty(false); toast.success("Pauta salva."); } else toast.error(r.error ?? "Não foi possível salvar.");
    } catch { toast.error("Sem conexão. Tente salvar de novo."); }
    finally { setBusy(false); }
  };
  const onExport = async () => {
    setExporting(true);
    try { await exportAgendaPdf(data, p); } catch { toast.error("Não foi possível gerar o PDF."); } finally { setExporting(false); }
  };

  const access = (g: AgendaGroup) => {
    const a = ACCESS_UI[perms[g]];
    const Icon = a.icon;
    if (!isSc) return can(g) ? null : <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Lock className="h-3 w-3" />Leitura</span>;
    return (
      <button
        type="button"
        onClick={() => { setPerms((cur) => ({ ...cur, [g]: ACCESS_NEXT[cur[g]] })); setDirty(true); }}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shrink-0"
        aria-label={`Quem edita ${AGENDA_GROUP_LABEL[g]}: ${a.label}. Tocar para trocar.`}
      >
        <Icon className="h-3 w-3" />{a.label}
      </button>
    );
  };

  const rich = (g: AgendaGroup, field: "scInfo" | "reco" | "eldersInfo" | "letters" | "localNotes" | "scReading", placeholder: string, minLines = 3) =>
    can(g) ? (
      <Suspense fallback={<div className="h-24 rounded-lg bg-muted/40 animate-pulse" />}>
        <RichNoteEditor value={p[field]} onChange={(html) => set(field, html)} placeholder={placeholder} minHeight={`${minLines * 28}px`} maxHeight="55vh" />
      </Suspense>
    ) : p[field] ? <BibleRefText text={p[field]} className="text-sm" /> : <p className="text-sm text-muted-foreground italic">—</p>;

  const section = (id: string, title: string, g: AgendaGroup, minutes: number, onMinutes: (n: number) => void, children: ReactNode) => {
    const open = !closed[id];
    return (
      <Card key={id} className="overflow-hidden">
        <button type="button" onClick={() => toggle(id)} aria-expanded={open}
          className="flex w-full items-center gap-2 px-4 py-3 text-left min-w-0">
          <span className="flex-1 min-w-0 font-semibold text-destructive break-words">{title}</span>
          <span className="text-xs text-muted-foreground shrink-0">{minutes} min</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <CardContent className={open ? "space-y-3 pt-0" : "hidden"}>
          <div className="flex items-center justify-between gap-2">
            {can(g) ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">Tempo
                <Input type="number" inputMode="numeric" min={0} max={240} value={minutes} onChange={(e) => onMinutes(Number(e.target.value) || 0)} className="h-8 w-16" />
                min
              </label>
            ) : <span />}
            {access(g)}
          </div>
          {children}
        </CardContent>
      </Card>
    );
  };

  const prayerField = (label: string, k: "prayerOpen" | "prayerRec" | "prayerClose" | "minutesTaker", fallback?: string) => (
    <div className="flex items-center gap-2 min-w-0 py-1">
      <Label className="w-32 shrink-0 text-xs text-muted-foreground">{label}</Label>
      {can("prayers")
        ? <Input value={p[k]} placeholder={fallback || "—"} onChange={(e) => set(k, e.target.value)} className="h-9" maxLength={120} />
        : <span className="text-sm break-words">{p[k] || fallback || "—"}</span>}
    </div>
  );

  return (
      <div className="space-y-3 pb-24">
        <header className="text-center space-y-0.5">
          <h2 className="text-lg font-bold tracking-tight">Pauta – Reunião com Anciãos</h2>
          <p className="text-[11px] text-primary break-words">{AGENDA_VERSES}</p>
          <p className="text-xs text-muted-foreground break-words">
            {[data.congregation, formatMeetingWhen(data.auto.meetingAt), data.auto.location].filter(Boolean).join(" · ")}
          </p>
        </header>

        <Card>
          <CardContent className="pt-4 space-y-1">
            <div className="flex justify-end">{access("prayers")}</div>
            {prayerField("Oração inicial", "prayerOpen", data.auto.openingPrayer ?? "")}
            {prayerField("Oração recomendação", "prayerRec")}
            {prayerField("Oração final", "prayerClose", data.auto.closingPrayer ?? "")}
            {prayerField("Ata [Sfg 1:6]", "minutesTaker")}
            <div className="flex items-center justify-between border-t pt-2 mt-1">
              <span className="text-xs text-muted-foreground">Tempo total</span>
              <span className="text-sm font-semibold">{view.totalMinutes} min</span>
            </div>
          </CardContent>
        </Card>

        {section("enc", "Encorajamentos e conselhos", "enc", p.encMinutes, (n) => set("encMinutes", n), <>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tema / Assunto</Label>
            {can("enc") ? <Input value={p.encTheme} placeholder={data.auto.theme ?? ""} onChange={(e) => set("encTheme", e.target.value)} maxLength={300} /> : <p className="text-sm break-words">{view.encTheme || "—"}</p>}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Informações do SC</Label>{access("scInfo")}</div>
            {rich("scInfo", "scInfo", "Informações do SC")}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Recomendações para assistir, recapitular e meditar</Label>{access("reco")}</div>
            {rich("reco", "reco", "Recomendações", 2)}
            <div className="divide-y rounded-lg border px-3">
              {p.links.map((l, i) => can("reco") ? (
                <div key={l.kind} className="py-2 space-y-1.5">
                  <span className="text-xs text-muted-foreground">{LINK_UI[l.kind].label}</span>
                  <Input value={l.label} placeholder="Título" onChange={(e) => set("links", p.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} maxLength={300} />
                  <Input value={l.url} placeholder="https://www.jw.org/..." inputMode="url"
                    onChange={(e) => set("links", p.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                    onBlur={(e) => set("links", p.links.map((x, j) => (j === i ? { ...x, url: safeUrl(e.target.value) } : x)))} />
                </div>
              ) : <AgendaLinkRow key={l.kind} {...l} />)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Informações adicionais dos anciãos sobre a necessidade local</Label>{access("eldersInfo")}</div>
            {rich("eldersInfo", "eldersInfo", "Escreva aqui as informações dos anciãos", 4)}
          </div>
        </>)}

        {section("letters", "1) Revisão das últimas cartas da filial", "letters", p.lettersMinutes, (n) => set("lettersMinutes", n), <>
          {rich("letters", "letters", "Cartas a revisar", 2)}
        </>)}

        {section("recs", "2) Recomendações para anciãos e servos / cancelamentos", "recs", p.recsMinutes, (n) => set("recsMinutes", n), <>
          {data.auto.recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma recomendação lançada no Programa dos anciãos.</p>
          ) : data.auto.recommendations.map((r, i) => (
            <div key={r.id} className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-semibold break-words">2.{i + 1} — {r.title}</p>
              {r.info ? <p className="text-sm whitespace-pre-wrap break-words text-muted-foreground">{r.info}</p> : null}
              <Label className="text-xs text-muted-foreground">Informação partilhada pelo CA</Label>
              {can("recs") ? (
                <Suspense fallback={<div className="h-20 rounded-lg bg-muted/40 animate-pulse" />}>
                  <RichNoteEditor value={p.recNotes[r.id] ?? ""} onChange={(html) => set("recNotes", { ...p.recNotes, [r.id]: html })} placeholder="Informação do CA" minHeight="84px" maxHeight="45vh" />
                </Suspense>
              ) : p.recNotes[r.id] ? <BibleRefText text={p.recNotes[r.id]} className="text-sm" /> : <p className="text-sm text-muted-foreground italic">—</p>}
            </div>
          ))}
        </>)}

        {section("local", "5) Assunto local solicitado pelo corpo de anciãos", "local", p.localMinutes, (n) => set("localMinutes", n), <>
          {data.auto.local.map((l) => (
            <div key={l.id} className="rounded-lg border p-3 space-y-1 text-sm">
              <p className="break-words"><span className="text-muted-foreground">Quem indicou: </span>{l.suggestedBy || "—"}</p>
              <p className="break-words"><span className="text-muted-foreground">Tema: </span>{l.subject || "—"}</p>
              {l.sources ? <p className="break-words whitespace-pre-wrap"><span className="text-muted-foreground">Fontes: </span>{l.sources}</p> : null}
            </div>
          ))}
          <Label className="text-xs text-muted-foreground">Anotações</Label>
          {rich("local", "localNotes", "Anotações do assunto local", 2)}
          <div className="flex items-center justify-between pt-1"><Label className="text-xs text-destructive">Superintendente de Circuito – Recomendação de leitura e meditação</Label>{access("scReading")}</div>
          {rich("scReading", "scReading", "Leitura recomendada", 2)}
        </>)}

        <div className="sticky bottom-3 z-10 flex gap-2 rounded-2xl border bg-background/95 p-2 shadow-lg backdrop-blur">
          <Button variant="outline" className="flex-1" onClick={onExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} PDF
          </Button>
          <Button className="flex-1" onClick={onSave} disabled={busy || !dirty}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {dirty ? "Salvar" : "Salvo"}
          </Button>
        </div>
      </div>
  );
}

