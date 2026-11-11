import { appConfirm } from "@/components/ui/app-dialogs";
// Pílula "Grandes Eventos" (Circuito): assembleias e reuniões especiais, oradores,
// convites com PIN (link único por evento) e status ao vivo.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowDown, ArrowUp, BellRing, CheckCircle2, ChevronDown, Circle, Copy, CopyPlus, Download, KeyRound, Link2, MoreHorizontal, Pencil, Plus, RefreshCw, Timer, Trash2, Upload, UserX, XCircle } from "lucide-react";
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
import { parseProgramFile, parseCircuitManagerCsv, decodeText, ETIM_MAX_BYTES, type EtimPart } from "@/lib/big-events/etim-import";
import { parseRtfProgram } from "@/lib/big-events/rtf-program-import";
import { buildEventFile, isEventFile, parseEventFile, EVENT_FILE_EXT } from "@/lib/big-events/event-share-file";
import { buildInviteText, formatEventDate, generatePin, hashPin, isValidPin, recomputeTimes, toMin, fromMin, PART_TYPES, ASSIGNED_LABEL, PART_EXTRAS, readExtras, withExtras } from "@/lib/big-events/invite";
import { applyProgramRules, isFloatingType, isSeriesItem, SERIES_HEAD } from "@/lib/big-events/program-rules";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { htmlToDocx, safeFileName, DOCX_MIME } from "@/lib/docx-export";
import { saveBlob } from "@/lib/share";
import JSZip from "jszip";
import { letterCandidates, pickLetterParts, speakerChanged } from "@/lib/big-events/letter-pick";
import { LetterTemplates } from "./LetterTemplates";
import { EventTimerFocus } from "./EventTimerFocus";
import { buildLetterModel, letterFileBase, loadEventChoice, loadTemplates, saveEventChoice, templateForEvent, type LetterTemplate } from "@/lib/big-events/letter-template";
import { fetchLetterTemplates, pushLetterTemplates, startLetterAutoSync, type SyncState } from "@/lib/big-events/letter-template-sync";
import type { Database } from "@/integrations/supabase/types";

type EventRow = Database["public"]["Tables"]["circuit_big_events"]["Row"];
type PartRow = Database["public"]["Tables"]["circuit_big_event_parts"]["Row"];

const OPEN_KEY = "bigEvents.open";
const SECTIONS_KEY = "bigEvents.sections";
const pinKey = (partId: string) => `bigEvents.pin.${partId}`;
const readPin = (id: string) => { try { return localStorage.getItem(pinKey(id)); } catch { return null; } };
const writePin = (id: string, pin: string) => { try { localStorage.setItem(pinKey(id), pin); } catch { /* */ } };
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
  const [filter, setFilter] = useState<Record<string, PartFilter>>({});
  // Seções recolhíveis por evento (só neste aparelho): detalhes, resumo e grupos sem orador.
  const [sections, setSections] = useState<Record<string, boolean>>({});
  useEffect(() => { try { const raw = localStorage.getItem(SECTIONS_KEY); if (raw) setSections(JSON.parse(raw) as Record<string, boolean>); } catch { /* */ } }, []);
  const flip = (key: string, fallback: boolean) => setSections((m) => {
    const n = { ...m, [key]: !(m[key] ?? fallback) };
    try { localStorage.setItem(SECTIONS_KEY, JSON.stringify(n)); } catch { /* */ }
    return n;
  });
  const [remindFor, setRemindFor] = useState<EventRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<"events" | "templates">("events");
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [tplChoice, setTplChoice] = useState<Record<string, string>>({});
  const [exportFor, setExportFor] = useState<EventRow | null>(null);
  const [timerFor, setTimerFor] = useState<EventRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pickIds, setPickIds] = useState<Set<string> | null>(null);
  const [tplSync, setTplSync] = useState<SyncState>("local");
  useEffect(() => {
    if (!user) return;
    setTemplates(loadTemplates(user.id)); setTplChoice(loadEventChoice(user.id));
    let alive = true;
    void fetchLetterTemplates(user.id).then((r) => { if (alive) { setTemplates(r.list); setTplSync(r.state); } });
    const stop = startLetterAutoSync(user.id, (s) => { if (alive) setTplSync(s); });
    return () => { alive = false; stop(); };
  }, [user]);
  const updateTemplates = (l: LetterTemplate[]) => {
    const prev = templates; setTemplates(l);
    if (user) { setTplSync("pending"); void pushLetterTemplates(user.id, prev, l).then(setTplSync); }
  };
  const chooseTemplate = (eventId: string, tplId: string) => {
    const next = { ...tplChoice, [eventId]: tplId }; setTplChoice(next); if (user) saveEventChoice(user.id, next);
  };

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
      // Android informa .etim como binário (.bin); conferimos nome e tamanho aqui.
      if (!/\.(etim|json|csv|rtf|visitasc)$/i.test(f.name)) throw new Error(`"${f.name}" não é um programa. Escolha um .visitasc, .etim, .rtf (programa do jw.org) ou o arquivo do Circuito Manager (.json ou .csv).`);
      if (f.size > ETIM_MAX_BYTES) throw new Error("Arquivo muito grande (máx. 1 MB).");
      const text = decodeText(await f.arrayBuffer());
      let shared: unknown = null;
      if (/\.(visitasc|json)$/i.test(f.name)) { try { shared = JSON.parse(text.replace(/^\uFEFF+/, "")); } catch { shared = null; } }
      if (isEventFile(shared)) {
        const r = parseEventFile(shared);
        setForm({ name: r.event.name, event_type: r.event.event_type, event_date: r.event.event_date ?? "", location: r.event.location ?? "", link_mode: "pin" });
        setDialog({ parts: r.parts });
        return;
      }
      const isRtf = /\.rtf$/i.test(f.name) || text.trimStart().startsWith("{\\rtf");
      const raw = /\.csv$/i.test(f.name) ? { title: null, parts: parseCircuitManagerCsv(text) }
        : isRtf ? parseRtfProgram(text) : parseProgramFile(text);
      // Numeração, tipo, Oração e Presidente: mesmas regras para .rtf, .etim, .csv e .json.
      const res = { ...raw, parts: applyProgramRules(raw.parts, { renumber: isRtf }) };
      const name = res.title ?? f.name.replace(/\.(etim|json|csv|rtf)$/i, "").replace(/_/g, " ");
      setForm({ name, event_type: "assembly", event_date: "", location: "", link_mode: "pin" });
      setDialog({ parts: res.parts });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Este arquivo não é um programa válido."); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const createEvent = async () => {
    if (!user || !form.name.trim()) { toast.error("Informe o nome do evento."); return; }
    const { data: ev, error } = await supabase.from("circuit_big_events").insert({
      superintendent_id: user.id, name: form.name.trim().slice(0, 200), event_type: form.event_type,
      event_date: form.event_date || null, location: form.location.trim() || null, link_mode: form.link_mode,
      start_time: dialog?.parts?.find((p) => toMin(p.part_time) != null && !isFloatingType(p.part_type_label))?.part_time ?? null,
    }).select("*").single();
    if (error || !ev) { toast.error("Não foi possível criar o evento."); return; }
    const ps = dialog?.parts ?? [];
    if (ps.length) {
      // Todas as partes com as mesmas colunas preenchidas: o lote não pode levar campo vazio obrigatório.
      const { error: pe } = await supabase.from("circuit_big_event_parts").insert(ps.map((p, i) => ({
        ...p, time_mode: p.time_mode ?? "auto", speaker_name: p.speaker_name ?? null,
        show_next_speaker: autoNextSpeaker(ps, i),
        event_id: ev.id, superintendent_id: user.id, sort_order: i,
        personal_token: form.link_mode === "personal" && p.assigned_to === "speaker" ? crypto.randomUUID() : null,
      })));
      if (pe) {
        await supabase.from("circuit_big_events").delete().eq("id", ev.id);
        toast.error("Não foi possível importar as partes. Tente de novo.");
        await load();
        return;
      }
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
    const { data, error } = await supabase.from("circuit_big_event_parts").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) { toast.error(error.code === "23505" ? "Este PIN já está em uso neste evento." : "Não foi possível salvar."); return false; }
    if (data) { setParts((ps) => ps.map((p) => (p.id === id ? data : p))); return data; }
    return true;
  };
  const removeEvent = async (id: string) => {
    if (!await appConfirm("Apagar este evento e todas as partes?")) return;
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
    if (!await appConfirm(`Excluir a parte "${part.theme}"?${warn}`)) return;
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
    if (sent && !await appConfirm("Os convites já enviados deixarão de funcionar e precisarão ser reenviados. Continuar?")) return;
    await patchEvent(ev.id, { link_mode: mode });
    if (mode === "personal") {
      await Promise.all(evPartsOf(ev.id).filter((p) => p.assigned_to === "speaker" && !p.personal_token)
        .map((p) => supabase.from("circuit_big_event_parts").update({ personal_token: crypto.randomUUID() }).eq("id", p.id)));
    }
    await load();
  };

  const newLink = async (part: PartRow) => {
    if (part.personal_token && !await appConfirm("Gerar um novo link? O link anterior deixa de funcionar.")) return;
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

  /** Troca de orador numa parte que já tinha convite: renova link/PIN e volta a "Aguardando". */
  const patchSpeaker = async (id: string, patch: Partial<PartRow>) => {
    const old = parts.find((p) => p.id === id);
    if (!old || !("speaker_name" in patch) || !speakerChanged(old.speaker_name, patch.speaker_name) || (!old.personal_token && !old.pin_hash)) return patchPart(id, patch);
    const ev = events.find((e) => e.id === old.event_id);
    const extra: Partial<PartRow> = { status: "pending", responded_at: null, decline_reason: null };
    if (old.personal_token) extra.personal_token = crypto.randomUUID();
    if (old.pin_hash) extra.pin_hash = null;
    const r = await patchPart(id, { ...patch, ...extra });
    if (!r) return r;
    if (old.pin_hash && ev) { await newPin(ev, r === true ? { ...old, ...patch, ...extra } : r); }
    toast.info(`Novo orador: ${old.personal_token ? "link" : "PIN"} renovado. Envie o novo convite.`);
    return r;
  };

  /** Texto do convite (cria PIN ou link pessoal se faltar). */
  const inviteTextFor = async (ev: EventRow, part: PartRow): Promise<string | null> => {
    let pin: string | null = null;
    if (ev.link_mode === "personal") {
      if (!part.personal_token || !part.personal_code) { const t = crypto.randomUUID(); const r = await patchPart(part.id, { personal_token: t }); if (!r) return null; part = r === true ? { ...part, personal_token: t } : r; }
    } else {
      pin = part.pin_hash ? readPin(part.id) : null;
      if (!pin) { pin = await newPin(ev, part); if (!pin) return null; }
    }
    const evParts = parts.filter((p) => p.event_id === ev.id);
    return buildInviteText(ev, part, evParts.map((x) => (x.id === part.id ? part : x)), pin, origin());
  };
  const copyInvite = async (ev: EventRow, part: PartRow) => {
    const text = await inviteTextFor(ev, part);
    if (!text) return;
    try { await navigator.clipboard.writeText(text); toast.success("Convite copiado"); } catch { toast.error("Não foi possível copiar."); }
    if (!part.email_sent) void patchPart(part.id, { email_sent: true });
  };

  /** Lembrar pendentes: copia todos os convites ainda sem resposta, separados por linha. */
  const copyAllPending = async (ev: EventRow) => {
    const list = pendingOf(ev.id);
    const texts: string[] = [];
    for (const p of list) { const t = await inviteTextFor(ev, p); if (t) texts.push(t); }
    if (!texts.length) return;
    try { await navigator.clipboard.writeText(texts.join("\n\n— — —\n\n")); toast.success(`${texts.length} convites copiados`); } catch { toast.error("Não foi possível copiar."); }
  };
  const pendingOf = (evId: string) => parts.filter((p) => p.event_id === evId && p.assigned_to === "speaker" && p.speaker_name?.trim() && p.status === "pending").sort((a, b) => a.sort_order - b.sort_order);

  const letterModels = async (ev: EventRow, ids?: ReadonlySet<string> | null) => {
    const evParts = pickLetterParts(parts.filter((p) => p.event_id === ev.id), ids);
    const all = parts.filter((p) => p.event_id === ev.id);
    const tpl = templateForEvent(templates, tplChoice, ev.id);
    const out: Array<{ part: PartRow; model: ReturnType<typeof buildLetterModel> }> = [];
    for (let p of evParts) {
      let pin: string | null = null;
      if (ev.link_mode === "personal") {
        if (!p.personal_token || !p.personal_code) { const r = await patchPart(p.id, { personal_token: crypto.randomUUID() }); if (r && r !== true) p = r; }
      } else { pin = p.pin_hash ? readPin(p.id) : null; if (!pin) pin = await newPin(ev, p); }
      out.push({ part: p, model: buildLetterModel(tpl, ev, p, all, pin) });
    }
    return out;
  };

  const exportDocx = async (ev: EventRow) => {
    const items = await letterModels(ev);
    if (!items.length) { toast.info("Nenhuma parte com orador definido."); return; }
    try {
      const blob = await htmlToDocx(ev.name, (await import("@/lib/big-events/letter-render")).assignmentsListHtml(ev, items));
      await saveBlob(blob, { filename: `${safeFileName(`Designações ${ev.name}`, "designacoes")}.docx`, mimeType: DOCX_MIME });
    } catch (e) { toast.error(String(e instanceof Error ? e.message : e)); }
  };

  const exportPdfs = async (ev: EventRow, ids?: ReadonlySet<string> | null) => {
    const items = await letterModels(ev, ids);
    if (!items.length) { toast.info("Nenhuma parte com orador definido."); return; }
    try {
      if (items.length === 1) {
        const r = await (await import("@/lib/big-events/letter-render")).letterPdfFit(items[0].model);
        if (r.pages > 1) toast.warning("A carta passou de 1 página — encurte os lembretes no modelo.", { duration: 8000 });
        await saveBlob(new Blob([r.bytes as BlobPart], { type: "application/pdf" }), { filename: `${letterFileBase(items[0].part)}.pdf`, mimeType: "application/pdf" });
        return;
      }
      const zip = new JSZip();
      const used = new Set<string>();
      const over: string[] = [];
      for (const i of items) {
        let name = letterFileBase(i.part); let n = 2;
        while (used.has(name)) name = `${letterFileBase(i.part)} (${n++})`;
        used.add(name);
        const r = await (await import("@/lib/big-events/letter-render")).letterPdfFit(i.model);
        if (r.pages > 1) over.push(i.model.recipientName || name);
        zip.file(`${name}.pdf`, r.bytes);
      }
      if (over.length) toast.warning(`A carta de ${over.join(", ")} passou de 1 página — encurte os lembretes no modelo.`, { duration: 8000 });
      const blob = await zip.generateAsync({ type: "blob", mimeType: "application/zip" });
      await saveBlob(blob, { filename: `${safeFileName(`Convites PDF ${ev.name}`, "convites")}.zip`, mimeType: "application/zip" });
    } catch (e) { toast.error(String(e instanceof Error ? e.message : e)); }
  };

  const exportProgram = async (ev: EventRow) => {
    const list = evPartsOf(ev.id);
    if (!list.length) { toast.info("Este evento ainda não tem partes."); return; }
    try {
      const bytes = await (await import("@/lib/big-events/program-pdf")).programPdf(ev, list);
      await saveBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), { filename: `${safeFileName(`Programa ${ev.name}`, "programa")}.pdf`, mimeType: "application/pdf" });
    } catch (e) { toast.error(String(e instanceof Error ? e.message : e)); }
  };

  const exportShareFile = async (ev: EventRow) => {
    try {
      const file = buildEventFile(ev, evPartsOf(ev.id));
      const blob = new Blob([JSON.stringify(file, null, 1)], { type: "application/json" });
      await saveBlob(blob, { filename: `${safeFileName(ev.name, "evento")}.${EVENT_FILE_EXT}`, mimeType: "application/json" });
    } catch (e) { toast.error(String(e instanceof Error ? e.message : e)); }
  };

  const runExport = async (kind: "docx" | "pdf" | "program" | "share") => {
    const ev = exportFor; if (!ev) return;
    if (kind === "pdf" && !pickIds) {
      const c = letterCandidates(parts.filter((p) => p.event_id === ev.id));
      if (!c.length) { toast.info("Nenhuma parte com orador definido."); return; }
      setPickIds(new Set(c.map((p) => p.id))); return;
    }
    setExporting(true);
    try { await (kind === "docx" ? exportDocx(ev) : kind === "pdf" ? exportPdfs(ev, pickIds) : kind === "program" ? exportProgram(ev) : exportShareFile(ev)); } finally { setExporting(false); setExportFor(null); setPickIds(null); }
  };

  const renderEvent = (ev: EventRow) => {
    const evParts = parts.filter((p) => p.event_id === ev.id).sort((a, b) => a.sort_order - b.sort_order);
    const speakers = evParts.filter((p) => p.assigned_to === "speaker");
    const conf = speakers.filter((p) => p.status === "confirmed").length;
    const decl = speakers.filter((p) => p.status === "declined").length;
    const isOpen = open.has(ev.id);
    const f = filter[ev.id] ?? "all";
    const named = speakers.filter((p) => p.speaker_name?.trim());
    const pendingN = named.filter((p) => p.status === "pending").length;
    const noSpeakerN = speakers.filter((p) => !p.speaker_name?.trim()).length;
    const noTime = (p: PartRow) => p.assigned_to === "speaker" && !isFloatingType(p.part_type_label) && p.duration_min == null;
    const noTimeN = evParts.filter(noTime).length;
    const shown = evParts.filter((p) => matchFilter(p, f, noTime));
    const setF = (v: PartFilter) => setFilter((m) => ({ ...m, [ev.id]: f === v ? "all" : v }));
    const detailsDefault = evParts.length === 0;
    const detailsOpen = sections[`det.${ev.id}`] ?? detailsDefault;
    const summaryOpen = sections[`sum.${ev.id}`] ?? false;
    // Sobreposição: compara com a última parte que ocupa tempo (Oração/Presidente não contam).
    const overlapIds = new Set<string>();
    let last: PartRow | null = null;
    for (const p of evParts) {
      if (isFloatingType(p.part_type_label) || isSeriesItem(p)) continue;
      if (last && p.time_mode === "manual" && toMin(last.part_time) != null && toMin(p.part_time) != null
        && toMin(last.part_time)! + (last.duration_min ?? 0) > toMin(p.part_time)!) overlapIds.add(p.id);
      last = p;
    }
    // Mesmo ancião em mais de uma parte (Oração e Presidente ignorados).
    const byName = new Map<string, PartRow[]>();
    for (const p of speakers) {
      const k = p.speaker_name?.trim().toLocaleLowerCase("pt-BR");
      if (!k || isFloatingType(p.part_type_label)) continue;
      byName.set(k, [...(byName.get(k) ?? []), p]);
    }
    const alsoIn = (p: PartRow) => {
      const k = p.speaker_name?.trim().toLocaleLowerCase("pt-BR");
      if (!k || p.assigned_to !== "speaker" || isFloatingType(p.part_type_label)) return null;
      const others = (byName.get(k) ?? []).filter((x) => x.id !== p.id);
      return others.length ? others.map((x) => (x.outline_number ? `parte ${x.outline_number}` : x.part_time ?? x.theme)).join(", ") : null;
    };
    // Série de discursos: soma dos discursos (informativa) comparada ao tempo do título.
    const seriesNote = (p: PartRow) => {
      if (p.part_type_id !== SERIES_HEAD || !p.duration_min) return null;
      const i = evParts.findIndex((x) => x.id === p.id);
      let sum = 0, n = 0;
      for (const x of evParts.slice(i + 1)) { if (!isSeriesItem(x)) break; sum += x.duration_min ?? 0; n++; }
      return n && sum > p.duration_min ? `Os discursos somam ${sum} min; a série tem ${p.duration_min} min.` : null;
    };
    const pill = (v: PartFilter, n: number, label: string, tone: string) => (
      <button type="button" onClick={() => setF(v)} aria-pressed={f === v}
        className={`flex min-w-0 flex-1 flex-col items-center rounded-2xl px-1 py-1.5 transition-colors ${f === v ? "ring-2 ring-primary" : ""} ${tone}`}>
        <span className="text-base font-semibold leading-tight tabular-nums">{n}</span>
        <span className="w-full truncate text-center text-[10px] leading-tight">{label}</span>
      </button>
    );
    return (
      <Card key={ev.id} className="shadow-card">
        <button type="button" onClick={() => toggle(ev.id)} aria-expanded={isOpen} className="flex w-full items-center gap-2 px-4 py-3 text-left">
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{ev.name}</span>
            <span className="block text-xs text-muted-foreground">{[formatEventDate(ev.event_date), ev.location, ev.start_time?.slice(0, 5)].filter(Boolean).join(" · ")}</span>
          </span>
          <span className="text-xs text-muted-foreground">{conf}/{speakers.length}{decl ? ` · ${decl}✕` : ""}</span>
        </button>
        <div hidden={!isOpen} className="space-y-3 px-4 pb-4">
          <div className="flex items-center gap-2">
            <Button className="h-11 flex-1 gap-2 rounded-2xl text-[15px]" onClick={() => setTimerFor(ev)} disabled={!evPartsOf(ev.id).length}><Timer className="h-4 w-4" />Controle de tempo</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="icon" variant="outline" className="h-11 w-11 rounded-2xl" aria-label="Opções do evento"><MoreHorizontal className="h-5 w-5" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditor({ ev, part: null, afterOrder: null })}><Plus className="mr-2 h-4 w-4" />Nova parte</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setExportFor(ev)}><Download className="mr-2 h-4 w-4" />Exportar</DropdownMenuItem>
                <DropdownMenuItem disabled={!pendingN} onClick={() => setRemindFor(ev)}><BellRing className="mr-2 h-4 w-4" />Lembrar pendentes{pendingN ? ` (${pendingN})` : ""}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => duplicateEvent(ev)}><CopyPlus className="mr-2 h-4 w-4" />Duplicar evento</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => removeEvent(ev.id)}><Trash2 className="mr-2 h-4 w-4" />Apagar evento</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="overflow-hidden rounded-2xl bg-muted/40">
            <button type="button" onClick={() => flip(`det.${ev.id}`, detailsDefault)} aria-expanded={detailsOpen}
              className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-medium">
              <span className="flex-1">Detalhes do evento</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${detailsOpen ? "" : "-rotate-90"}`} />
            </button>
            <div hidden={!detailsOpen} className="space-y-3 border-t border-border/60 p-3">
          <div className="relative">
            <Input key={`name-${ev.name}`} defaultValue={ev.name} maxLength={200} aria-label="Nome do evento" className="pr-9 font-medium"
              onBlur={(e) => { const v = e.target.value.trim(); if (!v) { e.target.value = ev.name; toast.error("O evento precisa de um nome."); return; } if (v !== ev.name) void patchEvent(ev.id, { name: v }); }} />
            <Pencil className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
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
          {ev.extra_info && (
            // Campo antigo: a carta convite já leva as informações gerais. Só aparece se já tiver texto.
            <div className="rounded-2xl bg-muted/50 p-2.5">
              <div className="flex items-center gap-2">
                <Label className="flex-1 text-xs">Informações adicionais (vão em todos os convites)</Label>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" onClick={() => patchEvent(ev.id, { extra_info: null })}>Apagar</Button>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground">{ev.extra_info}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Label className="shrink-0 text-xs">Modelo de carta</Label>
            <select className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm" value={templateForEvent(templates, tplChoice, ev.id).id}
              onChange={(e) => chooseTemplate(ev.id, e.target.value)} aria-label="Modelo de carta">
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl bg-muted/40">
            <button type="button" onClick={() => flip(`sum.${ev.id}`, false)} aria-expanded={summaryOpen}
              className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm">
              <span className="flex-1 font-medium">Resumo</span>
              <span className="flex items-center gap-2.5 text-xs tabular-nums">
                <span className="flex items-center gap-0.5 text-primary"><CheckCircle2 className="h-3.5 w-3.5" />{conf}</span>
                <span className="flex items-center gap-0.5 text-warning"><Circle className="h-3.5 w-3.5" />{pendingN}</span>
                <span className="flex items-center gap-0.5 text-destructive"><XCircle className="h-3.5 w-3.5" />{decl}</span>
                <span className="flex items-center gap-0.5 text-muted-foreground"><UserX className="h-3.5 w-3.5" />{noSpeakerN}</span>
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${summaryOpen ? "" : "-rotate-90"}`} />
            </button>
            <div hidden={!summaryOpen} className="flex gap-1.5 border-t border-border/60 p-2" role="group" aria-label="Resumo das designações">
              {pill("confirmed", conf, "Confirmados", "bg-primary/10 text-primary")}
              {pill("pending", pendingN, "Pendentes", "bg-warning/15 text-warning-foreground")}
              {pill("declined", decl, "Recusados", "bg-destructive/10 text-destructive")}
              {pill("nospeaker", noSpeakerN, "Sem ancião", "bg-muted text-muted-foreground")}
            </div>
          </div>
          {f !== "all" && (
            <button type="button" onClick={() => setFilter((m) => ({ ...m, [ev.id]: "all" }))} className="flex w-full items-center justify-between rounded-xl bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
              <span>Mostrando: {FILTER_LABEL[f]}</span><span>Ver todas</span>
            </button>
          )}
          {noTimeN > 0 && f !== "notime" && (
            <button type="button" onClick={() => setF("notime")} className="flex w-full items-center gap-1.5 rounded-xl bg-warning/15 px-3 py-2 text-left text-xs font-medium text-warning-foreground">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{noTimeN === 1 ? "1 parte sem tempo" : `${noTimeN} partes sem tempo`}
            </button>
          )}
          {overlapIds.size > 0 && (
            <p className="flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{overlapIds.size === 1 ? "1 parte começa antes do fim da anterior." : `${overlapIds.size} partes começam antes do fim da anterior.`}
            </p>
          )}
          <ul className="divide-y rounded-lg border">
            {groupRuns(shown, f === "all").map((run) => {
              const item = (p: PartRow) => {
                const i = shown.indexOf(p);
                return <PartItem key={p.id} ev={ev} elders={elders} part={p} overlap={overlapIds.has(p.id)} alsoIn={alsoIn(p)} note={seriesNote(p)} first={i === 0} last={i === shown.length - 1}
                  onPatch={patchSpeaker} onSetPin={setPin} onNewPin={newPin} onCopy={copyInvite} onNewLink={newLink}
                  onEdit={() => setEditor({ ev, part: p, afterOrder: null })} onAddAfter={() => setEditor({ ev, part: null, afterOrder: p.sort_order })}
                  onMove={(d) => movePart(ev, p, d)} onDelete={() => deletePart(ev, p)} />;
              };
              if (!run.group) return item(run.parts[0]);
              const key = `grp.${ev.id}.${run.parts[0].id}`;
              const gOpen = sections[key] ?? false;
              return [
                <li key={key}>
                  <button type="button" onClick={() => flip(key, false)} aria-expanded={gOpen}
                    className="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground">
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${gOpen ? "" : "-rotate-90"}`} />
                    <span className="w-12 shrink-0 tabular-nums">{run.parts[0].part_time ?? ""}</span>
                    <span className="min-w-0 flex-1 truncate">{run.parts.length === 1 ? run.parts[0].theme : `${run.parts.length} partes sem orador`}</span>
                  </button>
                </li>,
                ...(gOpen ? run.parts.map(item) : []),
              ];
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
      <div className="flex gap-1 rounded-full bg-muted p-1" role="tablist">
        {([["events", "Eventos"], ["templates", "Modelos de carta"]] as const).map(([v, l]) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
            className={`h-9 flex-1 rounded-full text-sm font-medium transition-colors ${view === v ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      {view === "templates" && <LetterTemplates list={templates} onChange={updateTemplates} />}
      <div hidden={view !== "events"} className="space-y-3">
      {timerFor && <EventTimerFocus ev={timerFor} parts={evPartsOf(timerFor.id)} onClose={() => setTimerFor(null)} speakerCong={(p) => (p as { speaker_congregation?: string | null }).speaker_congregation ?? null}
        onEditPart={(id) => { const pt = evPartsOf(timerFor.id).find((x) => x.id === id); if (pt) setEditor({ ev: timerFor, part: pt, afterOrder: null }); }} />}
      <Dialog open={!!exportFor} onOpenChange={(o) => { if (!o && !exporting) { setExportFor(null); setPickIds(null); } }}>
        <DialogContent className="max-w-sm overflow-hidden">
          <DialogHeader><DialogTitle>{pickIds ? "Escolher cartas" : "Exportar"}</DialogTitle></DialogHeader>
          {pickIds && exportFor ? (() => {
            const cands = letterCandidates(parts.filter((p) => p.event_id === exportFor.id));
            const setAll = (ids: string[]) => setPickIds(new Set(ids));
            return (
              <div className="min-w-0 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{pickIds.size} de {cands.length} selecionadas</span>
                  <button type="button" className="text-xs font-medium text-primary" disabled={exporting} onClick={() => setPickIds(null)}>‹ Voltar</button>
                </div>
                <div className="flex gap-1.5">
                  {([["Todas", cands.map((p) => p.id)], ["Nenhuma", []], ["Pendentes", cands.filter((p) => p.status === "pending").map((p) => p.id)]] as const).map(([l, ids]) => (
                    <button key={l} type="button" disabled={exporting} onClick={() => setAll([...ids])} className="h-8 flex-1 rounded-full bg-muted text-xs font-medium">{l}</button>
                  ))}
                </div>
                <ul className="max-h-[50vh] divide-y overflow-y-auto rounded-2xl bg-muted/50">
                  {cands.map((p) => {
                    const on = pickIds.has(p.id);
                    return (
                      <li key={p.id}>
                        <label className="flex min-w-0 cursor-pointer items-start gap-3 px-3 py-2.5">
                          <Checkbox checked={on} disabled={exporting} className="mt-0.5" onCheckedChange={() => setPickIds((s) => { const n = new Set(s); if (on) n.delete(p.id); else n.add(p.id); return n; })} />
                          <span className="min-w-0 flex-1">
                            <span className="block break-words text-sm font-medium">{[p.outline_number ? `Nº ${p.outline_number}` : null, p.theme].filter(Boolean).join(" · ")}</span>
                            <span className="block break-words text-xs text-muted-foreground">{[p.speaker_name, p.speaker_congregation].filter(Boolean).join(" · ")}</span>
                            {p.status === "declined" && <span className="block text-xs text-destructive">Recusou</span>}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <Button className="w-full rounded-full" disabled={exporting || !pickIds.size} onClick={() => runExport("pdf")}>
                  {exporting ? "Gerando…" : pickIds.size === 1 ? "Gerar 1 carta (PDF)" : `Gerar ${pickIds.size} cartas (.zip)`}
                </Button>
              </div>
            );
          })() : (
          <div className="min-w-0 space-y-2">
            <Button variant="outline" className="h-auto w-full min-w-0 justify-start whitespace-normal py-3 text-left" disabled={exporting} onClick={() => runExport("docx")}>
              <span className="min-w-0"><span className="block font-semibold">Word (lista de designações)</span><span className="block text-xs text-muted-foreground">Para conferir e copiar os convites</span></span>
            </Button>
            <Button variant="outline" className="h-auto w-full min-w-0 justify-start whitespace-normal py-3 text-left" disabled={exporting} onClick={() => runExport("pdf")}>
              <span className="min-w-0"><span className="block font-semibold">PDF individuais (.zip)</span><span className="block text-xs text-muted-foreground">Uma carta por orador, com "Clique aqui" ativo</span></span>
            </Button>
            <Button variant="outline" className="h-auto w-full min-w-0 justify-start whitespace-normal py-3 text-left" disabled={exporting} onClick={() => runExport("program")}>
              <span className="min-w-0"><span className="block font-semibold">Programa do evento (PDF)</span><span className="block text-xs text-muted-foreground">Com todas as designações, para acompanhar durante o evento</span></span>
            </Button>
            <Button variant="outline" className="h-auto w-full min-w-0 justify-start whitespace-normal py-3 text-left" disabled={exporting} onClick={() => runExport("share")}>
              <span className="min-w-0"><span className="block font-semibold">Arquivo para outro aparelho</span><span className="block text-xs text-muted-foreground">Abra em "Importar" no outro celular (sem PINs nem links)</span></span>
            </Button>
            {exporting && <p className="text-center text-xs text-muted-foreground">Gerando…</p>}
          </div>
          )}
        </DialogContent>
      </Dialog>
      <Drawer open={!!remindFor} onOpenChange={(o) => !o && setRemindFor(null)}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>Lembrar pendentes</DrawerTitle></DrawerHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto px-4 pb-2">
            {remindFor && pendingOf(remindFor.id).map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-muted/60 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.speaker_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{[p.part_time, p.outline_number ? `Nº ${p.outline_number}` : p.part_type_label, p.theme].filter(Boolean).join(" · ")}</span>
                </span>
                <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1 rounded-full" onClick={() => copyInvite(remindFor, p)}><Copy className="h-3.5 w-3.5" />Copiar</Button>
              </div>
            ))}
            {remindFor && !pendingOf(remindFor.id).length && <p className="py-6 text-center text-sm text-muted-foreground">Todos já responderam.</p>}
          </div>
          <div className="px-4 pb-6 pt-2">
            <Button className="w-full rounded-full" disabled={!remindFor || !pendingOf(remindFor.id).length} onClick={() => remindFor && copyAllPending(remindFor)}><Copy className="mr-1 h-4 w-4" />Copiar todas</Button>
          </div>
        </DrawerContent>
      </Drawer>
      <datalist id="big-events-elders">
        {elders.filter((e) => e.name).map((e) => <option key={`${e.name}-${e.congregation}`} value={e.name}>{e.congregation}</option>)}
      </datalist>
      <div className="flex items-center justify-end gap-2">
        <input ref={fileRef} type="file" accept="*/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button size="sm" variant="outline" className="gap-1" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5" />Importar programa</Button>
        <Button size="sm" className="gap-1" onClick={() => { setForm({ name: "", event_type: "special", event_date: "", location: "", link_mode: "pin" }); setDialog({ parts: null }); }}><Plus className="h-3.5 w-3.5" />Novo</Button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Carregando…</p>
        : !events.length ? <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum evento ainda. Importe o programa (.etim, .rtf, .json ou .csv) ou crie um evento.</Card>
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
    </div>
  );
}

type PartFilter = "all" | "pending" | "declined" | "confirmed" | "notime" | "nospeaker";
const FILTER_LABEL: Record<PartFilter, string> = { all: "Todas", pending: "Pendentes", declined: "Recusados", confirmed: "Confirmados", notime: "Sem tempo", nospeaker: "Sem ancião" };
/** Agrupa partes seguidas que não pedem orador (cânticos, músicas…), para começarem recolhidas. */
export function groupRuns<T extends { assigned_to: string }>(list: T[], enabled: boolean): Array<{ group: boolean; parts: T[] }> {
  const out: Array<{ group: boolean; parts: T[] }> = [];
  for (const p of list) {
    const none = enabled && p.assigned_to === "none";
    const lastRun = out[out.length - 1];
    if (none && lastRun?.group) lastRun.parts.push(p);
    else out.push({ group: none, parts: [p] });
  }
  return out;
}
/** Simpósio/Série: informar o próximo orador em todos, menos no último discurso do grupo. */
export function autoNextSpeaker(list: Array<{ symposium?: boolean | null; assigned_to?: string | null }>, i: number): boolean {
  const cur = list[i], next = list[i + 1];
  return !!(cur?.symposium && cur.assigned_to === "speaker" && next?.symposium && next.assigned_to === "speaker");
}
function matchFilter(p: PartRow, f: PartFilter, noTime: (p: PartRow) => boolean): boolean {
  if (f === "all") return true;
  if (f === "notime") return noTime(p);
  if (p.assigned_to !== "speaker") return false;
  if (f === "nospeaker") return !p.speaker_name?.trim();
  return !!p.speaker_name?.trim() && p.status === f;
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
            <div><Label className={!d.duration_min && part?.symposium ? "text-destructive" : undefined}>Tempo (min){isFloatingType(d.part_type_label) ? " · não soma" : ""}</Label><Input className={`mt-1 ${!d.duration_min && part?.symposium ? "border-destructive" : ""}`} inputMode="numeric" value={d.duration_min} onChange={(e) => setD({ ...d, duration_min: e.target.value.replace(/\D/g, "").slice(0, 3) })} /></div>
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
              {(["speaker", "co", "branch", "none"] as const).map((v) => [v, ASSIGNED_LABEL[v]] as const).map(([v, l]) => (
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

/** Minutos digitados no cartão: inteiro de 1 a 240, senão null. */
export function parseDurationInput(v: string): number | null {
  const t = v.trim();
  if (!/^\d{1,3}$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= 240 ? n : null;
}

function PartItem({ ev, elders, part, overlap, alsoIn, note, first, last, onPatch, onSetPin, onNewPin, onCopy, onNewLink, onEdit, onAddAfter, onMove, onDelete }: {
  ev: EventRow; elders: Array<{ name: string; congregation: string }>; part: PartRow; overlap: boolean; alsoIn: string | null; note: string | null; first: boolean; last: boolean;
  onNewLink: (p: PartRow) => Promise<void>; onEdit: () => void; onAddAfter: () => void;
  onMove: (d: -1 | 1) => void; onDelete: () => void;
  onPatch: (id: string, p: Partial<PartRow>) => Promise<unknown>;
  onSetPin: (ev: EventRow, p: PartRow, pin: string) => Promise<string | null>;
  onNewPin: (ev: EventRow, p: PartRow) => Promise<string | null>;
  onCopy: (ev: EventRow, p: PartRow) => Promise<void>;
}) {
  const [pin, setPinState] = useState("");
  useEffect(() => { setPinState(part.pin_hash ? readPin(part.id) ?? "" : ""); }, [part.id, part.pin_hash]);
  const [showReason, setShowReason] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const extras = readExtras(part.talk_includes);
  // Presidente do programa e Oração não têm participações (vídeo, entrevista…).
  const noExtras = isFloatingType(part.part_type_label) || /presid|^ora[cç][aã]o\b/i.test(part.theme);
  const [showInfo, setShowInfo] = useState(!!part.instructions || extras.length > 0);
  const congRef = useRef<HTMLInputElement>(null);
  const head = useMemo(() => [part.part_time, part.outline_number ? `Nº${part.outline_number}` : null].filter(Boolean).join(" "), [part]);
  const tag = part.assigned_to === "co" || part.assigned_to === "branch" ? ASSIGNED_LABEL[part.assigned_to] : null;

  return (
    <li className="space-y-2 p-3 text-sm">
      <div className="flex items-start gap-2">
        <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">{head}</span>
        <span className="min-w-0 flex-1">
          <span className="block">{part.theme}</span>
          <span className="block text-xs text-muted-foreground">{[part.part_type_label, part.duration_min ? `${part.duration_min} min${isSeriesItem(part) ? " (informativo)" : ""}` : null, part.symposium && part.part_type_label !== "Simpósio" ? "Simpósio" : null].filter(Boolean).join(" · ")}</span>
          {part.symposium && part.assigned_to === "speaker" && part.duration_min == null && (
            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
              <input
                type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3} placeholder="min"
                aria-label="Tempo em minutos"
                className="h-7 w-14 rounded-md border border-destructive/50 bg-background px-2 text-center text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
                onBlur={(e) => { const n = parseDurationInput(e.currentTarget.value); if (n != null) void onPatch(part.id, { duration_min: n }); else e.currentTarget.value = ""; }}
              />
              <span className="text-muted-foreground">min</span>
              <span className="font-medium text-destructive">⚠ Falta inserir o tempo</span>
            </span>
          )}
          {part.assigned_to === "speaker" && part.speaker_name?.trim() && (
            <span className="mt-0.5 flex items-center gap-1 text-xs">
              {part.status === "confirmed" ? <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="h-3.5 w-3.5" />Confirmado</span>
                : part.status === "declined" ? <button type="button" onClick={() => setShowReason((v) => !v)} className="flex items-center gap-1 text-destructive"><XCircle className="h-3.5 w-3.5" />Recusado · ver motivo</button>
                : <span className="flex items-center gap-1 text-muted-foreground"><Circle className="h-3.5 w-3.5" />Aguardando resposta</span>}
            </span>
          )}
        </span>
        {tag && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">{tag}</span>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Opções da parte"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
            {part.assigned_to === "speaker" && (ev.link_mode === "personal"
              ? <DropdownMenuItem onClick={() => void onNewLink(part)}><Link2 className="mr-2 h-4 w-4" />Novo link</DropdownMenuItem>
              : <>
                  <DropdownMenuItem onClick={() => setPinOpen(true)}><KeyRound className="mr-2 h-4 w-4" />Ver ou alterar PIN</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void onNewPin(ev, part).then((r) => r && setPinState(r))}><RefreshCw className="mr-2 h-4 w-4" />Novo PIN</DropdownMenuItem>
                </>)}
            {part.assigned_to === "speaker" && (
              <DropdownMenuItem onClick={() => void onPatch(part.id, { show_next_speaker: !part.show_next_speaker })}>
                <CheckCircle2 className={`mr-2 h-4 w-4 ${part.show_next_speaker ? "text-primary" : "opacity-30"}`} />Informar próximo orador
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onAddAfter}><Plus className="mr-2 h-4 w-4" />Nova parte abaixo</DropdownMenuItem>
            <DropdownMenuItem disabled={first} onClick={() => onMove(-1)}><ArrowUp className="mr-2 h-4 w-4" />Subir</DropdownMenuItem>
            <DropdownMenuItem disabled={last} onClick={() => onMove(1)}><ArrowDown className="mr-2 h-4 w-4" />Descer</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {overlap && <p className="pl-16 text-xs text-destructive">Este horário começa antes do fim da parte anterior.</p>}
      {note && <p className="ml-16 w-fit rounded-lg bg-warning/15 px-2 py-1 text-xs font-medium text-warning-foreground">⚠ {note}</p>}
      {alsoIn && <p className="ml-16 w-fit rounded-lg bg-warning/15 px-2 py-1 text-xs font-medium text-warning-foreground">⚠ Este ancião também está na {alsoIn}.</p>}
      {part.assigned_to === "speaker" && (
        <div className="space-y-2 pl-16">
          <Input list="big-events-elders" placeholder="Ancião" defaultValue={part.speaker_name ?? ""}
            onBlur={(e) => {
              const name = e.target.value.trim();
              if (name === (part.speaker_name ?? "")) return;
              const cong = elders.find((x) => x.name === name)?.congregation;
              const patch: Partial<PartRow> = { speaker_name: name || null };
              if (cong && !part.speaker_congregation) { patch.speaker_congregation = cong; if (congRef.current) congRef.current.value = cong; }
              void onPatch(part.id, patch);
            }} />
          <Input ref={congRef} placeholder="Congregação do ancião" maxLength={120} defaultValue={part.speaker_congregation ?? ""}
            onBlur={(e) => e.target.value.trim() !== (part.speaker_congregation ?? "") && onPatch(part.id, { speaker_congregation: e.target.value.trim() || null })} />
          <button type="button" onClick={() => setShowInfo((v) => !v)} className="flex items-center gap-1 text-xs text-muted-foreground">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showInfo ? "" : "-rotate-90"}`} />Informações só deste convite
          </button>
          {showInfo && (
            <div className="space-y-2 rounded-2xl bg-muted/50 p-2.5">
              {!noExtras && <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Participações na parte</p>}
              {!noExtras && <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                {PART_EXTRAS.map((x) => (
                  <label key={x.id} className="flex min-h-8 items-center gap-2 text-xs">
                    <Checkbox checked={extras.includes(x.id)}
                      onCheckedChange={(v) => void onPatch(part.id, { talk_includes: withExtras(part.talk_includes, v === true ? [...extras, x.id] : extras.filter((e) => e !== x.id)) })} />
                    {x.label}
                  </label>
                ))}
              </div>}
              <Textarea rows={2} maxLength={1000} placeholder="Outras informações só para este ancião" defaultValue={part.instructions ?? ""}
                onBlur={(e) => e.target.value.trim() !== (part.instructions ?? "") && onPatch(part.id, { instructions: e.target.value.trim() || null })} />
            </div>
          )}
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => onCopy(ev, part)}><Copy className="h-3.5 w-3.5" />Copiar convite</Button>
          {showReason && part.decline_reason && <p className="rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">{part.decline_reason}</p>}
        </div>
      )}
      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>PIN do convite</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">O PIN é criado sozinho ao copiar o convite. Digite outro só se quiser trocar.</p>
          <Input inputMode="numeric" maxLength={6} className="h-11 text-center font-mono text-lg tracking-widest" value={pin} autoFocus
            placeholder={part.pin_hash ? "••••" : "4-6 números"} aria-label="PIN"
            onChange={(e) => setPinState(e.target.value.replace(/\D/g, ""))} />
          <DialogFooter>
            <Button onClick={() => {
              if (pin && pin !== readPin(part.id)) void onSetPin(ev, part, pin).then((r) => { if (!r) setPinState(readPin(part.id) ?? ""); else setPinOpen(false); });
              else setPinOpen(false);
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
