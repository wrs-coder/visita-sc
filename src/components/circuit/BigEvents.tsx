// Pílula "Grandes Eventos" (Circuito): assembleias e reuniões especiais, oradores,
// convites com PIN (link único por evento) e status ao vivo.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, Circle, Copy, CopyPlus, Download, Link2, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, Upload, XCircle } from "lucide-react";
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
import { buildInviteText, formatEventDate, generatePin, hashPin, isValidPin, recomputeTimes, toMin, fromMin, PART_TYPES } from "@/lib/big-events/invite";
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
  const [form, setForm] = useState({ name: "", event_type: "assembly", event_date: "", location: "", link_mode: "pin" });
  const [editor, setEditor] = useState<{ ev: EventRow; part: PartRow | null; afterOrder: number | null } | null>(null);
  const [filter, setFilter] = useState<Record<string, "all" | "pending" | "declined">>({});
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
      setForm({ name: f.name.replace(/\.etim$/i, "").replace(/_/g, " "), event_type: "assembly", event_date: "", location: "", link_mode: "pin" });
      setDialog({ parts: ps });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Arquivo inválido."); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const createEvent = async () => {
    if (!user || !form.name.trim()) { toast.error("Informe o nome do evento."); return; }
    const { data: ev, error } = await supabase.from("circuit_big_events").insert({
      superintendent_id: user.id, name: form.name.trim().slice(0, 200), event_type: form.event_type,
      event_date: form.event_date || null, location: form.location.trim() || null, link_mode: form.link_mode,
      start_time: dialog?.parts?.find((p) => toMin(p.part_time) != null)?.part_time ?? null,
    }).select("*").single();
    if (error || !ev) { toast.error("Não foi possível criar o evento."); return; }
    const ps = dialog?.parts ?? [];
    if (ps.length) {
      const { error: pe } = await supabase.from("circuit_big_event_parts").insert(ps.map((p, i) => ({ ...p, event_id: ev.id, superintendent_id: user.id, sort_order: i, personal_token: form.link_mode === "personal" && p.assigned_to === "speaker" ? crypto.randomUUID() : null })));
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
  const evPartsOf = (evId: string) => parts.filter((p) => p.event_id === evId).sort((a, b) => a.sort_order - b.sort_order);

  /** Grava a parte (nova ou editada) e reorganiza ordem/horários. */
  const savePart = async (ev: EventRow, data: PartDraft, existing: PartRow | null, afterOrder: number | null) => {
    if (!user) return false;
    const list = evPartsOf(ev.id);
    const fields = {
      theme: data.theme.trim().slice(0, 300) || "Parte", outline_number: data.outline_number.trim() || null,
      part_type_label: data.part_type_label.trim() || null, symposium: data.part_type_label === "Simpósio",
      duration_min: data.duration_min ? Math.max(0, Math.min(600, Number(data.duration_min))) : null,
      time_mode: data.time_mode, part_time: data.time_mode === "manual" ? data.part_time || null : existing?.part_time ?? null,
      assigned_to: data.assigned_to,
    };
    let order: PartRow[];
    if (existing) {
      const { error } = await supabase.from("circuit_big_event_parts").update(fields).eq("id", existing.id);
      if (error) { toast.error("Não foi possível salvar."); return false; }
      order = list.map((p) => (p.id === existing.id ? { ...p, ...fields } : p));
    } else {
      const pos = afterOrder == null ? list.length : list.findIndex((p) => p.sort_order === afterOrder) + 1;
      const { data: row, error } = await supabase.from("circuit_big_event_parts").insert({
        ...fields, event_id: ev.id, superintendent_id: user.id, sort_order: pos,
        personal_token: ev.link_mode === "personal" && fields.assigned_to === "speaker" ? crypto.randomUUID() : null,
      }).select("*").single();
      if (error || !row) { toast.error("Não foi possível criar a parte."); return false; }
      order = [...list]; order.splice(pos, 0, row);
    }
    await persistOrder(ev, order);
    return true;
  };

  /** Regrava sort_order e horários automáticos de uma lista ordenada. */
  const persistOrder = async (ev: EventRow, ordered: PartRow[]) => {
    const withOrder = ordered.map((p, i) => ({ ...p, sort_order: i }));
    const times = new Map(recomputeTimes(ev.start_time, withOrder).map((t) => [t.id, t.part_time]));
    const changed = withOrder.filter((p) => {
      const old = parts.find((x) => x.id === p.id);
      return !old || old.sort_order !== p.sort_order || old.part_time !== times.get(p.id) || old.time_mode !== p.time_mode;
    });
    await Promise.all(changed.map((p) => supabase.from("circuit_big_event_parts").update({ sort_order: p.sort_order, part_time: times.get(p.id) ?? null }).eq("id", p.id)));
    await load();
  };

  const movePart = async (ev: EventRow, part: PartRow, dir: -1 | 1) => {
    const list = evPartsOf(ev.id);
    const i = list.findIndex((p) => p.id === part.id), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await persistOrder(ev, list);
  };

  const deletePart = async (ev: EventRow, part: PartRow) => {
    const warn = part.status === "confirmed" ? `\n\n${part.speaker_name ?? "O orador"} já confirmou esta parte.` : "";
    if (!confirm(`Excluir a parte "${part.theme}"?${warn}`)) return;
    const { error } = await supabase.from("circuit_big_event_parts").delete().eq("id", part.id);
    if (error) { toast.error("Não foi possível excluir."); return; }
    await persistOrder(ev, evPartsOf(ev.id).filter((p) => p.id !== part.id));
  };

  const recalc = async (ev: EventRow) => {
    if (toMin(ev.start_time) == null) { toast.info("Informe o início do programa (ex.: 09:40)."); return; }
    await persistOrder(ev, evPartsOf(ev.id));
    toast.success("Horários recalculados");
  };

  const changeLinkMode = async (ev: EventRow, mode: "pin" | "personal") => {
    if (ev.link_mode === mode) return;
    const sent = evPartsOf(ev.id).some((p) => p.email_sent);
    if (sent && !confirm("Os convites já enviados deixarão de funcionar e precisarão ser reenviados. Continuar?")) return;
    await patchEvent(ev.id, { link_mode: mode });
    if (mode === "personal") {
      await Promise.all(evPartsOf(ev.id).filter((p) => p.assigned_to === "speaker" && !p.personal_token)
        .map((p) => supabase.from("circuit_big_event_parts").update({ personal_token: crypto.randomUUID() }).eq("id", p.id)));
    }
    await load();
  };

  const newLink = async (part: PartRow) => {
    if (part.personal_token && !confirm("Gerar um novo link? O link anterior deixa de funcionar.")) return;
    const ok = await patchPart(part.id, { personal_token: crypto.randomUUID() });
    if (ok) toast.success("Novo link criado");
  };

  const duplicateEvent = async (ev: EventRow) => {
    if (!user) return;
    const { data: nev, error } = await supabase.from("circuit_big_events").insert({
      superintendent_id: user.id, name: `${ev.name} (cópia)`.slice(0, 200), event_type: ev.event_type,
      location: ev.location, extra_info: ev.extra_info, start_time: ev.start_time, link_mode: ev.link_mode,
    }).select("*").single();
    if (error || !nev) { toast.error("Não foi possível duplicar."); return; }
    const src = evPartsOf(ev.id);
    if (src.length) {
      await supabase.from("circuit_big_event_parts").insert(src.map((p) => ({
        event_id: nev.id, superintendent_id: user.id, sort_order: p.sort_order, part_time: p.part_time, duration_min: p.duration_min,
        theme: p.theme, outline_number: p.outline_number, part_type_id: p.part_type_id, part_type_label: p.part_type_label,
        symposium: p.symposium, talk_includes: p.talk_includes, assigned_to: p.assigned_to, time_mode: p.time_mode,
        personal_token: nev.link_mode === "personal" && p.assigned_to === "speaker" ? crypto.randomUUID() : null,
      })));
    }
    toggle(nev.id);
    await load();
    toast.success("Evento duplicado (sem oradores e PINs)");
  };

  /** Grava um PIN (digitado ou gerado). Recusa repetido no mesmo evento. */
  const setPin = async (ev: EventRow, part: PartRow, pin: string) => {
    if (!isValidPin(pin)) { toast.error("O PIN precisa ter de 4 a 6 números."); return null; }
    const hash = await hashPin(pin, ev.public_token);
    if (parts.some((p) => p.event_id === ev.id && p.id !== part.id && p.pin_hash === hash)) { toast.error("Este PIN já está em uso neste evento."); return null; }
    const ok = await patchPart(part.id, { pin_hash: hash });
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
    let pin: string | null = null;
    if (ev.link_mode === "personal") {
      if (!part.personal_token) { const t = crypto.randomUUID(); if (!(await patchPart(part.id, { personal_token: t }))) return; part = { ...part, personal_token: t }; }
    } else {
      pin = part.pin_hash ? readPin(part.id) : null;
      if (!pin) { pin = await newPin(ev, part); if (!pin) return; toast.info("PIN criado para este convite."); }
    }
    const evParts = parts.filter((p) => p.event_id === ev.id);
    const text = buildInviteText(ev, part, evParts.map((x) => (x.id === part.id ? part : x)), pin, origin());
    try { await navigator.clipboard.writeText(text); toast.success("Convite copiado"); } catch { toast.error("Não foi possível copiar."); }
    if (!part.email_sent) void patchPart(part.id, { email_sent: true });
  };

  const exportDocx = async (ev: EventRow) => {
    const evParts = parts.filter((p) => p.event_id === ev.id && p.assigned_to === "speaker" && p.speaker_name?.trim());
    if (!evParts.length) { toast.info("Nenhuma parte com orador definido."); return; }
    const all = parts.filter((p) => p.event_id === ev.id);
    const blocks: string[] = [];
    for (const p of evParts) {
      let pin: string | null = null;
      if (ev.link_mode !== "personal") { pin = p.pin_hash ? readPin(p.id) : null; if (!pin) pin = await newPin(ev, p); }
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
    const f = filter[ev.id] ?? "all";
    const pendingN = speakers.filter((p) => p.status === "pending").length;
    const shown = f === "all" ? evParts : evParts.filter((p) => p.assigned_to === "speaker" && p.status === f);
    const chip = (v: "pending" | "declined", label: string) => (
      <button type="button" onClick={() => setFilter((m) => ({ ...m, [ev.id]: f === v ? "all" : v }))}
        className={`rounded-full border px-2.5 py-1 text-xs ${f === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{label}</button>
    );
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
          <div className="flex items-center gap-2">
            <Label className="shrink-0 text-xs">Início do programa</Label>
            <Input type="time" className="h-8 w-28" defaultValue={ev.start_time ?? ""}
              onBlur={(e) => e.target.value !== (ev.start_time ?? "") && patchEvent(ev.id, { start_time: e.target.value || null })} />
            <Button size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs" onClick={() => recalc(ev)}><RefreshCw className="h-3.5 w-3.5" />Recalcular horários</Button>
          </div>
          <div>
            <Label className="text-xs">Como os oradores confirmam</Label>
            <div className="mt-1 flex gap-1">
              {([["pin", "Link único + PIN"], ["personal", "Link pessoal"]] as const).map(([v, l]) => (
                <button key={v} type="button" onClick={() => changeLinkMode(ev, v)}
                  className={`flex-1 rounded-full border px-2 py-1 text-xs ${ev.link_mode === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Informações adicionais (vão em todos os convites)</Label>
            <Textarea className="mt-1" rows={2} maxLength={2000} defaultValue={ev.extra_info ?? ""}
              onBlur={(e) => e.target.value !== (ev.extra_info ?? "") && patchEvent(ev.id, { extra_info: e.target.value.trim() || null })} />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => exportDocx(ev)}><Download className="h-3.5 w-3.5" />Word</Button>
            {pendingN > 0 && chip("pending", `Faltam ${pendingN}`)}
            {decl > 0 && chip("declined", `Recusas ${decl}`)}
            <span className="flex-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Opções do evento"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditor({ ev, part: null, afterOrder: null })}><Plus className="mr-2 h-4 w-4" />Nova parte</DropdownMenuItem>
                <DropdownMenuItem onClick={() => duplicateEvent(ev)}><CopyPlus className="mr-2 h-4 w-4" />Duplicar evento</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => removeEvent(ev.id)}><Trash2 className="mr-2 h-4 w-4" />Apagar evento</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ul className="divide-y rounded-lg border">
            {shown.map((p, i) => {
              const prev = evParts[evParts.findIndex((x) => x.id === p.id) - 1];
              const overlap = !!prev && p.time_mode === "manual" && toMin(prev.part_time) != null && toMin(p.part_time) != null
                && (toMin(prev.part_time)! + (prev.duration_min ?? 0)) > toMin(p.part_time)!;
              return <PartItem key={p.id} ev={ev} part={p} overlap={overlap} first={i === 0} last={i === shown.length - 1}
                onPatch={patchPart} onSetPin={setPin} onNewPin={newPin} onCopy={copyInvite} onNewLink={newLink}
                onEdit={() => setEditor({ ev, part: p, afterOrder: null })} onAddAfter={() => setEditor({ ev, part: null, afterOrder: p.sort_order })}
                onMove={(d) => movePart(ev, p, d)} onDelete={() => deletePart(ev, p)} />;
            })}
            {!shown.length && <li className="p-3 text-center text-xs text-muted-foreground">Nada aqui.</li>}
          </ul>
          <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => setEditor({ ev, part: null, afterOrder: null })}><Plus className="h-3.5 w-3.5" />Nova parte</Button>
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
        <Button size="sm" className="gap-1" onClick={() => { setForm({ name: "", event_type: "special", event_date: "", location: "", link_mode: "pin" }); setDialog({ parts: null }); }}><Plus className="h-3.5 w-3.5" />Novo</Button>
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
            <div><Label>Como os oradores vão confirmar?</Label>
              <div className="mt-1 space-y-1">
                {([["pin", "Link único + PIN", "Um link para todos; cada orador digita seu PIN."], ["personal", "Link pessoal", "Cada orador recebe o seu link, sem digitar PIN."]] as const).map(([v, l, d]) => (
                  <button key={v} type="button" onClick={() => setForm({ ...form, link_mode: v })}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${form.link_mode === v ? "border-primary bg-primary/10" : "hover:bg-muted"}`}>
                    <span className="block font-medium">{l}</span><span className="block text-xs text-muted-foreground">{d}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={createEvent}>{dialog?.parts ? "Importar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {editor && (
        <PartEditorDialog key={editor.part?.id ?? `new-${editor.afterOrder}`} part={editor.part}
          prevEnd={(() => {
            const list = evPartsOf(editor.ev.id);
            const idx = editor.part ? list.findIndex((p) => p.id === editor.part!.id) - 1
              : editor.afterOrder == null ? list.length - 1 : list.findIndex((p) => p.sort_order === editor.afterOrder);
            const prev = list[idx];
            if (!prev) return toMin(editor.ev.start_time) != null ? editor.ev.start_time : null;
            const t = toMin(prev.part_time);
            return t == null ? null : fromMin(t + (prev.duration_min ?? 0));
          })()}
          nextNumber={String(evPartsOf(editor.ev.id).filter((p) => p.outline_number).length + 1)}
          onCancel={() => setEditor(null)}
          onSave={async (d) => { if (await savePart(editor.ev, d, editor.part, editor.afterOrder)) setEditor(null); }} />
      )}
    </div>
  );
}

interface PartDraft { theme: string; outline_number: string; part_type_label: string; duration_min: string; time_mode: "auto" | "manual"; part_time: string; assigned_to: string }

function PartEditorDialog({ part, prevEnd, nextNumber, onCancel, onSave }: {
  part: PartRow | null; prevEnd: string | null; nextNumber: string;
  onCancel: () => void; onSave: (d: PartDraft) => Promise<void>;
}) {
  const known = (PART_TYPES as readonly string[]).includes(part?.part_type_label ?? "");
  const [d, setD] = useState<PartDraft>({
    theme: part?.theme ?? "", outline_number: part?.outline_number ?? (part ? "" : nextNumber),
    part_type_label: part ? (known ? part.part_type_label! : part.part_type_label ? "Outro" : "") : "Discurso",
    duration_min: part?.duration_min != null ? String(part.duration_min) : "",
    time_mode: (part?.time_mode as "auto" | "manual") ?? "auto", part_time: part?.part_time ?? "",
    assigned_to: part?.assigned_to ?? "speaker",
  });
  const [other, setOther] = useState(part && !known ? part.part_type_label ?? "" : "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!d.theme.trim()) { toast.error("Informe o tema."); return; }
    if (d.time_mode === "manual" && toMin(d.part_time) == null) { toast.error("Informe o horário inicial."); return; }
    setBusy(true);
    await onSave({ ...d, part_type_label: d.part_type_label === "Outro" ? other.trim() || "Outro" : d.part_type_label });
    setBusy(false);
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{part ? "Editar parte" : "Nova parte"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Tema</Label><Input className="mt-1" maxLength={300} value={d.theme} onChange={(e) => setD({ ...d, theme: e.target.value })} /></div>
          <div className="grid grid-cols-[5rem_1fr] gap-2">
            <div><Label>Nº</Label><Input className="mt-1" maxLength={10} value={d.outline_number} onChange={(e) => setD({ ...d, outline_number: e.target.value })} /></div>
            <div><Label>Tempo (min)</Label><Input className="mt-1" inputMode="numeric" value={d.duration_min} onChange={(e) => setD({ ...d, duration_min: e.target.value.replace(/\D/g, "").slice(0, 3) })} /></div>
          </div>
          <div><Label>Tipo</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {[...PART_TYPES, "Outro"].map((t) => (
                <button key={t} type="button" onClick={() => setD({ ...d, part_type_label: t })}
                  className={`rounded-full border px-2.5 py-1 text-xs ${d.part_type_label === t ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{t}</button>
              ))}
            </div>
            {d.part_type_label === "Outro" && <Input className="mt-2" maxLength={80} placeholder="Qual tipo?" value={other} onChange={(e) => setOther(e.target.value)} />}
          </div>
          <div><Label>Horário inicial</Label>
            <div className="mt-1 space-y-1 text-sm">
              <label className="flex items-center gap-2"><input type="radio" checked={d.time_mode === "auto"} onChange={() => setD({ ...d, time_mode: "auto" })} />
                Automático (após a parte anterior){prevEnd ? ` · ${prevEnd}` : ""}</label>
              <label className="flex items-center gap-2"><input type="radio" checked={d.time_mode === "manual"} onChange={() => setD({ ...d, time_mode: "manual", part_time: d.part_time || prevEnd || "" })} />
                Manual
                <Input type="time" className="h-8 w-28" disabled={d.time_mode !== "manual"} value={d.part_time} onChange={(e) => setD({ ...d, part_time: e.target.value })} />
              </label>
            </div>
          </div>
          <div><Label>Designado</Label>
            <div className="mt-1 flex gap-1">
              {[["speaker", "Orador"], ["co", "SC"], ["branch", "Filial"], ["none", "—"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setD({ ...d, assigned_to: v })}
                  className={`flex-1 rounded-full border px-2 py-1 text-xs ${d.assigned_to === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button disabled={busy} onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PartItem({ ev, part, overlap, first, last, onPatch, onSetPin, onNewPin, onCopy, onNewLink, onEdit, onAddAfter, onMove, onDelete }: {
  ev: EventRow; part: PartRow; overlap: boolean; first: boolean; last: boolean;
  onNewLink: (p: PartRow) => Promise<void>; onEdit: () => void; onAddAfter: () => void;
  onMove: (d: -1 | 1) => void; onDelete: () => void;
  onPatch: (id: string, p: Partial<PartRow>) => Promise<boolean>;
  onSetPin: (ev: EventRow, p: PartRow, pin: string) => Promise<string | null>;
  onNewPin: (ev: EventRow, p: PartRow) => Promise<string | null>;
  onCopy: (ev: EventRow, p: PartRow) => Promise<void>;
}) {
  const [pin, setPinState] = useState("");
  useEffect(() => { setPinState(part.pin_hash ? readPin(part.id) ?? "" : ""); }, [part.id, part.pin_hash]);
  const [showReason, setShowReason] = useState(false);
  const [showInfo, setShowInfo] = useState(!!part.instructions);
  const congRef = useRef<HTMLInputElement>(null);
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
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Editar parte" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Opções da parte"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={onAddAfter}><Plus className="mr-2 h-4 w-4" />Nova parte abaixo</DropdownMenuItem>
            <DropdownMenuItem disabled={first} onClick={() => onMove(-1)}><ArrowUp className="mr-2 h-4 w-4" />Subir</DropdownMenuItem>
            <DropdownMenuItem disabled={last} onClick={() => onMove(1)}><ArrowDown className="mr-2 h-4 w-4" />Descer</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {overlap && <p className="pl-16 text-xs text-destructive">Este horário começa antes do fim da parte anterior.</p>}
      {part.assigned_to === "speaker" && (
        <div className="space-y-2 pl-16">
          <Input list="big-events-elders" placeholder="Orador" defaultValue={part.speaker_name ?? ""}
            onBlur={(e) => {
              const name = e.target.value.trim();
              if (name === (part.speaker_name ?? "")) return;
              const cong = elders.find((x) => x.name === name)?.congregation;
              const patch: Partial<PartRow> = { speaker_name: name || null };
              if (cong && !part.speaker_congregation) { patch.speaker_congregation = cong; if (congRef.current) congRef.current.value = cong; }
              void onPatch(part.id, patch);
            }} />
          <Input ref={congRef} placeholder="Congregação do orador" maxLength={120} defaultValue={part.speaker_congregation ?? ""}
            onBlur={(e) => e.target.value.trim() !== (part.speaker_congregation ?? "") && onPatch(part.id, { speaker_congregation: e.target.value.trim() || null })} />
          <button type="button" onClick={() => setShowInfo((v) => !v)} className="flex items-center gap-1 text-xs text-muted-foreground">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showInfo ? "" : "-rotate-90"}`} />Informações só deste convite
          </button>
          {showInfo && <Textarea rows={2} maxLength={1000} defaultValue={part.instructions ?? ""}
            onBlur={(e) => e.target.value.trim() !== (part.instructions ?? "") && onPatch(part.id, { instructions: e.target.value.trim() || null })} />}
          {ev.link_mode === "personal" ? (
            <div className="flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{part.personal_token ? "Link pessoal pronto" : "Link criado ao copiar"}</span>
              <Button size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs" onClick={() => onNewLink(part)}><RefreshCw className="h-3.5 w-3.5" />Novo link</Button>
            </div>
          ) : (
          <div className="flex items-center gap-2">
            <Label className="text-xs">PIN</Label>
            <Input inputMode="numeric" maxLength={6} className="h-8 w-24 font-mono" value={pin}
              placeholder={part.pin_hash ? "••••" : "4-6 núm."}
              onChange={(e) => setPinState(e.target.value.replace(/\D/g, ""))}
              onBlur={() => { if (pin && pin !== readPin(part.id)) void onSetPin(ev, part, pin).then((r) => { if (!r) setPinState(readPin(part.id) ?? ""); }); }} />
            <Button size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs" onClick={() => onNewPin(ev, part).then((r) => r && setPinState(r))}><RefreshCw className="h-3.5 w-3.5" />Novo PIN</Button>
          </div>
          )}
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
