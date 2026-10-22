// Seções Anotações e Estudo Pessoal da esposa, com Modo Foco e gaveta.
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, FileText, FolderOpen, Plus, Settings2, Trash2, Upload, BookOpen, Search, X, Save, Eye, PenLine, BookMarked, StickyNote, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BibleManagerDialog } from "@/components/bible/BibleManagerDialog";
import { saveBlob } from "@/lib/share";
import { createJsPdfCompat, slugify } from "@/lib/pdf/pdf-engine";
import { cn } from "@/lib/utils";
import {
  loadWs, saveWs, emptyWs, buildWsBackup, readWsBackup, itemToText, WS_COLORS, wsSessionKey, toNoteHtml, htmlToPlain, verseNoteHtml,
  type WsData, type WsItem, type WsKind,
} from "@/lib/guest-workspace-store";
import { readGuestSession } from "@/lib/guest-session";
import { BibleReadingTab } from "./BibleReadingTab";
import { RichOutlineContent } from "@/lib/rich-content";
import { getActiveLibrary, type BibleLibrary } from "@/lib/bible-notes-store";
import { refHtml, noteBlockHtml, internalLinkHtml, filterWsItems } from "@/lib/guest-workspace-store";

const THEME_SUGGESTIONS = ["Qualidades Cristãs", "História Bíblica", "Adoração Matinal"];
function Mark({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded bg-accent px-0.5 text-accent-foreground">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}
function snippet(plain: string, q: string) {
  if (!q) return plain.slice(0, 120);
  const i = plain.toLowerCase().indexOf(q);
  return i < 40 ? plain.slice(0, 120) : "…" + plain.slice(i - 30, i + 90);
}
const RichNoteEditor = lazy(() => import("@/components/notes/RichNoteEditor").then((m) => ({ default: m.RichNoteEditor })));

export type GuestSection = "week" | "notes" | "study";
const SECTION_KEY = "guest.workspace.section";
const STUDY_KEY = "guest.workspace.studyTab";

export function useGuestSection() {
  const [section, setSection] = useState<GuestSection>("week");
  useEffect(() => {
    try { const s = localStorage.getItem(SECTION_KEY); if (s === "notes" || s === "study") setSection(s); } catch { /* */ }
  }, []);
  const change = (s: GuestSection) => { setSection(s); try { localStorage.setItem(SECTION_KEY, s); } catch { /* */ } };
  return [section, change] as const;
}

export function GuestSectionNav({ value, onChange }: { value: GuestSection; onChange: (s: GuestSection) => void }) {
  const { t } = useTranslation();
  const items: Array<[GuestSection, string]> = [
    ["week", t("guestWs.week", { defaultValue: "Semana da Visita" })],
    ["notes", t("guestWs.notes", { defaultValue: "Anotações" })],
    ["study", t("guestWs.study", { defaultValue: "Estudo Pessoal" })],
  ];
  return (
    <div role="tablist" aria-label={t("guestWs.sections", { defaultValue: "Seções" })} className="grid grid-cols-3 gap-1 rounded-xl border bg-card p-1 shadow-sm">
      {items.map(([id, label]) => (
        <button key={id} type="button" role="tab" aria-selected={value === id} onClick={() => onChange(id)}
          className={cn("min-h-9 rounded-lg px-1 text-xs font-semibold transition-colors md:text-sm",
            value === id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent/60")}>
          {label}
        </button>
      ))}
    </div>
  );
}

const colorDot: Record<string, string> = { primary: "bg-primary", accent: "bg-accent", secondary: "bg-secondary", muted: "bg-muted-foreground" };

export function GuestWorkspace({ section }: { section: "notes" | "study" }) {
  const { t } = useTranslation();
  const [data, setData] = useState<WsData>(emptyWs);
  const [ready, setReady] = useState(false);
  const [studyTab, setStudyTab] = useState<"bible" | "research">("bible");
  const [openId, setOpenId] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [folder, setFolder] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const skRef = useRef("anon");
  const pending = useRef<WsData | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const flush = () => {
    window.clearTimeout(timer.current);
    const d = pending.current; pending.current = null;
    if (d) void saveWs(skRef.current, d);
  };

  useEffect(() => {
    skRef.current = wsSessionKey(readGuestSession()?.code);
    let alive = true;
    void loadWs(skRef.current).then((d) => { if (alive) { setData(d); setReady(true); } });
    try { if (localStorage.getItem(STUDY_KEY) === "research") setStudyTab("research"); } catch { /* */ }
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => { alive = false; flush(); document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", flush); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const update = (fn: (d: WsData) => WsData) => setData((d) => {
    const n = fn(d);
    pending.current = n;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 400);
    return n;
  });

  if (!ready) return <p className="py-10 text-center text-sm text-muted-foreground">{t("guestWs.loading", { defaultValue: "Carregando…" })}</p>;

  const kind: WsKind = section === "notes" ? "note" : studyTab;
  const q = query.trim().toLowerCase();
  const list = filterWsItems(data.items, { kind, folder, color, query: q });
  const open = data.items.find((i) => i.id === openId) ?? null;

  const create = () => {
    const item: WsItem = { id: crypto.randomUUID(), kind, title: "", body: "", folderId: folder, color, updatedAt: new Date().toISOString() };
    update((d) => ({ ...d, items: [item, ...d.items] }));
    setFreshId(item.id);
    setOpenId(item.id);
  };
  const createFromVerse = (ref: string, text: string) => {
    const item: WsItem = { id: crypto.randomUUID(), kind: "bible", title: ref, body: verseNoteHtml(ref, text), folderId: null, color: null, updatedAt: new Date().toISOString() };
    update((d) => ({ ...d, items: [item, ...d.items] }));
    setOpenId(item.id);
  };
  const kindFolders = data.folders.filter((f) => !f.kind || f.kind === kind);
  const addFolder = (preset?: string) => {
    const name = (preset ?? window.prompt(t("guestWs.newFolder", { defaultValue: "Nova pasta" })))?.trim();
    if (name) update((d) => ({ ...d, folders: [...d.folders, { id: crypto.randomUUID(), name: name.slice(0, 120), kind }] }));
  };
  const renameFolder = (id: string) => {
    const cur = data.folders.find((f) => f.id === id);
    const name = window.prompt(t("guestWs.renameFolder", { defaultValue: "Renomear pasta" }), cur?.name)?.trim();
    if (name) update((d) => ({ ...d, folders: d.folders.map((f) => f.id === id ? { ...f, name: name.slice(0, 120) } : f) }));
  };
  const deleteFolder = (id: string) => {
    if (!window.confirm(t("guestWs.confirmDeleteFolder", { defaultValue: "Apagar a pasta? As anotações continuam, sem pasta." }))) return;
    update((d) => ({ ...d, folders: d.folders.filter((f) => f.id !== id), items: d.items.map((i) => i.folderId === id ? { ...i, folderId: null } : i) }));
    setFolder(null);
  };

  if (open) {
    return <FocusEditor key={open.id} item={open} data={data} startEdit={freshId === open.id || !open.body.trim()}
      onSave={() => { flush(); toast.success(t("guestWs.saved", { defaultValue: "Salvo" })); }}
      onOpenItem={(id) => { if (data.items.some((i) => i.id === id)) setOpenId(id); else toast.error(t("guestWs.linkMissing", { defaultValue: "Item não encontrado." })); }}
      onChange={(p) => update((d) => ({ ...d, items: d.items.map((i) => i.id === open.id ? { ...i, ...p, updatedAt: new Date().toISOString() } : i) }))}
      onDelete={() => { update((d) => ({ ...d, items: d.items.filter((i) => i.id !== open.id) })); setOpenId(null); }}
      onClose={() => { setOpenId(null); setFreshId(null); }} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {section === "study" ? (
          <Tabs value={studyTab} onValueChange={(v) => { setStudyTab(v as "bible" | "research"); try { localStorage.setItem(STUDY_KEY, v); } catch { /* */ } }} className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bible">{t("guestWs.bible", { defaultValue: "Leitura da Bíblia" })}</TabsTrigger>
              <TabsTrigger value="research">{t("guestWs.research", { defaultValue: "Pesquisas Pessoais" })}</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : <h2 className="flex-1 text-sm font-semibold text-muted-foreground">{t("guestWs.notes", { defaultValue: "Anotações" })}</h2>}
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label={t("guestWs.drawer", { defaultValue: "Pastas e configurações" })} onClick={() => setSheet(true)}>
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      {(() => { const block = (<div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <FolderOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
        <button type="button" onClick={() => setFolder(null)} className={cn("rounded-full border px-3 py-1 text-xs", !folder ? "bg-primary text-primary-foreground" : "hover:bg-accent/60")}>{t("guestWs.all", { defaultValue: "Todas" })}</button>
        {kindFolders.map((f) => (
          <button key={f.id} type="button" onClick={() => setFolder(f.id)} className={cn("rounded-full border px-3 py-1 text-xs", folder === f.id ? "bg-primary text-primary-foreground" : "hover:bg-accent/60")}>{f.name} <span className="opacity-70">{data.items.filter((i) => i.kind === kind && i.folderId === f.id).length}</span></button>
        ))}
        {kind === "research" && !data.folders.some((f) => f.kind === "research") && THEME_SUGGESTIONS.map((n) => (
          <button key={n} type="button" onClick={() => addFolder(n)} className="rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground hover:bg-accent/60">+ {n}</button>
        ))}
        <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => addFolder()}><Plus className="h-3.5 w-3.5" />{t("guestWs.folder", { defaultValue: "Pasta" })}</Button>
        {folder && <>
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => renameFolder(folder)}>{t("guestWs.rename", { defaultValue: "Renomear" })}</Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => deleteFolder(folder)}>{t("guestWs.delete", { defaultValue: "Apagar" })}</Button>
        </>}
      </div>
      <div className="sticky top-14 z-10 -mx-1 bg-background px-1 py-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("guestWs.searchKw", { defaultValue: "Buscar no título ou no texto…" })} className="h-9 pl-8 pr-8" aria-label={t("guestWs.search", { defaultValue: "Pesquisar" })} />
          {query && <button type="button" onClick={() => setQuery("")} aria-label={t("guestWs.clear", { defaultValue: "Limpar" })} className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>}
        </div>
        {q && <p className="pt-1 text-xs text-muted-foreground">{t("guestWs.found", { defaultValue: "{{count}} encontrada(s)", count: list.length })}</p>}
      </div>
      <Button onClick={create} variant="outline" className="w-full justify-start gap-2 border-dashed">
        <Plus className="h-4 w-4" />{t("guestWs.new", { defaultValue: "Nova" })}
      </Button>

      {list.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("guestWs.empty", { defaultValue: "Nada por aqui ainda. Toque em “Nova” para começar." })}</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {list.map((i) => (
            <li key={i.id}>
              <button type="button" onClick={() => setOpenId(i.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent/40">
                {i.color && <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", colorDot[i.color])} />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium"><Mark text={i.title || t("guestWs.untitled", { defaultValue: "Sem título" })} q={q} /></span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {i.folderId && <span className="mr-1 rounded bg-muted px-1">{data.folders.find((f) => f.id === i.folderId)?.name}</span>}
                    <Mark text={snippet(htmlToPlain(i.body), q) || "—"} q={q} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      </div>);
      return section === "study" && studyTab === "bible"
        ? <BibleReadingTab data={data} update={update} notes={block} onNote={createFromVerse} /> : block; })()}

      <WorkspaceSheet open={sheet} onOpenChange={setSheet} data={data} update={update}
        folder={folder} setFolder={setFolder} color={color} setColor={setColor} />
    </div>
  );
}

function FocusEditor({ item, data, onChange, onDelete, onClose, onSave, onOpenItem, startEdit }: {
  item: WsItem; data: WsData; onChange: (p: Partial<WsItem>) => void; onDelete: () => void; onClose: () => void;
  onSave: () => void; onOpenItem: (id: string) => void; startEdit: boolean;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"read" | "edit">(startEdit ? "edit" : "read");
  const [library, setLibrary] = useState<BibleLibrary | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  useEffect(() => { void getActiveLibrary().then(setLibrary).catch(() => null); }, []);
  const append = (html: string) => { onChange({ body: toNoteHtml(item.body) + html }); };
  const addRef = () => { const r = window.prompt(t("guestWs.refPrompt", { defaultValue: "Referência (ex.: Jo 3:16)" }))?.trim(); if (r) append(refHtml(r)); };
  const addNote = () => { const n = window.prompt(t("guestWs.notePrompt", { defaultValue: "Nota explicativa" }))?.trim(); if (n) append(noteBlockHtml(n)); };
  const others = data.items.filter((i) => i.id !== item.id && (i.kind === "research" || i.kind === "note"));
  const size = { sm: "text-sm", md: "text-base", lg: "text-lg" }[data.settings.fontSize];
  const exportAs = async (fmt: "txt" | "md" | "pdf") => {
    const name = slugify(item.title || "anotacao") || "anotacao";
    let blob: Blob;
    if (fmt === "pdf") {
      const pdf = await createJsPdfCompat({ unit: "mm" });
      let y = 20;
      pdf.setFont(true); pdf.setFontSize(16);
      for (const l of pdf.splitTextToSize(item.title || "Sem título", pdf.pageW - 30)) { pdf.text(l, 15, y); y += 8; }
      pdf.setFont(false); pdf.setFontSize(11); y += 4;
      for (const l of pdf.splitTextToSize(htmlToPlain(item.body), pdf.pageW - 30)) {
        if (y > pdf.pageH - 15) { pdf.addPage(); y = 20; }
        pdf.text(l, 15, y); y += 5.5;
      }
      blob = await pdf.output("blob");
    } else {
      blob = new Blob([itemToText(item, fmt === "md")], { type: fmt === "md" ? "text/markdown" : "text/plain" });
    }
    await saveBlob(blob, { filename: `${name}.${fmt}`, mimeType: blob.type });
  };
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-1 px-2 py-2">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1 text-muted-foreground"><ArrowLeft className="h-4 w-4" />{t("guestWs.back", { defaultValue: "Voltar" })}</Button>
        <div className="flex-1" />
        <div className="flex rounded-full border p-0.5" role="radiogroup">
          <button type="button" role="radio" aria-checked={mode === "read"} onClick={() => setMode("read")} className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs", mode === "read" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}><Eye className="h-3.5 w-3.5" />{t("guestWs.readMode", { defaultValue: "Ler" })}</button>
          <button type="button" role="radio" aria-checked={mode === "edit"} onClick={() => setMode("edit")} className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs", mode === "edit" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}><PenLine className="h-3.5 w-3.5" />{t("guestWs.editMode", { defaultValue: "Editar" })}</button>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onSave} aria-label={t("guestWs.save", { defaultValue: "Salvar" })}><Save className="h-4 w-4" /></Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label={t("guestWs.export", { defaultValue: "Exportar" })}><Download className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportAs("txt")}>Texto (.txt)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAs("md")}>Markdown (.md)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAs("pdf")}>PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground" aria-label={t("guestWs.delete", { defaultValue: "Apagar" })}
          onClick={() => { if (window.confirm(t("guestWs.confirmDelete", { defaultValue: "Apagar este item?" }))) onDelete(); }}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className={cn("mx-auto flex w-full flex-1 flex-col overflow-y-auto px-5 pb-6", data.settings.width === "wide" ? "max-w-4xl" : "max-w-2xl")}>
        <input value={item.title} onChange={(e) => onChange({ title: e.target.value })} autoFocus={!item.title}
          placeholder={t("guestWs.titlePh", { defaultValue: "Título" })}
          className="w-full bg-transparent py-2 text-2xl font-semibold outline-none placeholder:text-muted-foreground/50" />
        <select value={item.folderId ?? ""} onChange={(e) => onChange({ folderId: e.target.value || null })}
          aria-label={t("guestWs.moveFolder", { defaultValue: "Pasta" })} className="mb-2 h-8 w-fit rounded-md border bg-background px-2 text-xs">
          <option value="">{t("guestWs.noFolder", { defaultValue: "Sem pasta" })}</option>
          {data.folders.filter((f) => !f.kind || f.kind === item.kind).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        {mode === "edit" && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={addRef}><BookMarked className="h-3.5 w-3.5" />{t("guestWs.addRef", { defaultValue: "Referência" })}</Button>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={addNote}><StickyNote className="h-3.5 w-3.5" />{t("guestWs.addNote", { defaultValue: "Nota" })}</Button>
            <DropdownMenu open={linkOpen} onOpenChange={setLinkOpen}>
              <DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="h-7 gap-1 text-xs"><Link2 className="h-3.5 w-3.5" />{t("guestWs.addLink", { defaultValue: "Link interno" })}</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                {others.length === 0 ? <DropdownMenuItem disabled>{t("guestWs.noOthers", { defaultValue: "Nenhuma outra pesquisa ou anotação" })}</DropdownMenuItem>
                  : others.map((o) => <DropdownMenuItem key={o.id} onClick={() => append(internalLinkHtml(o.id, o.title || t("guestWs.untitled", { defaultValue: "Sem título" })))}>{o.title || t("guestWs.untitled", { defaultValue: "Sem título" })}</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {mode === "read" ? (
          <div className={cn("flex-1 py-2", size)} onClickCapture={(e) => {
            const a = (e.target as HTMLElement).closest("a");
            const h = a?.getAttribute("href") ?? "";
            if (h.startsWith("#ws:")) { e.preventDefault(); e.stopPropagation(); onOpenItem(h.slice(4)); }
          }}>
            <RichOutlineContent html={toNoteHtml(item.body)} library={library}
              emptyFallback={<p className="text-sm text-muted-foreground">{t("guestWs.emptyRead", { defaultValue: "Sem texto ainda. Toque em Editar para escrever." })}</p>} />
          </div>
        ) : <div className={cn("flex-1", size)}>
          <Suspense fallback={<p className="text-sm text-muted-foreground">{t("guestWs.loading", { defaultValue: "Carregando…" })}</p>}>
            <RichNoteEditor value={toNoteHtml(item.body)} onChange={(html) => onChange({ body: html })} noteId={item.id}
              placeholder={t("guestWs.bodyPh", { defaultValue: "Comece a escrever…" })} minHeight="50vh" maxHeight="none" />
          </Suspense>
        </div>}
      </div>
    </div>
  );
}

function WorkspaceSheet({ open, onOpenChange, data, update, folder, setFolder, color, setColor }: {
  open: boolean; onOpenChange: (o: boolean) => void; data: WsData; update: (fn: (d: WsData) => WsData) => void;
  folder: string | null; setFolder: (f: string | null) => void; color: string | null; setColor: (c: string | null) => void;
}) {
  const { t } = useTranslation();
  const [newFolder, setNewFolder] = useState("");
  const [bibleOpen, setBibleOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const planRef = useRef<HTMLInputElement>(null);
  const setSetting = <K extends keyof WsData["settings"]>(k: K, v: WsData["settings"][K]) =>
    update((d) => ({ ...d, settings: { ...d.settings, [k]: v } }));
  const chip = (active: boolean) => cn("rounded-full border px-3 py-1 text-xs", active ? "bg-primary text-primary-foreground" : "hover:bg-accent/60");

  const doBackup = async () => {
    try {
      const blob = await buildWsBackup(data);
      await saveBlob(blob, { filename: `visita-sc-pessoal-${new Date().toISOString().slice(0, 10)}.zip`, mimeType: "application/zip" });
    } catch { toast.error(t("guestWs.backupFail", { defaultValue: "Não foi possível gerar o backup." })); }
  };
  const doRestore = async (file: File, mode: "replace" | "merge") => {
    try {
      const incoming = await readWsBackup(file);
      const n = incoming.items.length;
      if (!window.confirm(mode === "replace"
        ? t("guestWs.confirmRestore", { defaultValue: "Restaurar {{n}} itens? O conteúdo atual será substituído.", n })
        : t("guestWs.confirmImport", { defaultValue: "Importar {{n}} itens?", n }))) return;
      update((d) => mode === "replace" ? incoming : {
        ...d,
        items: [...incoming.items.filter((i) => !d.items.some((x) => x.id === i.id)), ...d.items],
        folders: [...d.folders, ...incoming.folders.filter((f) => !d.folders.some((x) => x.id === f.id))],
      });
      toast.success(t("guestWs.restored", { defaultValue: "Pronto." }));
    } catch { toast.error(t("guestWs.restoreFail", { defaultValue: "Arquivo inválido ou corrompido." })); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("guestWs.drawer", { defaultValue: "Pastas e configurações" })}</SheetTitle>
          <SheetDescription className="sr-only">{t("guestWs.drawer", { defaultValue: "Pastas e configurações" })}</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">
          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground"><FolderOpen className="h-3.5 w-3.5" />{t("guestWs.folders", { defaultValue: "Pastas" })}</h3>
            <div className="flex flex-wrap gap-1.5">
              <button className={chip(!folder)} onClick={() => setFolder(null)}>{t("guestWs.all", { defaultValue: "Todas" })}</button>
              {data.folders.map((f) => <button key={f.id} className={chip(folder === f.id)} onClick={() => setFolder(f.id)}>{f.name}</button>)}
            </div>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const name = newFolder.trim(); if (!name) return;
              update((d) => ({ ...d, folders: [...d.folders, { id: crypto.randomUUID(), name }] })); setNewFolder(""); }}>
              <Input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder={t("guestWs.newFolder", { defaultValue: "Nova pasta" })} className="h-8" />
              <Button type="submit" size="sm" variant="outline"><Plus className="h-4 w-4" /></Button>
            </form>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">{t("guestWs.colors", { defaultValue: "Cores" })}</h3>
            <div className="flex gap-2">
              <button className={chip(!color)} onClick={() => setColor(null)}>{t("guestWs.all", { defaultValue: "Todas" })}</button>
              {WS_COLORS.map((c) => (
                <button key={c} aria-label={c} aria-pressed={color === c} onClick={() => setColor(c)}
                  className={cn("h-7 w-7 rounded-full border-2", colorDot[c], color === c ? "border-foreground" : "border-transparent")} />
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">{t("guestWs.settings", { defaultValue: "Configurações" })}</h3>
            <div className="flex gap-1.5">
              {(["sm", "md", "lg"] as const).map((s) => <button key={s} className={chip(data.settings.fontSize === s)} onClick={() => setSetting("fontSize", s)}>{{ sm: "A-", md: "A", lg: "A+" }[s]}</button>)}
            </div>
            <div className="flex gap-1.5">
              <button className={chip(data.settings.width === "narrow")} onClick={() => setSetting("width", "narrow")}>{t("guestWs.narrow", { defaultValue: "Texto estreito" })}</button>
              <button className={chip(data.settings.width === "wide")} onClick={() => setSetting("width", "wide")}>{t("guestWs.wide", { defaultValue: "Texto largo" })}</button>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">{t("guestWs.backup", { defaultValue: "Backup e Dados" })}</h3>
            <p className="text-xs text-muted-foreground">{t("guestWs.backupHint", { defaultValue: "Funciona sem internet. Os arquivos ficam no seu aparelho." })}</p>
            <div className="grid gap-2">
              <Button variant="outline" size="sm" className="justify-start gap-2" onClick={doBackup}><Download className="h-4 w-4" />{t("guestWs.makeBackup", { defaultValue: "Gerar backup" })}</Button>
              <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />{t("guestWs.restore", { defaultValue: "Restaurar backup" })}</Button>
              <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => planRef.current?.click()}><FileText className="h-4 w-4" />{t("guestWs.importPlan", { defaultValue: "Importar plano (.json/.zip)" })}</Button>
              <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => setBibleOpen(true)}><BookOpen className="h-4 w-4" />{t("guestWs.importBible", { defaultValue: "Importar Bíblia (EPUB)" })}</Button>
            </div>
            <input ref={fileRef} type="file" accept=".zip,application/zip" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) doRestore(f, "replace"); }} />
            <input ref={planRef} type="file" accept=".json,.zip,application/json,application/zip" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) doRestore(f, "merge"); }} />
          </section>
        </div>
        <BibleManagerDialog open={bibleOpen} onOpenChange={setBibleOpen} />
      </SheetContent>
    </Sheet>
  );
}
