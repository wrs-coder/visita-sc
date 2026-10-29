// Revisão antes de importar o itinerário (.ics / .csv). Visitas à congregação vão para "Visitas";
// qualquer outro evento vai para "Semanas sem visita". Nada é salvo antes de "Importar".
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { findConflict, matchCongregation, normalizeName, STRONG, type ImportRow } from "@/lib/itinerary-import";
import { buildCustomNotes } from "@/lib/itinerary-weeks";
import type { VisitPackage } from "@/lib/visit-packages";

interface Cong { id: string; name: string }
interface VisitLite { start_date: string; end_date: string; congregation_id: string }
interface Line extends ImportRow { congregationId: string | null; score: number; checked: boolean; conflict: string | null }

const aliasKey = (uid: string) => `itineraryImport.aliases.${uid}`;
const readAliases = (uid: string): Record<string, string> => { try { return JSON.parse(localStorage.getItem(aliasKey(uid)) ?? "{}"); } catch { return {}; } };
const fmt = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const NONE = "__none";

export function ImportItineraryDialog({ fileName, rows, congs, visits, packages, userId, onClose, onCreateVisit, onDone }: {
  fileName: string; rows: ImportRow[]; congs: Cong[]; visits: VisitLite[]; packages: VisitPackage[]; userId: string;
  onClose: () => void;
  onCreateVisit: (payload: { title: string; start_date: string; end_date: string; congregation_id: string }, pkg: VisitPackage | null) => Promise<boolean>;
  onDone: () => void;
}) {
  const [weeks, setWeeks] = useState<Array<{ start_date: string; end_date: string }>>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [pkgId, setPkgId] = useState(NONE);
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const congName = (id: string) => congs.find((c) => c.id === id)?.name ?? "—";

  useEffect(() => {
    void supabase.from("itinerary_weeks").select("start_date,end_date").then(({ data }) => setWeeks(data ?? []));
  }, []);

  useEffect(() => {
    const aliases = readAliases(userId);
    setLines(rows.map((r) => {
      const m = r.kind === "visit" && r.label ? matchCongregation(r.label, congs, aliases) : { id: null, score: 0 };
      const c = findConflict({ ...r, congregationId: m.id }, visits, weeks, congName);
      return { ...r, congregationId: m.id, score: m.score, conflict: c?.text ?? null,
        checked: !c && r.end >= today && (r.kind !== "visit" || !!m.id) };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, congs, visits, weeks, userId]);

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => {
    if (j !== i) return l;
    const n = { ...l, ...patch };
    if ("congregationId" in patch) {
      n.score = patch.congregationId ? 100 : 0;
      const c = findConflict(n, visits, weeks, congName);
      n.conflict = c?.text ?? null;
    }
    return n;
  }));

  const selected = lines.filter((l) => l.checked && (l.kind !== "visit" || l.congregationId));
  const counts = useMemo(() => ({
    visits: selected.filter((l) => l.kind === "visit").length,
    weeks: selected.filter((l) => l.kind !== "visit").length,
  }), [selected]);

  const confirm = async () => {
    if (!selected.length) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) { toast.error("Sem internet. Conecte-se para importar."); return; }
    setBusy(true);
    const pkg = packages.find((p) => p.id === pkgId) ?? null;
    const aliases = readAliases(userId);
    let ok = 0, fail = 0;
    for (const l of selected) {
      if (l.kind === "visit") {
        const done = await onCreateVisit({ title: l.training ? "Visita + Treinamento SCS" : "Visita", start_date: l.start, end_date: l.end, congregation_id: l.congregationId! }, pkg);
        if (done) { ok++; if (l.label) aliases[normalizeName(l.label)] = l.congregationId!; } else fail++;
      } else {
        const { error } = await supabase.from("itinerary_weeks").insert({
          week_type: l.kind === "pioneer" ? "pioneer" : "free", start_date: l.start, end_date: l.end,
          notes: l.kind === "free" ? buildCustomNotes(l.label, l.note ?? "") : l.note?.trim() || null,
        });
        if (error) fail++; else ok++;
      }
    }
    try { localStorage.setItem(aliasKey(userId), JSON.stringify(aliases)); } catch { /* */ }
    setBusy(false);
    if (fail) toast.warning(`${ok} importados, ${fail} com falha.`); else toast.success(`${ok} importados.`);
    onDone();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md max-h-[90dvh] flex flex-col">
        <DialogHeader><DialogTitle>Importar itinerário</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground truncate">{fileName} · {lines.length} semanas</p>
        {packages.length > 0 && (
          <div className="flex items-center gap-2">
            <Label className="shrink-0 text-xs">Pacote</Label>
            <Select value={pkgId} onValueChange={setPkgId}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Nenhum</SelectItem>
                {packages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <ul className="-mx-1 flex-1 divide-y overflow-y-auto rounded-lg border">
          {lines.map((l, i) => {
            const dot = l.kind !== "visit" ? null : !l.congregationId ? "🔴" : l.score >= STRONG ? "🟢" : "🟡";
            return (
              <li key={`${l.start}-${i}`} className="space-y-1.5 p-3 text-sm">
                <label className="flex items-center gap-2">
                  <Checkbox checked={l.checked} disabled={l.kind === "visit" && !l.congregationId} onCheckedChange={(v) => setLine(i, { checked: v === true })} />
                  <span className="flex-1 font-medium">{fmt(l.start)} – {fmt(l.end)}</span>
                  {dot && <span aria-hidden>{dot}</span>}
                </label>
                {l.kind === "visit" ? (
                  <div className="space-y-1 pl-6">
                    <p className="text-xs text-muted-foreground">No arquivo: “{l.label || "sem congregação"}”{l.training ? " · Treinamento SCS" : ""}</p>
                    <Select value={l.congregationId ?? NONE} onValueChange={(v) => setLine(i, { congregationId: v === NONE ? null : v, checked: v !== NONE })}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Selecionar…</SelectItem>
                        {congs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="pl-6 text-xs text-muted-foreground">Semana sem visita · {l.kind === "pioneer" ? "Semana de pioneiro" : l.label}</p>
                )}
                {l.conflict && <p className="flex items-center gap-1 pl-6 text-xs text-destructive"><AlertTriangle className="h-3.5 w-3.5" />{l.conflict}</p>}
                {!l.conflict && l.end < today && <p className="pl-6 text-xs text-muted-foreground">Semana já passou</p>}
              </li>
            );
          })}
        </ul>
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button>
          <Button disabled={busy || !selected.length} onClick={confirm}>
            {busy ? "Importando…" : `Importar ${counts.visits} visita${counts.visits === 1 ? "" : "s"}${counts.weeks ? ` + ${counts.weeks} semana${counts.weeks === 1 ? "" : "s"}` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
