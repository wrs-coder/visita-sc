// Modelos de pauta do SC: usar, salvar o atual, padrão para novas visitas, renomear, apagar,
// exportar/importar arquivo e voltar ao modelo original. Sincroniza entre os aparelhos da conta.
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, RotateCcw, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveBlob } from "@/lib/share";
import { applyTemplate, defaultBlocks, parseTemplateFile, templateToFile, type AgendaBlock } from "@/lib/elder-agenda/agenda";
import { useAgendaTemplates } from "./use-agenda-templates";

export function AgendaTemplatesDialog({ open, onOpenChange, blocks, onApply }: {
  open: boolean; onOpenChange: (v: boolean) => void; blocks: AgendaBlock[]; onApply: (blocks: AgendaBlock[]) => void;
}) {
  const t = useAgendaTemplates(open);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const run = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true);
    try { await fn(); if (ok) toast.success(ok); } catch { toast.error("Precisa de internet para mudar os modelos."); } finally { setBusy(false); }
  };
  const apply = (tpl: AgendaBlock[]) => { onApply(applyTemplate(blocks, tpl)); onOpenChange(false); };
  const onImport = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 1_000_000) { toast.error("Arquivo grande demais."); return; }
    const parsed = parseTemplateFile(await f.text());
    if (!parsed) { toast.error("Este arquivo não é um modelo de pauta."); return; }
    await run(() => t.create(parsed.name, parsed.blocks), `Modelo "${parsed.name}" importado.`);
  };
  const exportOne = async (n: string, b: AgendaBlock[]) => {
    const blob = new Blob([JSON.stringify(templateToFile(n, b), null, 2)], { type: "application/json" });
    await saveBlob(blob, { filename: `modelo-pauta-${n.replace(/[^\w-]+/g, "-").slice(0, 40) || "anciaos"}.json`, mimeType: "application/json" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Modelos de pauta</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Salvar a montagem atual como modelo</p>
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Minha pauta" maxLength={120} />
              <Button disabled={busy || !name.trim()} onClick={() => void run(async () => { await t.create(name.trim(), blocks, t.list.length === 0); setName(""); }, "Modelo salvo.")}>Salvar</Button>
            </div>
          </div>

          <div className="divide-y rounded-xl border">
            {t.loading && !t.list.length ? <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div> : null}
            {!t.loading && !t.list.length ? <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum modelo salvo ainda.</p> : null}
            {t.list.map((m) => (
              <div key={m.id} className="px-3 py-2.5 space-y-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button type="button" aria-label={m.is_default ? "Modelo padrão" : "Usar como padrão nas novas visitas"} onClick={() => void run(() => t.setDefault(m.is_default ? null : m.id))}
                    className={m.is_default ? "text-primary" : "text-muted-foreground"}><Star className={`h-4 w-4 ${m.is_default ? "fill-current" : ""}`} /></button>
                  <span className="flex-1 min-w-0 text-sm font-medium break-words">{m.name}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{m.blocks.length} blocos</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" onClick={() => apply(m.blocks)}>Usar</Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => { if (confirm(`Substituir "${m.name}" pela montagem atual?`)) void run(() => t.update(m.id, { blocks }), "Modelo atualizado."); }}>Atualizar</Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => { const n = prompt("Novo nome", m.name); if (n?.trim()) void run(() => t.update(m.id, { name: n.trim() })); }}>Renomear</Button>
                  <Button size="sm" variant="ghost" aria-label="Exportar" onClick={() => void exportOne(m.name, m.blocks)}><Download className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label="Apagar" disabled={busy} onClick={() => { if (confirm(`Apagar o modelo "${m.name}"?`)) void run(() => t.remove(m.id)); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">A estrela marca o modelo que já vem montado nas novas visitas.</p>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}><Upload className="h-4 w-4" />Importar</Button>
            <Button variant="outline" onClick={() => void exportOne("pauta-atual", blocks)}><Download className="h-4 w-4" />Exportar atual</Button>
          </div>
          <Button variant="ghost" className="w-full" onClick={() => { if (confirm("Voltar a pauta ao modelo original? O que já foi escrito nos blocos originais continua.")) apply(defaultBlocks()); }}>
            <RotateCcw className="h-4 w-4" />Restaurar modelo original
          </Button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { void onImport(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
