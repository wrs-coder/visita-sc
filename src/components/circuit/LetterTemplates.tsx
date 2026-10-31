// Pílula "Modelos" de Grandes Eventos: modelos de carta convite (só no aparelho).
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Copy, Eye, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { defaultTemplate, buildLetterModel, type LetterTemplate } from "@/lib/big-events/letter-template";
import { letterPdf } from "@/lib/big-events/letter-render";
import { saveBlob } from "@/lib/share";
import type { SyncState } from "@/lib/big-events/letter-template-sync";

type Field = { key: keyof LetterTemplate; label: string; rows?: number };
const GROUPS: Array<{ title: string; fields: Field[] }> = [
  { title: "Timbre", fields: [
    { key: "headerTitle", label: "Nome" }, { key: "headerSubtitle", label: "Linha abaixo do nome" },
    { key: "headerAddress", label: "Endereço" }, { key: "headerPhone", label: "Telefone / contato" },
  ] },
  { title: "Início da carta", fields: [
    { key: "refLine", label: "Ref." }, { key: "salutation", label: "Saudação" }, { key: "opening", label: "Texto de abertura", rows: 6 },
  ] },
  { title: "Informações e lembretes", fields: [
    { key: "remindersTitle", label: "Título" }, { key: "highlight", label: "Destaque (faixa cinza)", rows: 3 },
    { key: "reminders", label: "Lembretes (faixa verde, um parágrafo por linha)", rows: 7 },
    { key: "rehearsal", label: "Ensaio" }, { key: "rehearsalNote", label: "Observação do ensaio" },
  ] },
  { title: "Encerramento", fields: [
    { key: "closing", label: "Texto final", rows: 2 }, { key: "signoff", label: "Despedida" }, { key: "signature", label: "Assinatura" },
  ] },
];

export function LetterTemplates({ list, onChange, sync }: { list: LetterTemplate[]; onChange: (l: LetterTemplate[]) => void; sync?: SyncState }) {
  const [editing, setEditing] = useState<LetterTemplate | null>(null);

  const save = () => {
    if (!editing) return;
    const t = { ...editing, name: editing.name.trim() || "Modelo", updatedAt: new Date().toISOString() };
    onChange(list.some((x) => x.id === t.id) ? list.map((x) => (x.id === t.id ? t : x)) : [...list, t]);
    setEditing(null);
    toast.success("Modelo salvo");
  };
  const makeDefault = (id: string) => { const t = list.find((x) => x.id === id); if (t) onChange([t, ...list.filter((x) => x.id !== id)]); };
  const remove = (id: string) => {
    if (list.length <= 1) { toast.info("Mantenha pelo menos um modelo."); return; }
    if (confirm("Apagar este modelo?")) onChange(list.filter((x) => x.id !== id));
  };
  const preview = async (t: LetterTemplate) => {
    const m = buildLetterModel(t, { name: "Assembleia de circuito", event_date: new Date().toISOString().slice(0, 10), location: "Salão de Assembleias", extra_info: null, public_token: "exemplo", public_code: "exemplo1", link_mode: "pin" },
      { id: "x", sort_order: 0, part_time: "09:40", duration_min: 15, theme: "Tema de exemplo", outline_number: "7", instructions: null, part_type_label: "Discurso", assigned_to: "speaker", speaker_name: "Nome do orador", speaker_congregation: "Congregação", show_next_speaker: false },
      [], "123456");
    const bytes = await letterPdf(m);
    await saveBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), { filename: "Previa do modelo.pdf", mimeType: "application/pdf" });
  };

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="gap-1 px-2" onClick={() => setEditing(null)}><ChevronLeft className="h-4 w-4" />Modelos</Button>
          <span className="flex-1" />
          <Button size="sm" variant="outline" className="gap-1" onClick={() => preview(editing)}><Eye className="h-3.5 w-3.5" />Prévia</Button>
          <Button size="sm" onClick={save}>Salvar</Button>
        </div>
        <Card className="space-y-1 p-4">
          <Label className="text-xs">Nome do modelo</Label>
          <Input value={editing.name} maxLength={80} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
        </Card>
        <Card className="p-4 text-xs text-muted-foreground">
          O quadro da designação (evento, data, local, orador, parte, horário, tema, próximo orador, link e PIN) é preenchido sozinho com os dados de cada evento.
        </Card>
        {GROUPS.map((g) => (
          <Card key={g.title} className="space-y-3 p-4">
            <p className="text-sm font-semibold">{g.title}</p>
            {g.fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                {f.rows ? (
                  <Textarea rows={f.rows} maxLength={4000} value={String(editing[f.key] ?? "")} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} />
                ) : (
                  <Input maxLength={300} value={String(editing[f.key] ?? "")} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} />
                )}
              </div>
            ))}
          </Card>
        ))}
        <Button className="w-full" onClick={save}>Salvar modelo</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-sm text-muted-foreground">Modelos de carta convite. O primeiro é o padrão dos eventos.</p>
        <Button size="sm" className="gap-1" onClick={() => setEditing({ ...(list[0] ?? defaultTemplate()), id: crypto.randomUUID(), name: "Novo modelo" })}><Plus className="h-3.5 w-3.5" />Novo</Button>
      </div>
      {sync && (
        <p className="text-xs text-muted-foreground">
          {sync === "synced" ? "☁ Sincronizado entre seus aparelhos" : sync === "pending" ? "⟳ Salvo no aparelho · aguardando internet" : "Salvo no aparelho"}
        </p>
      )}
      {list.map((t, i) => (
        <Card key={t.id} className="flex items-center gap-2 p-3">
          <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setEditing({ ...t })}>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 truncate font-semibold">{t.name}{i === 0 && <Star className="h-3.5 w-3.5 fill-current text-primary" aria-label="Padrão" />}</span>
              <span className="block text-xs text-muted-foreground">{i === 0 ? "Padrão · " : ""}editado {new Date(t.updatedAt).toLocaleDateString("pt-BR")}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          {i > 0 && <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Tornar padrão" onClick={() => makeDefault(t.id)}><Star className="h-4 w-4" /></Button>}
          <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Duplicar" onClick={() => onChange([...list, { ...t, id: crypto.randomUUID(), name: `${t.name} (cópia)`, updatedAt: new Date().toISOString() }])}><Copy className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Apagar" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
        </Card>
      ))}
    </div>
  );
}
