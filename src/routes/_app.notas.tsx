import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Lock, Plus, Trash2, Loader2, Check, HeartHandshake, FileText,
  ClipboardList, Mic, ThumbsUp, Mail, FileDown, Share2, Search, X, Building2,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
// jsPDF é carregado sob demanda apenas quando o utilizador clica em "Exportar PDF".
import type jsPDFType from "jspdf";
import { offlineInsert, offlineUpdate, offlineDelete } from "@/lib/offline-supabase";

function makeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC4122 v4 fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const Route = createFileRoute("/_app/notas")({ component: Page });

type NoteType = "free" | "pastoral" | "s303" | "oradores" | "recomendados" | "peticoes";

interface Note {
  id: string;
  visit_id: string | null;
  congregation_id: string;
  superintendent_id: string;
  title: string | null; content: string;
  note_type: NoteType;
  companion: string | null; involved_names: string | null; additional_info: string | null;
  note_date: string | null;
  payload: Record<string, string> | null;
  updated_at: string;
}

const CATEGORIES: { value: NoteType; label: string; icon: React.ComponentType<{ className?: string }>; addLabel: string; empty: string }[] = [
  { value: "free", label: "Notas livres", icon: FileText, addLabel: "Nova nota livre", empty: "Nenhuma nota ainda." },
  { value: "pastoral", label: "Pastoreio", icon: HeartHandshake, addLabel: "Nova visita de pastoreio", empty: "Nenhuma visita registrada." },
  { value: "s303", label: "S-303", icon: ClipboardList, addLabel: "Novo registro S-303", empty: "Nenhum registro ainda." },
  { value: "oradores", label: "Oradores", icon: Mic, addLabel: "Novo orador", empty: "Nenhum orador registrado." },
  { value: "recomendados", label: "Recomendados", icon: ThumbsUp, addLabel: "Novo recomendado", empty: "Nenhum recomendado." },
  { value: "peticoes", label: "Petições", icon: Mail, addLabel: "Nova petição", empty: "Nenhuma petição." },
];

const NOTAS_CONG_KEY = "notas_privadas_congregation_id";

function Page() {
  const { user, role } = useAuth();
  const [congs, setCongs] = useState<Array<{ id: string; name: string }>>([]);
  const [congId, setCongId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(NOTAS_CONG_KEY);
  });
  const [notes, setNotes] = useState<Note[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [tab, setTab] = useState<NoteType>("free");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Carrega congregações do superintendente (independente do estado global).
  useEffect(() => {
    if (role !== "superintendent" || !user) return;
    supabase
      .from("congregations")
      .select("id,name")
      .eq("superintendent_id", user.id)
      .order("name")
      .then(({ data }) => {
        const list = data ?? [];
        setCongs(list);
        // Se nada selecionado e há congregações, escolhe a primeira.
        setCongId((prev) => {
          if (prev && list.some((c) => c.id === prev)) return prev;
          return list[0]?.id ?? null;
        });
      });
  }, [role, user]);

  useEffect(() => {
    if (congId) localStorage.setItem(NOTAS_CONG_KEY, congId);
  }, [congId]);

  const congregation = useMemo(
    () => congs.find((c) => c.id === congId) ?? null,
    [congs, congId],
  );

  useEffect(() => {
    if (!congId) { setNotes([]); return; }
    const load = async () => {
      const { data } = await supabase
        .from("private_notes")
        .select("*")
        .eq("congregation_id", congId)
        .order("created_at", { ascending: false });
      setNotes((data ?? []) as unknown as Note[]);
      setSelected(new Set());
    };
    load();
  }, [congId]);

  const add = async (note_type: NoteType) => {
    if (!user || !congId) return;
    const base: Partial<Note> = note_type === "free"
      ? { title: "Nova nota", content: "" }
      : note_type === "pastoral"
        ? { title: "Visita de pastoreio", content: "", note_date: format(new Date(), "yyyy-MM-dd") }
        : { title: CATEGORIES.find((c) => c.value === note_type)?.label ?? "Nova nota", content: "", payload: {} };
    // ID gerado no cliente para suportar criação 100% offline.
    const id = makeUuid();
    const now = new Date().toISOString();
    const optimistic: Note = {
      id,
      visit_id: null,
      congregation_id: congId,
      superintendent_id: user.id,
      title: (base.title as string) ?? null,
      content: (base.content as string) ?? "",
      note_type,
      companion: null,
      involved_names: null,
      additional_info: null,
      note_date: (base.note_date as string) ?? null,
      payload: (base.payload as Record<string, string>) ?? null,
      updated_at: now,
    };
    setNotes((n) => [optimistic, ...n]);
    const { error, queued } = await offlineInsert("private_notes", {
      id, congregation_id: congId, superintendent_id: user.id, note_type, ...base,
    } as Record<string, unknown>);
    if (error) {
      setNotes((n) => n.filter((x) => x.id !== id));
      toast.error(error.message);
    } else if (queued) {
      toast.success("Nota criada offline");
    }
  };

  const update = async (id: string, patch: Partial<Note>) => {
    setSavingId(id);
    setNotes((n) => n.map((x) => x.id === id ? { ...x, ...patch } : x));
    const { error, queued } = await offlineUpdate("private_notes", patch as Record<string, unknown>, { id });
    setSavingId(null);
    if (error) toast.error(error.message);
    else if (queued) toast.success("Salvo offline");
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta nota?")) return;
    const { error } = await offlineDelete("private_notes", { id });
    if (error) toast.error(error.message); else {
      setNotes((n) => n.filter((x) => x.id !== id));
      setSelected((s) => { const next = new Set(s); next.delete(id); return next; });
    }
  };

  const toggleSelect = (id: string) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
    return notes.filter((n) => {
      if ((n.note_type ?? "free") !== tab) return false;
      if (q) {
        const hay = [n.title, n.content, n.companion, n.involved_names, n.additional_info, ...Object.values(n.payload ?? {})]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (from || to) {
        const ref = n.note_date ? new Date(n.note_date + "T12:00:00").getTime() : new Date(n.updated_at).getTime();
        if (from && ref < from) return false;
        if (to && ref > to) return false;
      }
      return true;
    });
  }, [notes, tab, query, dateFrom, dateTo]);
  const selectedNotes = useMemo(() => notes.filter((n) => selected.has(n.id)), [notes, selected]);

  if (role !== "superintendent") return <Card><CardContent className="p-6 text-sm">Acesso restrito ao superintendente.</CardContent></Card>;
  if (congs.length === 0) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Cadastre uma congregação para começar.</CardContent></Card>;


  const exportPdf = async () => {
    if (selectedNotes.length === 0) { toast.error("Por favor, selecione pelo menos uma nota para exportar."); return; }
    const { default: jsPDF } = await import("jspdf");
    const doc: jsPDFType = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 48;
    const headerH = 56;
    const footerH = 28;
    const contentTop = margin + headerH;
    const contentBottom = pageH - margin - footerH;
    const generatedAt = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
    let y = contentTop;
    let pageNum = 1;
    let totalPages = 1;

    const drawHeader = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(20);
      doc.text("Notas Privadas — Confidencial", margin, margin + 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text(`${congregation?.name ?? ""}`, margin, margin + 20);
      doc.text(generatedAt, pageW - margin, margin + 20, { align: "right" });
      doc.setDrawColor(210);
      doc.setLineWidth(0.6);
      doc.line(margin, margin + headerH - 12, pageW - margin, margin + headerH - 12);
      doc.setTextColor(0);
    };
    const drawFooter = () => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.setDrawColor(220);
      doc.line(margin, pageH - margin - footerH + 8, pageW - margin, pageH - margin - footerH + 8);
      doc.text("Confidencial — uso exclusivo do superintendente", margin, pageH - margin - 6);
      doc.text(`Página ${pageNum} de ${totalPages}`, pageW - margin, pageH - margin - 6, { align: "right" });
      doc.setTextColor(0);
    };
    const newPage = () => {
      drawFooter();
      doc.addPage();
      pageNum++;
      y = contentTop;
      drawHeader();
    };
    const ensure = (needed: number) => { if (y + needed > contentBottom) newPage(); };
    const writeLine = (text: string, size = 10, bold = false, color = 0) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(color);
      const lh = size * 1.35;
      const lines = doc.splitTextToSize(text || " ", pageW - margin * 2);
      for (const ln of lines) {
        ensure(lh);
        doc.text(ln, margin, y);
        y += lh;
      }
      doc.setTextColor(0);
    };

    drawHeader();
    selectedNotes.forEach((n, i) => {
      if (i > 0) {
        y += 8;
        ensure(24);
        doc.setDrawColor(230);
        doc.setLineWidth(0.4);
        doc.line(margin, y, pageW - margin, y);
        y += 14;
      }
      const cat = CATEGORIES.find((c) => c.value === n.note_type)?.label ?? "Nota";
      ensure(40);
      writeLine(cat.toUpperCase(), 8, true, 110);
      y += 2;
      writeLine(n.title ?? "(sem título)", 13, true);
      y += 4;
      renderNoteToPdf(n, writeLine);
    });

    // finalize: stamp total page count on every page
    totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      pageNum = p;
      // overwrite footer area with white to avoid double-print, then redraw
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, pageH - margin - footerH, pageW - margin * 2, footerH, "F");
      drawFooter();
    }

    doc.save(`notas-privadas-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
  };

  const shareWhatsapp = () => {
    if (selectedNotes.length === 0) { toast.error("Selecione ao menos uma nota."); return; }
    const L: string[] = [];
    L.push(`*Notas Privadas — Confidencial*`);
    L.push(`${congregation?.name ?? ""}`);
    selectedNotes.forEach((n) => {
      const cat = CATEGORIES.find((c) => c.value === n.note_type)?.label ?? "Nota";
      L.push("", `*[${cat}] ${n.title ?? ""}*`);
      L.push(...noteToTextLines(n));
    });
    const url = `https://wa.me/?text=${encodeURIComponent(L.join("\n"))}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Lock className="h-5 w-5" /></div>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold">Notas Privadas</h1>
          <p className="text-sm text-muted-foreground mt-1">Visíveis apenas para você{congregation ? ` • ${congregation.name}` : ""}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <Label className="text-xs text-muted-foreground">Congregação (apenas para esta aba)</Label>
            <Select value={congId ?? ""} onValueChange={(v) => setCongId(v)}>
              <SelectTrigger><SelectValue placeholder="Selecione uma congregação..." /></SelectTrigger>
              <SelectContent>
                {congs.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>


      {selected.size > 0 && (
        <Card className="border-primary/40">
          <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm">{selected.size} nota(s) selecionada(s)</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Limpar</Button>
              <Button size="sm" variant="outline" onClick={exportPdf}><FileDown className="h-3.5 w-3.5 mr-1" />PDF</Button>
              <Button size="sm" onClick={shareWhatsapp}><Share2 className="h-3.5 w-3.5 mr-1" />WhatsApp</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as NoteType)}>
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full h-auto">
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.value} value={c.value} className="text-xs">
              <c.icon className="h-3.5 w-3.5 mr-1" />{c.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <Card className="mt-3">
          <CardContent className="p-3 grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
            <div>
              <Label className="text-xs">Buscar por título ou conteúdo</Label>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Digite para filtrar..." className="pl-7" />
              </div>
            </div>
            <div>
              <Label className="text-xs">De</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Até</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            {(query || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setQuery(""); setDateFrom(""); setDateTo(""); }}>
                <X className="h-3.5 w-3.5 mr-1" />Limpar
              </Button>
            )}
          </CardContent>
        </Card>

        {CATEGORIES.map((c) => (
          <TabsContent key={c.value} value={c.value} className="space-y-3 mt-3">
            <Button onClick={() => add(c.value)} variant="outline" className="w-full"><Plus className="h-4 w-4 mr-1" />{c.addLabel}</Button>
            {filtered.length === 0 && tab === c.value && (
              <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">{c.empty}</CardContent></Card>
            )}
            {tab === c.value && filtered.map((n) => (
              <NoteCard
                key={n.id} note={n} savingId={savingId} update={update} remove={remove}
                checked={selected.has(n.id)} onToggleSelect={() => toggleSelect(n.id)}
              />
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function renderNoteToPdf(n: Note, writeLine: (t: string, s?: number, b?: boolean) => void) {
  const p = n.payload ?? {};
  const field = (label: string, value?: string | null) => {
    if (!value) return;
    writeLine(label, 10, true);
    writeLine(value, 10);
  };
  switch (n.note_type) {
    case "free":
      field("Conteúdo:", n.content);
      break;
    case "pastoral":
      if (n.note_date) writeLine(`Data: ${format(parseISO(n.note_date), "dd/MM/yyyy", { locale: ptBR })}`, 10);
      field("Acompanhante:", n.companion);
      field("Envolvidos:", n.involved_names);
      field("Informações adicionais:", n.additional_info);
      break;
    case "s303":
      field("Destaques positivos e elogios:", p.positivos);
      field("Pontos para encorajar (Atos 11:23):", p.encorajar);
      field("Pontos preocupantes (Tito 1:5):", p.preocupantes);
      break;
    case "oradores":
      field("Nome do orador:", p.nome);
      field("Classificação:", p.classificacao);
      field("Habilidades como orador:", p.habilidades);
      field("Observações sobre o orador:", p.observacoes);
      break;
    case "recomendados":
      field("Nome:", p.nome);
      field("Recomendação:", p.tipo);
      field("Informações do corpo de anciãos:", p.corpo);
      field("Observações do superintendente:", p.super);
      break;
    case "peticoes":
      field("Nome:", p.nome);
      field("Petição:", p.tipo);
      field("Informações do corpo de anciãos:", p.corpo);
      field("Observações do superintendente:", p.super);
      break;
  }
}

function noteToTextLines(n: Note): string[] {
  const L: string[] = [];
  const p = n.payload ?? {};
  const add = (label: string, value?: string | null) => { if (value) L.push(`• ${label}: ${value}`); };
  switch (n.note_type) {
    case "free":
      if (n.content) L.push(n.content);
      break;
    case "pastoral":
      if (n.note_date) L.push(`• Data: ${format(parseISO(n.note_date), "dd/MM/yyyy", { locale: ptBR })}`);
      add("Acompanhante", n.companion);
      add("Envolvidos", n.involved_names);
      add("Informações adicionais", n.additional_info);
      break;
    case "s303":
      add("Destaques positivos", p.positivos);
      add("Encorajar (Atos 11:23)", p.encorajar);
      add("Preocupantes (Tito 1:5)", p.preocupantes);
      break;
    case "oradores":
      add("Nome", p.nome);
      add("Classificação", p.classificacao);
      add("Habilidades", p.habilidades);
      add("Observações", p.observacoes);
      break;
    case "recomendados":
      add("Nome", p.nome);
      add("Recomendação", p.tipo);
      add("Corpo de anciãos", p.corpo);
      add("Superintendente", p.super);
      break;
    case "peticoes":
      add("Nome", p.nome);
      add("Petição", p.tipo);
      add("Corpo de anciãos", p.corpo);
      add("Superintendente", p.super);
      break;
  }
  return L;
}

function NoteCard(props: {
  note: Note; savingId: string | null;
  update: (id: string, p: Partial<Note>) => void;
  remove: (id: string) => void;
  checked: boolean; onToggleSelect: () => void;
}) {
  const { note } = props;
  switch (note.note_type) {
    case "free": return <FreeNoteCard {...props} />;
    case "pastoral": return <PastoralNoteCard {...props} />;
    default: return <StructuredNoteCard {...props} />;
  }
}

function CardHeader({ checked, onToggleSelect, onRemove, right }: { checked: boolean; onToggleSelect: () => void; onRemove: () => void; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Checkbox checked={checked} onCheckedChange={onToggleSelect} />
        <span className="text-xs text-muted-foreground">{right}</span>
      </div>
      <Button size="icon" variant="ghost" onClick={onRemove}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
    </div>
  );
}

function FreeNoteCard({ note, savingId, update, remove, checked, onToggleSelect }: { note: Note; savingId: string | null; update: (id: string, p: Partial<Note>) => void; remove: (id: string) => void; checked: boolean; onToggleSelect: () => void }) {
  const [title, setTitle] = useState(note.title ?? "");
  const [content, setContent] = useState(note.content);
  useEffect(() => { setTitle(note.title ?? ""); setContent(note.content); }, [note.id, note.title, note.content]);
  const dirty = title !== (note.title ?? "") || content !== note.content;
  const everSaved = !!note.title || !!note.content;
  const handleSave = () => { if (dirty) update(note.id, { title, content }); };
  return (
    <Card className="shadow-card">
      <CardContent className="p-4 space-y-2">
        <CardHeader checked={checked} onToggleSelect={onToggleSelect} onRemove={() => remove(note.id)} />
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="font-semibold border-0 px-0 focus-visible:ring-0 shadow-none" placeholder="Título" />
        <Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Anotações..." />
        <div className="flex justify-end">
          <Button size="sm" disabled={!dirty || savingId === note.id} onClick={handleSave}>
            {savingId === note.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
            {everSaved ? "Salvar alterações" : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PastoralNoteCard({ note, savingId, update, remove, checked, onToggleSelect }: { note: Note; savingId: string | null; update: (id: string, p: Partial<Note>) => void; remove: (id: string) => void; checked: boolean; onToggleSelect: () => void }) {
  const [date, setDate] = useState(note.note_date ?? "");
  const [companion, setCompanion] = useState(note.companion ?? "");
  const [involved, setInvolved] = useState(note.involved_names ?? "");
  const [additional, setAdditional] = useState(note.additional_info ?? "");
  useEffect(() => {
    setDate(note.note_date ?? ""); setCompanion(note.companion ?? "");
    setInvolved(note.involved_names ?? ""); setAdditional(note.additional_info ?? "");
  }, [note.id, note.note_date, note.companion, note.involved_names, note.additional_info]);
  const dirty = date !== (note.note_date ?? "") || companion !== (note.companion ?? "") || involved !== (note.involved_names ?? "") || additional !== (note.additional_info ?? "");
  const everSaved = !!(note.companion || note.involved_names || note.additional_info);
  const handleSave = () => { if (dirty) update(note.id, { note_date: date || null, companion, involved_names: involved, additional_info: additional }); };
  return (
    <Card className="shadow-card">
      <CardContent className="p-4 space-y-3">
        <CardHeader
          checked={checked} onToggleSelect={onToggleSelect} onRemove={() => remove(note.id)}
          right={note.note_date ? format(parseISO(note.note_date), "EEE, d MMM yyyy", { locale: ptBR }) : "Sem data"}
        />
        <div className="grid grid-cols-1 gap-2">
          <div><Label className="text-xs">Data da visita</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label className="text-xs">Acompanhante</Label><Input value={companion} onChange={(e) => setCompanion(e.target.value)} placeholder="Nome do acompanhante" /></div>
          <div><Label className="text-xs">Nome dos envolvidos</Label><Input value={involved} onChange={(e) => setInvolved(e.target.value)} placeholder="Pessoas visitadas" /></div>
          <div><Label className="text-xs">Informações adicionais</Label><Textarea rows={4} value={additional} onChange={(e) => setAdditional(e.target.value)} placeholder="Pontos discutidos, encorajamento, próximos passos..." /></div>
        </div>
        <div className="flex justify-end">
          <Button size="sm" disabled={!dirty || savingId === note.id} onClick={handleSave}>
            {savingId === note.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
            {everSaved ? "Salvar alterações" : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface StructuredFieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
}

const STRUCTURED_DEFS: Record<string, StructuredFieldDef[]> = {
  s303: [
    { key: "positivos", label: "Destaques positivos e elogios", type: "textarea" },
    { key: "encorajar", label: "Pontos para encorajar (Atos 11:23)", type: "textarea" },
    { key: "preocupantes", label: "Pontos preocupantes (Tito 1:5)", type: "textarea" },
  ],
  oradores: [
    { key: "nome", label: "Nome do orador", type: "text" },
    { key: "classificacao", label: "Classificação", type: "select", options: ["A", "B", "C", "D"] },
    { key: "habilidades", label: "Descrição das habilidades como orador", type: "textarea" },
    { key: "observacoes", label: "Observações sobre o próprio orador", type: "textarea" },
  ],
  recomendados: [
    { key: "nome", label: "Nome", type: "text" },
    { key: "tipo", label: "Recomendação", type: "select", options: ["Ancião", "Servo ministerial", "CCA", "Cancelamento"] },
    { key: "corpo", label: "Informações do corpo de anciãos", type: "textarea" },
    { key: "super", label: "Observações do superintendente", type: "textarea" },
  ],
  peticoes: [
    { key: "nome", label: "Nome", type: "text" },
    { key: "tipo", label: "Petição", type: "select", options: ["A-8", "G-8", "Outras"] },
    { key: "corpo", label: "Informações do corpo de anciãos", type: "textarea" },
    { key: "super", label: "Observações do superintendente", type: "textarea" },
  ],
};

function StructuredNoteCard({ note, savingId, update, remove, checked, onToggleSelect }: { note: Note; savingId: string | null; update: (id: string, p: Partial<Note>) => void; remove: (id: string) => void; checked: boolean; onToggleSelect: () => void }) {
  const defs = STRUCTURED_DEFS[note.note_type] ?? [];
  const initial = note.payload ?? {};
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [title, setTitle] = useState(note.title ?? "");
  useEffect(() => { setValues(note.payload ?? {}); setTitle(note.title ?? ""); }, [note.id, note.payload, note.title]);
  const dirty = title !== (note.title ?? "") || JSON.stringify(values) !== JSON.stringify(note.payload ?? {});
  const everSaved = Object.values(note.payload ?? {}).some(Boolean);
  const handleSave = () => { if (dirty) update(note.id, { title, payload: values }); };
  const setField = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));
  return (
    <Card className="shadow-card">
      <CardContent className="p-4 space-y-3">
        <CardHeader checked={checked} onToggleSelect={onToggleSelect} onRemove={() => remove(note.id)} />
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="font-semibold border-0 px-0 focus-visible:ring-0 shadow-none" placeholder="Título" />
        <div className="grid grid-cols-1 gap-2">
          {defs.map((f) => (
            <div key={f.key}>
              <Label className="text-xs">{f.label}</Label>
              {f.type === "text" && (
                <Input value={values[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)} />
              )}
              {f.type === "textarea" && (
                <Textarea rows={4} value={values[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)} />
              )}
              {f.type === "select" && (
                <Select value={values[f.key] ?? ""} onValueChange={(v) => setField(f.key, v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {f.options?.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button size="sm" disabled={!dirty || savingId === note.id} onClick={handleSave}>
            {savingId === note.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
            {everSaved ? "Salvar alterações" : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
