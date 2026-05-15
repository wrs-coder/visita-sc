import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Lock, Plus, Trash2, Loader2, Check, HeartHandshake, FileText } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/notas")({ component: Page });

type NoteType = "free" | "pastoral";
interface Note {
  id: string; visit_id: string; superintendent_id: string;
  title: string | null; content: string;
  note_type: NoteType;
  companion: string | null; involved_names: string | null; additional_info: string | null;
  note_date: string | null;
  updated_at: string;
}

function Page() {
  const { visit } = useActiveVisit();
  const { user, role } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [tab, setTab] = useState<NoteType>("free");

  useEffect(() => {
    if (!visit) return;
    const load = async () => {
      const { data } = await supabase.from("private_notes").select("*").eq("visit_id", visit.id).order("created_at", { ascending: false });
      setNotes((data ?? []) as Note[]);
    };
    load();
  }, [visit]);

  if (role !== "superintendent") return <Card><CardContent className="p-6 text-sm">Acesso restrito ao superintendente.</CardContent></Card>;
  if (!visit) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma visita ativa.</CardContent></Card>;

  const add = async (note_type: NoteType) => {
    if (!user) return;
    const base = note_type === "free"
      ? { title: "Nova nota", content: "" }
      : { title: "Visita de pastoreio", content: "", note_date: format(new Date(), "yyyy-MM-dd") };
    const { data, error } = await supabase.from("private_notes").insert({
      visit_id: visit.id, superintendent_id: user.id, note_type, ...base,
    }).select().single();
    if (error) toast.error(error.message); else if (data) setNotes([data as Note, ...notes]);
  };

  const update = async (id: string, patch: Partial<Note>) => {
    setSavingId(id);
    setNotes((n) => n.map((x) => x.id === id ? { ...x, ...patch } : x));
    const { error } = await supabase.from("private_notes").update(patch).eq("id", id);
    setSavingId(null);
    if (error) toast.error(error.message);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta nota?")) return;
    const { error } = await supabase.from("private_notes").delete().eq("id", id);
    if (error) toast.error(error.message); else setNotes((n) => n.filter((x) => x.id !== id));
  };

  const filtered = notes.filter((n) => (n.note_type ?? "free") === tab);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Lock className="h-5 w-5" /></div>
        <div><h1 className="text-2xl md:text-3xl font-bold">Notas Privadas</h1><p className="text-sm text-muted-foreground mt-1">Visíveis apenas para você</p></div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as NoteType)}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="free"><FileText className="h-3.5 w-3.5 mr-1" />Notas livres</TabsTrigger>
          <TabsTrigger value="pastoral"><HeartHandshake className="h-3.5 w-3.5 mr-1" />Visita de pastoreio</TabsTrigger>
        </TabsList>

        <TabsContent value="free" className="space-y-3 mt-3">
          <Button onClick={() => add("free")} variant="outline" className="w-full"><Plus className="h-4 w-4 mr-1" />Nova nota livre</Button>
          {filtered.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Nenhuma nota ainda.</CardContent></Card>}
          {filtered.map((n) => <FreeNoteCard key={n.id} note={n} savingId={savingId} update={update} remove={remove} />)}
        </TabsContent>

        <TabsContent value="pastoral" className="space-y-3 mt-3">
          <Button onClick={() => add("pastoral")} variant="outline" className="w-full"><Plus className="h-4 w-4 mr-1" />Nova visita de pastoreio</Button>
          {filtered.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Nenhuma visita registrada.</CardContent></Card>}
          {filtered.map((n) => <PastoralNoteCard key={n.id} note={n} savingId={savingId} update={update} remove={remove} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FreeNoteCard({ note, savingId, update, remove }: { note: Note; savingId: string | null; update: (id: string, p: Partial<Note>) => void; remove: (id: string) => void }) {
  const [title, setTitle] = useState(note.title ?? "");
  const [content, setContent] = useState(note.content);
  useEffect(() => { setTitle(note.title ?? ""); setContent(note.content); }, [note.id]);
  return (
    <Card className="shadow-card">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => { if (title !== (note.title ?? "")) update(note.id, { title }); }} className="font-semibold border-0 px-0 focus-visible:ring-0 shadow-none" placeholder="Título" />
          {savingId === note.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : <Check className="h-3.5 w-3.5 text-success" />}
          <Button size="icon" variant="ghost" onClick={() => remove(note.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
        </div>
        <Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} onBlur={() => { if (content !== note.content) update(note.id, { content }); }} placeholder="Anotações..." />
      </CardContent>
    </Card>
  );
}

function PastoralNoteCard({ note, savingId, update, remove }: { note: Note; savingId: string | null; update: (id: string, p: Partial<Note>) => void; remove: (id: string) => void }) {
  const [date, setDate] = useState(note.note_date ?? "");
  const [companion, setCompanion] = useState(note.companion ?? "");
  const [involved, setInvolved] = useState(note.involved_names ?? "");
  const [additional, setAdditional] = useState(note.additional_info ?? "");
  useEffect(() => {
    setDate(note.note_date ?? "");
    setCompanion(note.companion ?? "");
    setInvolved(note.involved_names ?? "");
    setAdditional(note.additional_info ?? "");
  }, [note.id]);
  return (
    <Card className="shadow-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {note.note_date ? format(parseISO(note.note_date), "EEE, d MMM yyyy", { locale: ptBR }) : "Sem data"}
          </div>
          <div className="flex items-center gap-1">
            {savingId === note.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : <Check className="h-3.5 w-3.5 text-success" />}
            <Button size="icon" variant="ghost" onClick={() => remove(note.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <div><Label className="text-xs">Data da visita</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} onBlur={() => update(note.id, { note_date: date || null })} /></div>
          <div><Label className="text-xs">Acompanhante</Label><Input value={companion} onChange={(e) => setCompanion(e.target.value)} onBlur={() => update(note.id, { companion })} placeholder="Nome do acompanhante" /></div>
          <div><Label className="text-xs">Nome dos envolvidos</Label><Input value={involved} onChange={(e) => setInvolved(e.target.value)} onBlur={() => update(note.id, { involved_names: involved })} placeholder="Pessoas visitadas" /></div>
          <div><Label className="text-xs">Informações adicionais</Label><Textarea rows={4} value={additional} onChange={(e) => setAdditional(e.target.value)} onBlur={() => update(note.id, { additional_info: additional })} placeholder="Pontos discutidos, encorajamento, próximos passos..." /></div>
        </div>
      </CardContent>
    </Card>
  );
}
