// Pílula "JW Library": notas bíblicas importadas de um backup .jwlibrary.
// Ficam separadas dos Pontos altos; podem ser copiadas para lá uma a uma.
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Upload, Search, Trash2, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getLocalizedBookName } from "@/lib/bible-canon";
import type { WsData } from "@/lib/guest-workspace-store";
import type { JwNote } from "@/lib/jwlibrary-import";
import { cn } from "@/lib/utils";

export function JwLibraryPanel({ data, update }: { data: WsData; update: (fn: (d: WsData) => WsData) => void }) {
  const { t, i18n } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<JwNote[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const name = (b: string) => getLocalizedBookName(b, i18n.language) ?? b;
  const ref = (n: JwNote) => `${name(n.bookId)} ${n.chapter}${n.verse ? `:${n.verse}` : ""}`;
  const existing = useMemo(() => new Set(data.jwNotes.map((n) => n.id)), [data.jwNotes]);

  const group = (list: JwNote[]) => {
    const m = new Map<string, JwNote[]>();
    for (const n of list) { const a = m.get(n.bookId) ?? []; a.push(n); m.set(n.bookId, a); }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const { parseJwLibrary } = await import("@/lib/jwlibrary-import");
      const notes = await parseJwLibrary(f);
      if (!notes.length) { toast.info(t("jw.none", { defaultValue: "Nenhuma nota bíblica encontrada neste backup." })); return; }
      setFileName(`${f.name} · ${(f.size / 1048576).toFixed(1)} MB`);
      setFound(notes);
      setSel(new Set(notes.map((n) => n.id)));
    } catch (e) {
      const code = (e as Error)?.message;
      toast.error(code === "too_big" ? t("jw.tooBig", { defaultValue: "Arquivo grande demais." })
        : t("jw.invalid", { defaultValue: "Não parece um backup do JW Library (.jwlibrary)." }));
    } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const doImport = () => {
    if (!found) return;
    const picked = found.filter((n) => sel.has(n.id));
    const novas = picked.filter((n) => !existing.has(n.id)).length;
    update((d) => {
      const ids = new Set(picked.map((n) => n.id));
      return { ...d, jwNotes: [...picked, ...d.jwNotes.filter((n) => !ids.has(n.id))].slice(0, 5000) };
    });
    toast.success(t("jw.done", { defaultValue: "{{n}} notas importadas ({{u}} atualizadas).", n: novas, u: picked.length - novas }));
    setFound(null);
  };

  const copyToHighlights = (n: JwNote) => {
    const id = `hl-${n.id}`.slice(0, 64);
    update((d) => d.highlights.some((h) => h.id === id) ? d : ({ ...d, highlights: [{ id, ref: ref(n), bookId: n.bookId,
      text: [n.title, n.text].filter(Boolean).join("\n\n"), date: new Date().toISOString() }, ...d.highlights] }));
    toast.success(t("jw.copied", { defaultValue: "Copiado para Pontos altos." }));
  };

  const s = q.trim().toLowerCase();
  const visible = s ? data.jwNotes.filter((n) => ref(n).toLowerCase().includes(s) || n.title.toLowerCase().includes(s) || n.text.toLowerCase().includes(s) || n.tags.some((x) => x.toLowerCase().includes(s))) : data.jwNotes;
  const toggleSet = (set: Set<string>, k: string) => { const c = new Set(set); if (c.has(k)) c.delete(k); else c.add(k); return c; };

  return (
    <div className="space-y-2">
      <input ref={fileRef} type="file" accept=".jwlibrary,application/zip,application/octet-stream" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{t("jw.import", { defaultValue: "Importar backup" })}
        </Button>
        {data.jwNotes.length > 0 && <>
          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={t("common.search", { defaultValue: "Buscar" })} onClick={() => setSearchOpen((v) => !v)}><Search className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="ml-auto h-8 w-8 text-muted-foreground" aria-label={t("jw.remove", { defaultValue: "Remover importação" })} onClick={() => setConfirmRemove(true)}><Trash2 className="h-4 w-4" /></Button>
        </>}
      </div>
      {searchOpen && <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("jw.search", { defaultValue: "Buscar referência, texto ou etiqueta" })} />}

      {data.jwNotes.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{t("jw.empty", { defaultValue: "Importe um backup do JW Library para ver aqui suas notas bíblicas. Seus Pontos altos não são alterados." })}</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {group(visible).map(([b, list]) => {
            const isOpen = open.has(b) || !!s;
            return (
              <li key={b}>
                <button type="button" onClick={() => setOpen((o) => toggleSet(o, b))} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold">
                  <span>{name(b)} <span className="font-normal text-muted-foreground">({list.length})</span></span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && <ul className="space-y-2 px-4 pb-3">
                  {list.map((n) => (
                    <li key={n.id} className="rounded-lg bg-muted/40 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-primary">{ref(n)}</p>
                        <button type="button" onClick={() => copyToHighlights(n)} className="text-muted-foreground hover:text-primary" aria-label={t("jw.copy", { defaultValue: "Copiar para Pontos altos" })}><Sparkles className="h-3.5 w-3.5" /></button>
                      </div>
                      {n.title && <p className={cn("text-sm", !n.text && "italic text-muted-foreground")}>{n.title}</p>}
                      {n.text && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{n.text}</p>}
                      {n.tags.length > 0 && <p className="mt-1 text-[11px] text-muted-foreground">{n.tags.map((x) => `#${x}`).join(" ")}</p>}
                    </li>
                  ))}
                </ul>}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!found} onOpenChange={(o) => !o && setFound(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("jw.previewTitle", { defaultValue: "Notas bíblicas encontradas" })}</DialogTitle>
            <DialogDescription>{fileName}</DialogDescription>
          </DialogHeader>
          {found && <>
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox checked={sel.size === found.length} onCheckedChange={(v) => setSel(v ? new Set(found.map((n) => n.id)) : new Set())} />
              {t("jw.all", { defaultValue: "Todas ({{n}})", n: found.length })} · {t("jw.already", { defaultValue: "{{n}} já importadas", n: found.filter((n) => existing.has(n.id)).length })}
            </label>
            <ul className="divide-y rounded-xl border">
              {group(found).map(([b, list]) => {
                const on = list.filter((n) => sel.has(n.id)).length;
                return (
                  <li key={b} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <Checkbox checked={on === list.length ? true : on ? "indeterminate" : false}
                      onCheckedChange={(v) => setSel((cur) => { const c = new Set(cur); for (const n of list) { if (v) c.add(n.id); else c.delete(n.id); } return c; })} />
                    <span className="flex-1">{name(b)}</span><span className="text-muted-foreground">{on}/{list.length}</span>
                  </li>
                );
              })}
            </ul>
          </>}
          <DialogFooter>
            <Button disabled={!sel.size} onClick={doImport}>{t("jw.confirm", { defaultValue: "Importar {{n}}", n: sel.size })}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("jw.removeTitle", { defaultValue: "Remover notas do JW Library?" })}</DialogTitle>
            <DialogDescription>{t("jw.removeDesc", { defaultValue: "Apaga só as {{n}} notas importadas. Seus Pontos altos continuam como estão.", n: data.jwNotes.length })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(false)}>{t("common.cancel", { defaultValue: "Cancelar" })}</Button>
            <Button variant="destructive" onClick={() => { update((d) => ({ ...d, jwNotes: [] })); setConfirmRemove(false); }}>{t("jw.remove", { defaultValue: "Remover importação" })}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
