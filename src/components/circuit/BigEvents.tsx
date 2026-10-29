// Pílula "Grandes Eventos" (Circuito): assembleias e reuniões especiais, oradores,
// convites com PIN (link único por evento) e status ao vivo.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, Circle, Copy, Download, MoreHorizontal, Plus, RefreshCw, Trash2, Upload, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { parseEtim, type EtimPart } from "@/lib/big-events/etim-import";
import { buildInviteText, formatEventDate, generatePin, hashPin, isValidPin } from "@/lib/big-events/invite";
import { htmlToDocx, safeFileName, DOCX_MIME } from "@/lib/docx-export";
import { saveBlob } from "@/lib/share";
import type { Database } from "@/integrations/supabase/types";

type EventRow = Database["public"]["Tables"]["circuit_big_events"]["Row"];
type PartRow = Database["public"]["Tables"]["circuit_big_event_parts"]["Row"];

const OPEN_KEY = "bigEvents.open";
const pinKey = (partId: string) => `bigEvents.pin.${partId}`;
const readPin = (id: string) => { try { return localStorage.getItem(pinKey(id)); } catch { return null; } };
const writePin = (id: string, pin: string) => { try { localStorage.setItem(pinKey(id), pin); } catch { /* */ } };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const origin = () => (typeof window !== "undefined" && /^https?:/.test(window.location.origin) ? window.location.origin : "https://visitasc.com.br");

export function BigEvents({ elders }: { elders: Array<{ name: string; congregation: string }> }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [parts, setParts] = useState<PartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [pastOpen, setPastOpen] = useState(false);
  const [dialog, setDialog] = useState<{ parts: EtimPart[] | null } | null>(null);
  const [form, setForm] = useState({ name: "", event_type: "assembly", event_date: "", location: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: ev }, { data: pt }] = await Promise.all([
      supabase.from("circuit_big_events").select("*").order("event_date", { ascending: true }),
      supabase.from("circuit_big_event_parts").select("*").order("sort_order"),
    ]);
    setEvents(ev ?? []); setParts(pt ?? []); setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
    try { const raw = localStorage.getItem(OPEN_KEY); if (raw) setOpen(new Set(JSON.parse(raw) as string[])); } catch { /* */ }
  }, [load]);

  // Status ao vivo: quando o orador responde, a parte muda aqui sozinha.
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`big-parts-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "circuit_big_event_parts" }, (payload) => {
        const row = payload.new as PartRow;
        setParts((ps) => ps.map((p) => (p.id === row.id ? { ...p, status: row.status, responded_at: row.responded_at, decline_reason: row.decline_reason } : p)));
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user]);

  const toggle = (id: string) => setOpen((prev) => {
    const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id);
    try { localStorage.setItem(OPEN_KEY, JSON.stringify([...n])); } catch { /* */ }
    return n;
  });

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => !e.event_date || e.event_date >= today);
  const past = events.filter((e) => e.event_date && e.event_date < today).reverse();

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const ps = parseEtim(await f.text());
      setForm({ name: f.name.replace(/\.etim$/i, "").replace(/_/g, " "), event_type: "assembly", event_date: "", location: "" });
      setDialog({ parts: ps });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Arquivo inválido."); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const createEvent = async () => {
    if (!user || !form.name.trim()) { toast.error("Informe o nome do evento."); return; }
    const { data: ev, error } = await supabase.from("circuit_big_events").insert({
      superintendent_id: user.id, name: form.name.trim().slice(0, 200), event_type: form.event_type,
      event_date: form.event_date || null, location: form.location.trim() || null,
    }).select("*").single();
    if (error || !ev) { toast.error("Não foi possível criar o evento."); return; }
    const ps = dialog?.parts ?? [];
    if (ps.length) {
      const { error: pe } = await supabase.from("circuit_big_event_parts").insert(ps.map((p, i) => ({ ...p, event_id: ev.id, superintendent_id: user.id, sort_order: i })));
      if (pe) toast.error("Evento criado, mas as partes não foram salvas.");
    }
    setDialog(null);
    toggle(ev.id);
    await load();
    toast.success(ps.length ? `${ps.length} partes importadas` : "Evento criado");
  };

  const patchEvent = async (id: string, patch: Partial<EventRow>) => {
    setEvents((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    const { error } = await supabase.from("circuit_big_events").update(patch).eq("id", id);
    if (error) toast.error("Não foi possível salvar.");
  };
  const patchPart = async (id: string, patch: Partial<PartRow>) => {
    setParts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const { error } = await supabase.from("circuit_big_event_parts").update(patch).eq("id", id);
    if (error) { toast.error(error.code === "23505" ? "Este PIN já está em uso neste evento." : "Não foi possível salvar."); return false; }
    return true;
  };
  const removeEvent = async (id: string) => {
    if (!confirm("Apagar este evento e todas as partes?")) return;
    await supabase.from("circuit_big_events").delete().eq("id", id);
    await load();
  };
  const addPart = async (ev: EventRow) => {
    if (!user) return;
    const n = parts.filter((p) => p.event_id === ev.id).length;
    await supabase.from("circuit_big_event_parts").insert({ event_id: ev.id, superintendent_id: user.id, sort_order: n, theme: "Nova parte" });
    await load();
  };

  /** Grava um PIN (digitado ou gerado). Recusa repetido no mesmo evento. */
  const setPin = async (ev: EventRow, part: PartRow, pin: string) => {
    if (!isValidPin(pin)) { toast.error("O PIN precisa ter de 4 a 6 números."); return null; }
    const hash = await hashPin(pin, ev.public_token);
    if (parts.some((p) => p.event_id === ev.id && p.id !== part.id && p.pin_hash === hash)) { toast.error("Este PIN já está em uso neste evento."); return null; }
    const ok = await patchPart(part.id, { pin_hash: hash, status: "pending", responded_at: null, decline_reason: null });
    if (!ok) return null;
    writePin(part.id, pin);
    return pin;
  };
  const newPin = async (ev: EventRow, part: PartRow) => {
    for (let i = 0; i < 5; i++) {
      const pin = generatePin(6);
      const hash = await hashPin(pin, ev.public_token);
      if (!parts.some((p) => p.event_id === ev.id && p.pin_hash === hash)) return setPin(ev, part, pin);
    }
    return null;
  };

  const copyInvite = async (ev: EventRow, part: PartRow) => {
    let pin = part.pin_hash ? readPin(part.id) : null;
    if (!pin) { pin = await newPin(ev, part); if (!pin) return; toast.info("PIN criado para este convite."); }
    const evParts = parts.filter((p) => p.event_id === ev.id);
    const text = buildInviteText(ev, part, evParts, pin, origin());
    try { await navigator.clipboard.writeText(text); toast.success("Convite copiado"); } catch { toast.error("Não foi possível copiar."); }
    if (!part.email_sent) void patchPart(part.id, { email_sent: true });
  };

  const exportDocx = async (ev: EventRow) => {
    const evParts = parts.filter((p) => p.event_id === ev.id && p.assigned_to === "speaker" && p.speaker_name?.trim());
    if (!evParts.length) { toast.info("Nenhuma parte com orador definido."); return; }
    const all = parts.filter((p) => p.event_id === ev.id);
    const blocks: string[] = [];
    for (const p of evParts) {
      let pin = p.pin_hash ? readPin(p.id) : null;
      if (!pin) pin = await newPin(ev, p);
      const txt = buildInviteText(ev, p, all, pin, origin());
      blocks.push(`<p><b>${esc(p.speaker_name ?? "")}</b></p>` + txt.split("\n").map((l) => `<p>${esc(l)}</p>`).join(""));
    }
    try {
      const blob = await htmlToDocx(ev.name, blocks.join('<hr data-page-break="1">'));
      await saveBlob(blob, { filename: `${safeFileName(`Convites ${ev.name}`, "convites")}.docx`, mimeType: DOCX_MIME });
    } catch (e) { toast.error(String(e instanceof Error ? e.message : e)); }
  };

  const renderEvent = (ev: EventRow) => {
    const evParts = parts.filter((p) => p.event_id === ev.id).sort((a, b) => a.sort_order - b.sort_order);
    const speakers = evParts.filter((p) => p.assigned_to === "speaker");
    const conf = speakers.filter((p) => p.status === "confirmed").length;
    const decl = speakers.filter((p) => p.status === "declined").length;
    const isOpen = open.has(ev.id);
    return (
      <Card key={ev.id} className="shadow-card">
        <button type="button" onClick={() => toggle(ev.id)} aria-expanded={isOpen} className="flex w-full items-center gap-2 px-4 py-3 text-left">
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{ev.name}</span>
            <span className="block text-xs text-muted-foreground">{[formatEventDate(ev.event_date), ev.location].filter(Boolean).join(" · ")}</span>
          </span>
          <span className="text-xs text-muted-foreground">{conf}/{speakers.length}{decl ? ` · ${decl}✕` : ""}</span>
        </button>
        <div hidden={!isOpen} className="space-y-3 px-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" defaultValue={ev.event_date ?? ""} onBlur={(e) => e.target.value !== (ev.event_date ?? "") && patchEvent(ev.id, { event_date: e.target.value || null })} aria-label="Data" />
            <Input defaultValue={ev.location ?? ""} placeholder="Local" onBlur={(e) => e.target.value !== (ev.location ?? "") && patchEvent(ev.id, { location: e.target.value.trim() || null })} />
          </div>
          <div>
            <Label className="text-xs">Informações adicionais (vão em todos os convites)</Label>
            <Textarea className="mt-1" rows={2} maxLength={2000} defaultValue={ev.extra_info ?? ""}
              onBlur={(e) => e.target.value !== (ev.extra_info ?? "") && patchEvent(ev.id, { extra_info: e.target.value.trim() || null })} />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => exportDocx(ev)}><Download className="h-3.5 w-3.5" />Exportar convites (Word)</Button>
            <span className="flex-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Opções do evento"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => addPart(ev)}><Plus className="mr-2 h-4 w-4" />Nova parte</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => removeEvent(ev.id)}><Trash2 className="mr-2 h-4 w-4" />Apagar evento</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ul className="divide-y rounded-lg border">
            {evParts.map((p) => <PartItem key={p.id} ev={ev} part={p} onPatch={patchPart} onSetPin={setPin} onNewPin={newPin} onCopy={copyInvite} />)}
          </ul>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-3">
      <datalist id="big-events-elders">
        {elders.filter((e) => e.name).map((e) => <option key={`${e.name}-${e.congregation}`} value={e.name}>{e.congregation}</option>)}
      </datalist>
      <div className="flex items-center justify-end gap-2">
        <input ref={fileRef} type="file" accept=".etim,application/json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button size="sm" variant="outline" className="gap-1" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5" />Importar .etim</Button>
        <Button size="sm" className="gap-1" onClick={() => { setForm({ name: "", event_type: "special", event_date: "", location: "" }); setDialog({ parts: null }); }}><Plus className="h-3.5 w-3.5" />Novo</Button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Carregando…</p>
        : !events.length ? <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum evento ainda. Importe o programa (.etim) ou crie um evento.</Card>
        : <div className="space-y-2">{upcoming.map(renderEvent)}</div>}
      {past.length > 0 && (
        <div>
          <button type="button" onClick={() => setPastOpen((v) => !v)} className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${pastOpen ? "" : "-rotate-90"}`} />Anteriores ({past.length})
          </button>
          <div hidden={!pastOpen} className="mt-2 space-y-2">{past.map(renderEvent)}</div>
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{dialog?.parts ? `Importar programa (${dialog.parts.length} partes)` : "Novo evento"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Tipo</Label>
              <div className="mt-1 flex gap-1">
                {[["assembly", "Assembleia"], ["special", "Reunião especial"], ["other", "Outro"]].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setForm({ ...form, event_type: v })}
                    className={`flex-1 rounded-full border px-2 py-1 text-xs ${form.event_type === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Data</Label><Input className="mt-1" type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
              <div><Label>Local</Label><Input className="mt-1" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={createEvent}>{dialog?.parts ? "Importar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PartItem({ ev, part, onPatch, onSetPin, onNewPin, onCopy }: {
  ev: EventRow; part: PartRow;
  onPatch: (id: string, p: Partial<PartRow>) => Promise<boolean>;
  onSetPin: (ev: EventRow, p: PartRow, pin: string) => Promise<string | null>;
  onNewPin: (ev: EventRow, p: PartRow) => Promise<string | null>;
  onCopy: (ev: EventRow, p: PartRow) => Promise<void>;
}) {
  const [pin, setPinState] = useState("");
  useEffect(() => { setPinState(part.pin_hash ? readPin(part.id) ?? "" : ""); }, [part.id, part.pin_hash]);
  const [showReason, setShowReason] = useState(false);
  const head = useMemo(() => [part.part_time, part.outline_number ? `Nº${part.outline_number}` : null].filter(Boolean).join(" "), [part]);
  const tag = part.assigned_to === "co" ? "SC" : part.assigned_to === "branch" ? "Filial" : null;

  return (
    <li className="space-y-2 p-3 text-sm">
      <div className="flex items-start gap-2">
        <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">{head}</span>
        <span className="min-w-0 flex-1">
          <span className="block">{part.theme}</span>
          <span className="block text-xs text-muted-foreground">{[part.part_type_label, part.duration_min ? `${part.duration_min} min` : null, part.symposium ? "Simpósio" : null].filter(Boolean).join(" · ")}</span>
        </span>
        {tag && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">{tag}</span>}
      </div>
      {part.assigned_to === "speaker" && (
        <div className="space-y-2 pl-16">
          <Input list="big-events-elders" placeholder="Orador" defaultValue={part.speaker_name ?? ""}
            onBlur={(e) => e.target.value.trim() !== (part.speaker_name ?? "") && onPatch(part.id, { speaker_name: e.target.value.trim() || null })} />
          <div className="flex items-center gap-2">
            <Label className="text-xs">PIN</Label>
            <Input inputMode="numeric" maxLength={6} className="h-8 w-24 font-mono" value={pin}
              placeholder={part.pin_hash ? "••••" : "4-6 núm."}
              onChange={(e) => setPinState(e.target.value.replace(/\D/g, ""))}
              onBlur={() => { if (pin && pin !== readPin(part.id)) void onSetPin(ev, part, pin).then((r) => { if (!r) setPinState(readPin(part.id) ?? ""); }); }} />
            <Button size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs" onClick={() => onNewPin(ev, part).then((r) => r && setPinState(r))}><RefreshCw className="h-3.5 w-3.5" />Novo PIN</Button>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={part.show_next_speaker} onCheckedChange={(v) => onPatch(part.id, { show_next_speaker: v === true })} />
            Informar o nome do próximo orador?
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => onCopy(ev, part)}><Copy className="h-3.5 w-3.5" />Copiar convite</Button>
            <span className="flex items-center gap-1 text-xs">
              {part.status === "confirmed" ? <><CheckCircle2 className="h-4 w-4 text-primary" />Confirmado{part.responded_at ? ` ${new Date(part.responded_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}</>
                : part.status === "declined" ? <button type="button" onClick={() => setShowReason((v) => !v)} className="flex items-center gap-1 text-destructive"><XCircle className="h-4 w-4" />Recusado · ver motivo</button>
                : <><Circle className="h-4 w-4 text-muted-foreground" />Aguardando</>}
            </span>
          </div>
          {showReason && part.decline_reason && <p className="rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">{part.decline_reason}</p>}
        </div>
      )}
    </li>
  );
}
