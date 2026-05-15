import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Plus, Trash2, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/notas")({ component: Page });

interface Note { id: string; visit_id: string; superintendent_id: string; title: string | null; content: string; updated_at: string; }

function Page() {
  const { visit } = useActiveVisit();
  const { user, role } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

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

  const add = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("private_notes").insert({ visit_id: visit.id, superintendent_id: user.id, title: "Nova nota", content: "" }).select().single();
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
    const { error } = await supabase.from("private_notes").delete().eq("id", id);
    if (error) toast.error(error.message); else setNotes((n) => n.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Lock className="h-5 w-5" /></div>
          <div><h1 className="text-2xl md:text-3xl font-bold">Notas Privadas</h1><p className="text-sm text-muted-foreground mt-1">Visíveis apenas para você</p></div>
        </div>
        <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Nova nota</Button>
      </div>

      <div className="grid gap-3">
        {notes.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Nenhuma nota ainda.</CardContent></Card>}
        {notes.map((n) => <NoteCard key={n.id} note={n} savingId={savingId} update={update} remove={remove} />)}
      </div>
    </div>
  );
}

function NoteCard({ note, savingId, update, remove }: { note: Note; savingId: string | null; update: (id: string, p: Partial<Note>) => void; remove: (id: string) => void }) {
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
