import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CODE_RE, displayName, generateCode, normalizeName, splitNumber, type FoundCongregation } from "@/lib/congregation-import";

type Row = FoundCongregation & { checked: boolean; code: string; exists: boolean };

export function buildRows(items: FoundCongregation[], existing: { name: string; invite_code: string }[]): Row[] {
  const existingNames = new Set(existing.map((c) => normalizeName(splitNumber(c.name).name)));
  const used = new Set(existing.map((c) => c.invite_code.toUpperCase()));
  return items.map((it) => {
    const exists = existingNames.has(normalizeName(it.name));
    const code = generateCode(used);
    used.add(code);
    return { ...it, exists, code, checked: !it.likelyTitle && !exists };
  });
}

export function CongregationImportDialog({ open, onOpenChange, initial, existing, onCreate, onDone }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Row[];
  existing: { name: string; invite_code: string }[];
  onCreate: (name: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  onDone: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [keepNumber, setKeepNumber] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const usedExisting = useMemo(() => new Set(existing.map((c) => c.invite_code.toUpperCase())), [existing]);
  const codeError = (r: Row, i: number): string | null => {
    if (!CODE_RE.test(r.code)) return "Use 4 a 6 letras ou números";
    if (usedExisting.has(r.code)) return "Código já usado";
    if (rows.some((o, j) => j !== i && o.checked && o.code === r.code)) return "Código repetido";
    return null;
  };
  const selected = rows.filter((r) => r.checked && !r.exists);
  const hasErrors = rows.some((r, i) => r.checked && !r.exists && codeError(r, i));
  const update = (i: number, patch: Partial<Row>) => setRows((p) => p.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setAll = (v: boolean) => setRows((p) => p.map((r) => ({ ...r, checked: v && !r.exists })));

  const submit = async () => {
    setBusy(true); setProgress(0);
    const failed: string[] = [];
    let created = 0;
    for (const r of selected) {
      const name = displayName(r.name, r.number, keepNumber);
      const res = await onCreate(name, r.code);
      if (res.ok) created++; else failed.push(`${name}: ${res.error ?? "erro"}`);
      setProgress((x) => x + 1);
    }
    setBusy(false);
    if (created) toast.success(`${created} congregação(ões) criada(s)`);
    if (failed.length) toast.error(`Não foi possível criar ${failed.length}: ${failed.slice(0, 2).join("; ")}`);
    onDone();
    if (!failed.length) onOpenChange(false);
    else setRows((p) => p.filter((r) => failed.some((f) => f.startsWith(displayName(r.name, r.number, keepNumber)))));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="flex max-h-[90dvh] max-w-md flex-col gap-3 p-4">
        <DialogHeader>
          <DialogTitle>Revisar importação</DialogTitle>
          <p className="text-xs text-muted-foreground">{rows.length} encontradas · {selected.length} marcadas</p>
        </DialogHeader>
        <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 text-sm">
          Manter número da congregação
          <Switch checked={keepNumber} onCheckedChange={setKeepNumber} />
        </label>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-9 flex-1 rounded-full" onClick={() => setAll(true)}>Marcar todas</Button>
          <Button size="sm" variant="outline" className="h-9 flex-1 rounded-full" onClick={() => setAll(false)}>Desmarcar</Button>
        </div>
        <div className="-mx-1 flex-1 divide-y overflow-y-auto rounded-xl border">
          {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum nome encontrado no arquivo.</p>}
          {rows.map((r, i) => {
            const err = r.checked && !r.exists ? codeError(r, i) : null;
            return (
              <div key={i} className={`space-y-1.5 p-3 ${r.exists ? "opacity-60" : ""}`}>
                <label className="flex min-h-8 items-center gap-3">
                  <Checkbox checked={r.checked} disabled={r.exists} onCheckedChange={(v) => update(i, { checked: v === true })} aria-label={r.name} />
                  <span className="min-w-0 flex-1 text-sm font-medium break-words">{displayName(r.name, r.number, keepNumber)}</span>
                </label>
                {r.exists ? (
                  <p className="flex items-center gap-1 pl-7 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" /> Já existe (será ignorada)</p>
                ) : r.checked ? (
                  <div className="flex flex-wrap items-center gap-2 pl-7">
                    {r.number && keepNumber && (
                      <button type="button" className="text-xs text-muted-foreground underline" onClick={() => update(i, { number: null })}>remover nº</button>
                    )}
                    <span className="text-xs text-muted-foreground">Código</span>
                    <Input value={r.code} inputMode="numeric" maxLength={6} aria-label={`Código de ${r.name}`}
                      onChange={(e) => update(i, { code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                      className={`h-9 w-24 font-mono tracking-wider ${err ? "border-destructive" : ""}`} />
                    {err && <span className="text-xs text-destructive">{err}</span>}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <DialogFooter className="flex-row gap-2">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="flex-1" disabled={busy || !selected.length || hasErrors} onClick={submit}>
            {busy ? `Criando ${progress}/${selected.length}…` : `Criar ${selected.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
