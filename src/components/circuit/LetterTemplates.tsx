import { appConfirm } from "@/components/ui/app-dialogs";
// Pílula "Modelos" de Grandes Eventos: modelos de carta convite (só no aparelho).
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Copy, Eye, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { defaultTemplate, buildLetterModel, type LetterTemplate, type LetterColors, type LetterPart, LETTER_PALETTE, LETTER_PRESETS, LETTER_HEADER_STYLES, headerStyleOf, type LetterHeaderStyle, DEFAULT_LETTER_COLORS, sanitizeLetterColors, presetOf, resolveLetterColors, rgbCss } from "@/lib/big-events/letter-template";
import { CollapsibleSection } from "@/components/guest-workspace/CollapsibleSection";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

const PART_LABEL: Record<LetterPart, string> = { title: "Título e cabeçalho", box: "Caixa de designação", info: "Informações e lembretes", rule: "Filete decorativo" };

/** Papel timbrado: três cabeçalhos com miniatura (cores seguem a paleta escolhida). */
function HeaderStylePicker({ value, colors, onChange }: { value: LetterHeaderStyle; colors?: LetterColors; onChange: (v: LetterHeaderStyle) => void }) {
  const pal = resolveLetterColors(colors);
  const accent = rgbCss(pal.title), gold = rgbCss(pal.rule);
  const bar = (w: string, c?: string) => <span className="block h-[3px] rounded-full bg-muted-foreground/40" style={{ width: w, ...(c ? { background: c } : {}) }} />;
  return (
    <div className="grid grid-cols-3 gap-2">
      {LETTER_HEADER_STYLES.map((h) => (
        <button key={h.id} type="button" aria-pressed={value === h.id} onClick={() => onChange(h.id)}
          className={cn("flex flex-col items-stretch gap-1.5 rounded-2xl border p-2 text-left transition-colors", value === h.id ? "border-primary ring-2 ring-primary/30" : "hover:bg-muted")}>
          <span className="relative block aspect-[3/4] overflow-hidden rounded-lg border bg-card">
            {h.id === "classic" && (
              <span className="flex flex-col items-center gap-1 px-2 pt-2">
                {bar("60%", accent)}{bar("35%")}{bar("50%")}<span className="mt-0.5 block h-px w-1/2" style={{ background: gold }} />
              </span>
            )}
            {h.id === "formal" && (
              <span className="block px-2 pt-2">
                <span className="flex justify-between gap-1"><span className="flex w-1/2 flex-col gap-1">{bar("100%", accent)}{bar("60%")}</span><span className="flex w-1/3 flex-col items-end gap-1">{bar("100%")}{bar("70%")}</span></span>
                <span className="mt-1.5 block h-[1.5px] w-full" style={{ background: accent }} /><span className="mt-[2px] block h-px w-full" style={{ background: gold }} />
              </span>
            )}
            {h.id === "institutional" && (
              <>
                <span className="flex h-5 items-center justify-between px-1.5" style={{ background: accent, borderBottom: `2px solid ${gold}` }}>
                  <span className="block h-[3px] w-1/2 rounded-full bg-background/90" /><span className="block h-[3px] w-1/5 rounded-full bg-background/70" />
                </span>
                <span className="absolute inset-x-2 bottom-1.5 block border-t pt-1" style={{ borderColor: gold }}>{bar("70%")}</span>
              </>
            )}
            <span className="absolute inset-x-2 top-1/2 flex flex-col gap-1">{bar("90%")}{bar("80%")}{bar("85%")}</span>
          </span>
          <span className="text-xs font-semibold">{h.name}</span>
          <span className="text-[10px] leading-tight text-muted-foreground">{h.hint}</span>
        </button>
      ))}
    </div>
  );
}

/** Seção "Cores da carta": paletas prontas, ajuste por parte e prévia em miniatura. */
function LetterColorsEditor({ value, onChange }: { value?: LetterColors; onChange: (c: LetterColors) => void }) {
  const c = sanitizeLetterColors(value);
  const pal = resolveLetterColors(c);
  const [part, setPart] = useState<LetterPart | null>(null);
  const preset = presetOf(c);
  const sw = (id: string) => rgbCss(LETTER_PALETTE[id].rgb);
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Paleta</p>
        <div className="grid grid-cols-2 gap-2">
          {LETTER_PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => onChange({ ...p.colors })}
              className={cn("flex min-h-11 items-center gap-2 rounded-xl border px-3 text-left text-sm", preset === p.id && "border-primary bg-primary/10 font-semibold")}>
              <span className="flex -space-x-1">{[p.colors.title, p.colors.info, p.colors.rule].map((id, i) => <span key={i} className="h-4 w-4 rounded-full border border-background" style={{ background: sw(id) }} />)}</span>
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Ajustar por parte</p>
        <div className="divide-y rounded-xl border">
          {(Object.keys(PART_LABEL) as LetterPart[]).map((k) => (
            <button key={k} type="button" onClick={() => setPart(k)} className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm active:bg-accent/40">
              <span className="flex-1">{PART_LABEL[k]}</span>
              <span className="h-5 w-5 rounded-full border" style={{ background: sw(c[k]) }} aria-label={LETTER_PALETTE[c[k]].name} />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Prévia</p>
        <div className="space-y-2 rounded-xl border bg-card p-3 text-[10px]" style={{ color: "rgb(38,41,48)" }}>
          <p className="text-center font-serif text-sm font-bold" style={{ color: rgbCss(pal.title) }}>Nome do superintendente</p>
          <div className="mx-auto h-px w-3/5" style={{ background: rgbCss(pal.rule) }} />
          <div className="rounded-lg border p-2" style={{ borderColor: rgbCss(pal.rule), background: pal.boxFill ? rgbCss(pal.boxFill) : "transparent" }}>
            <p className="font-serif font-bold" style={{ color: rgbCss(pal.box) }}>DESIGNAÇÃO</p>
            <p>Discurso nº 13 · 09:40</p>
            <span className="mt-1 inline-block rounded-full px-2 py-0.5 font-bold" style={{ background: rgbCss(pal.box), color: "rgb(255,255,255)" }}>Clique aqui!</span>
          </div>
          <div className="flex rounded" style={{ background: rgbCss(pal.infoTint) }}>
            <span className="w-[3px] shrink-0" style={{ background: rgbCss(pal.info) }} />
            <p className="p-1.5">Informações e lembretes…</p>
          </div>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange({ ...DEFAULT_LETTER_COLORS })}>Restaurar cores padrão</Button>
      <Drawer open={part !== null} onOpenChange={(o) => !o && setPart(null)}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>{part ? PART_LABEL[part] : ""}</DrawerTitle></DrawerHeader>
          {part && (
            <div className="space-y-4 px-4 pb-safe">
              <div className="grid grid-cols-6 gap-3">
                {Object.entries(LETTER_PALETTE).map(([id, p]) => (
                  <button key={id} type="button" aria-label={p.name} aria-pressed={c[part] === id} onClick={() => onChange({ ...c, [part]: id })}
                    className={cn("aspect-square rounded-full border-2", c[part] === id ? "border-foreground" : "border-transparent")} style={{ background: sw(id) }} />
                ))}
              </div>
              {part === "box" && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex-1">Fundo da caixa</span>
                  {(["tint", "none"] as const).map((f) => (
                    <Button key={f} size="sm" variant={c.boxFill === f ? "default" : "outline"} onClick={() => onChange({ ...c, boxFill: f })}>{f === "tint" ? "Claro" : "Sem fundo"}</Button>
                  ))}
                </div>
              )}
              <Button className="w-full" onClick={() => setPart(null)}>Pronto</Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
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
  const remove = async (id: string) => {
    if (list.length <= 1) { toast.info("Mantenha pelo menos um modelo."); return; }
    if (await appConfirm("Apagar este modelo?")) onChange(list.filter((x) => x.id !== id));
  };
  const preview = async (t: LetterTemplate) => {
    const m = buildLetterModel(t, { name: "Assembleia de circuito", event_date: new Date().toISOString().slice(0, 10), location: "Salão de Assembleias", extra_info: null, public_token: "exemplo", public_code: "exemplo1", link_mode: "pin" },
      { id: "x", sort_order: 0, part_time: "09:40", duration_min: 15, theme: "Tema de exemplo", outline_number: "7", instructions: null, part_type_label: "Discurso", assigned_to: "speaker", speaker_name: "Nome do orador", speaker_congregation: "Congregação", show_next_speaker: false },
      [], "123456");
    const bytes = await (await import("@/lib/big-events/letter-render")).letterPdf(m);
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
          <Card key={g.title} className="p-3">
          <CollapsibleSection id={`letter.${g.title}`} title={g.title} defaultOpen={false}>
          <div className="space-y-3 px-1 pt-1">
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
          </div>
          </CollapsibleSection>
          </Card>
        ))}
        <Card className="p-3">
          <CollapsibleSection id="letter.header" title="Papel timbrado" defaultOpen={false}
            summary={LETTER_HEADER_STYLES.find((h) => h.id === headerStyleOf(editing))?.name}>
            <div className="px-1 pt-1"><HeaderStylePicker value={headerStyleOf(editing)} colors={editing.colors} onChange={(headerStyle) => setEditing({ ...editing, headerStyle })} /></div>
          </CollapsibleSection>
        </Card>
        <Card className="p-3">
          <CollapsibleSection id="letter.colors" title="Cores da carta" defaultOpen={false}
            summary={LETTER_PRESETS.find((p) => p.id === presetOf(editing.colors))?.name ?? "Personalizada"}>
            <div className="px-1 pt-1"><LetterColorsEditor value={editing.colors} onChange={(colors) => setEditing({ ...editing, colors })} /></div>
          </CollapsibleSection>
        </Card>
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
