import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CODE_RE, displayName, generateCode, normalizeName, splitNumber, type FoundCongregation } from "@/lib/congregation-import";
import { normalizeName as matchNorm, similarity, STRONG } from "@/lib/itinerary-import";

type Existing = { id?: string; name: string; invite_code: string };
export type SimilarMatch = { id: string; name: string; code: string; score: number };
export type Row = FoundCongregation & { checked: boolean; code: string; exists: boolean; match: SimilarMatch | null; action: "keep" | "rename" | "create" };

const ABBR: Record<string, string> = { jd: "jardim", jdm: "jardim", vl: "vila", pq: "parque", res: "residencial", sta: "santa", sto: "santo", n: "nossa", sra: "senhora" };
/** Nome comparável: sem número, acentos, "Cong." e com abreviações comuns expandidas. */
export function comparableName(raw: string): string {
  return matchNorm(splitNumber(raw).name).split(" ").map((w) => ABBR[w] ?? w).join(" ");
}

export function buildRows(items: FoundCongregation[], existing: Existing[]): Row[] {
  const existingNames = new Set(existing.map((c) => normalizeName(splitNumber(c.name).name)));
  const used = new Set(existing.map((c) => c.invite_code.toUpperCase()));
  const taken = new Set<string>();
  return items.map((it) => {
    const exists = existingNames.has(normalizeName(it.name));
    let match: SimilarMatch | null = null;
    if (!exists && !it.likelyTitle) {
      const n = comparableName(it.name);
      for (const c of existing) {
        if (!c.id || taken.has(c.id)) continue;
        const sc = similarity(n, comparableName(c.name));
        if (sc >= STRONG && (!match || sc > match.score)) match = { id: c.id, name: c.name, code: c.invite_code, score: sc };
      }
      if (match) taken.add(match.id);
    }
    const code = generateCode(used);
    used.add(code);
    return { ...it, exists, match, action: "keep", code, checked: !it.likelyTitle && !exists && !match };
  });
}

export function CongregationImportDialog({ open, onOpenChange, initial, existing, onCreate, onRename, onDone }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Row[];
  existing: Existing[];
  onCreate: (name: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  onRename?: (id: string, name: string, code: string) => Promise<{ ok: boolean; error?: string }>;
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
  const willCreate = (r: Row) => r.checked && !r.exists && (!r.match || r.action === "create");
  const selected = rows.filter(willCreate);
  const renames = rows.filter((r) => r.match && r.action === "rename");
  const total = selected.length + renames.length;
  const hasErrors = rows.some((r, i) => willCreate(r) && codeError(r, i));
  const update = (i: number, patch: Partial<Row>) => setRows((p) => p.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setAll = (v: boolean) => setRows((p) => p.map((r) => (r.match ? r : { ...r, checked: v && !r.exists })));
  const similarCount = rows.filter((r) => r.match).length;

  const submit = async () => {
    setBusy(true); setProgress(0);
    const failed: string[] = [];
    let created = 0, renamed = 0;
    for (const r of renames) {
      const name = displayName(r.name, r.number, keepNumber);
      const res = onRename ? await onRename(r.match!.id, name, r.match!.code) : { ok: false, error: "indisponível" };
      if (res.ok) renamed++; else failed.push(`${name}: ${res.error ?? "erro"}`);
      setProgress((x) => x + 1);
    }
    for (const r of selected) {
      const name = displayName(r.name, r.number, keepNumber);
      const res = await onCreate(name, r.code);
      if (res.ok) created++; else failed.push(`${name}: ${res.error ?? "erro"}`);
      setProgress((x) => x + 1);
    }
    setBusy(false);
    if (created) toast.success(`${created} congregação(ões) criada(s)`);
    if (renamed) toast.success(`${renamed} nome(s) atualizado(s) — códigos mantidos`);
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
          <p className="text-xs text-muted-foreground">{rows.length} encontradas{similarCount ? ` · ${similarCount} parecida(s)` : ""} · {selected.length} marcadas</p>
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
            const err = willCreate(r) ? codeError(r, i) : null;
            if (r.match) {
              const opts = [["rename", "Substituir nome"], ["keep", "Manter como está"], ["create", "Criar como nova"]] as const;
              return (
                <div key={i} className="space-y-2 bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Parecida com uma sua</p>
                  <div className="text-sm">
                    <p><span className="text-muted-foreground">No arquivo: </span><span className="font-medium break-words">{displayName(r.name, r.number, keepNumber)}</span></p>
                    <p><span className="text-muted-foreground">No app: </span><span className="break-words">{r.match.name}</span> · <span className="font-mono">{r.match.code}</span></p>
                  </div>
                  <div className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1" role="radiogroup" aria-label={`Ação para ${r.name}`}>
                    {opts.map(([v, label]) => (
                      <button key={v} type="button" role="radio" aria-checked={r.action === v}
                        onClick={() => update(i, { action: v, checked: v === "create" })}
                        className={`min-h-9 rounded-full px-1 text-[11px] font-medium leading-tight ${r.action === v ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{label}</button>
                    ))}
                  </div>
                  {r.action === "rename" && <p className="text-xs text-muted-foreground">O código {r.match.code} não muda. Visitas e anotações continuam iguais.</p>}
                  {r.action === "create" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">Código</span>
                      <Input value={r.code} inputMode="numeric" maxLength={6} aria-label={`Código de ${r.name}`}
                        onChange={(e) => update(i, { code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                        className={`h-9 w-24 font-mono tracking-wider ${err ? "border-destructive" : ""}`} />
                      {err && <span className="text-xs text-destructive">{err}</span>}
                    </div>
                  )}
                </div>
              );
            }
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
          <Button className="flex-1" disabled={busy || !total || hasErrors} onClick={submit}>
            {busy ? `Salvando ${progress}/${total}…` : [selected.length ? `Criar ${selected.length}` : "", renames.length ? `Renomear ${renames.length}` : ""].filter(Boolean).join(" · ") || "Criar 0"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
