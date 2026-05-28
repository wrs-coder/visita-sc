import { createFileRoute, redirect } from "@tanstack/react-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Plus,
  Trash2,
  Search,
  Save,
  
  Pencil,
  FileText,
  Folder,
  FolderPlus,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Download,
  Upload,
  Maximize2,
  X,
  Minus,
  Move,
  Scissors,
  ClipboardPaste,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SavingIndicator } from "@/components/SavingIndicator";

import { supabase } from "@/integrations/supabase/client";
import {
  listNotes,
  saveNote as persistNote,
  deleteNote as removeNote,
  newNoteId,
  getActiveLibrary,
  listFolders,
  saveFolder,
  newFolderId,
  deleteFolderCascade,
  exportFolderJSON,
  exportNoteJSON,
  importJSON,
  type FieldNote,
  type NoteFolder,
  type NoteType,
  type BibleLibrary,
  type ExportPayload,
} from "@/lib/bible-notes-store";
import { findCitations, stripHtmlForDetection, type CitationMatch } from "@/lib/bible-refs";
import { VerseLink } from "@/components/bible/BibleVersePopover";
import { RichNoteEditor } from "@/components/notes/RichNoteEditor";
import { RichOutlineContent } from "@/lib/rich-content";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/consideracoes-campo")({
  beforeLoad: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isSuper = (roles ?? []).some((r) => r.role === "superintendent");
      if (!isSuper) throw redirect({ to: "/dashboard" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e;
    }
  },
  component: Page,
});

const FONT_SCALE_KEY = "esboco:fontScale";
const FS_MIN = 0.85;
const FS_MAX = 1.6;
const FS_STEP = 0.1;

function emptyNote(type: NoteType, folderId: string | null): FieldNote {
  const now = Date.now();
  return {
    id: newNoteId(),
    type,
    folderId,
    title: "",
    prayer: "",
    territory: "",
    assistants: "",
    description: "",
    content: "",
    created_at: now,
    updated_at: now,
  };
}

function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(s: string): string {
  return (s || "sem-titulo")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "sem-titulo";
}

function Page() {
  const { t, i18n } = useTranslation();
  const [activeType, setActiveType] = useState<NoteType | null>(null);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [notes, setNotes] = useState<FieldNote[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FieldNote | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeBible, setActiveBible] = useState<BibleLibrary | null>(null);
  const [mode, setMode] = useState<"edit" | "outline">("outline");
  const [fullscreen, setFullscreen] = useState(false);
  const [foldersCollapsed, setFoldersCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("personal-outlines.folders-collapsed") === "1";
    } catch {
      return false;
    }
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Estado para mover/recortar
  const [clipboardNoteId, setClipboardNoteId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<
    | { kind: "note"; id: string }
    | { kind: "folder"; id: string }
    | null
  >(null);

  useEffect(() => {
    try {
      localStorage.setItem("personal-outlines.folders-collapsed", foldersCollapsed ? "1" : "0");
    } catch { /* ignore */ }
  }, [foldersCollapsed]);


  async function refreshActiveBible() {
    setActiveBible(await getActiveLibrary());
  }

  useEffect(() => {
    refreshActiveBible();
  }, []);

  // Carrega pastas + notas só quando o tipo é selecionado
  useEffect(() => {
    if (!activeType) {
      setFolders([]);
      setNotes([]);
      setSelectedFolderId(null);
      setSelectedNoteId(null);
      setDraft(null);
      return;
    }
    (async () => {
      const [fs, ns] = await Promise.all([listFolders(activeType), listNotes()]);
      setFolders(fs);
      const filteredNs = ns.filter((n) => (n.type ?? "field_consideration") === activeType);
      setNotes(filteredNs.sort((a, b) => b.updated_at - a.updated_at));
    })();
  }, [activeType]);

  const detected: CitationMatch[] = useMemo(
    () => (draft && activeBible ? findCitations(activeBible.books, stripHtmlForDetection(draft.content)) : []),
    [draft, activeBible],
  );

  function patch<K extends keyof FieldNote>(key: K, value: FieldNote[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  function selectNote(n: FieldNote) {
    setSelectedNoteId(n.id);
    setSelectedFolderId(n.folderId ?? null);
    setDraft(n);
    setMode("outline");
  }

  function handleNewNote() {
    if (!activeType) return;
    const n = emptyNote(activeType, selectedFolderId);
    setDraft(n);
    setSelectedNoteId(n.id);
    setMode("edit");
  }

  async function handleSave() {
    if (!draft || !activeType) return;
    setSaving(true);
    const updated: FieldNote = {
      ...draft,
      type: draft.type ?? activeType,
      folderId: draft.folderId ?? null,
      updated_at: Date.now(),
    };
    try {
      await persistNote(updated);
      setNotes((all) => {
        const idx = all.findIndex((n) => n.id === updated.id);
        const next = idx >= 0 ? [...all] : [updated, ...all];
        if (idx >= 0) next[idx] = updated;
        return next.sort((a, b) => b.updated_at - a.updated_at);
      });
      setDraft(updated);
      setMode("outline");
      toast.success(t("fieldConsiderations.saved"));
    } catch {
      toast.error(t("common.errorGeneric", { defaultValue: "Erro" }));
    } finally {
      setTimeout(() => setSaving(false), 300);
    }
  }

  async function handleDeleteNote() {
    if (!draft) return;
    if (!confirm(t("fieldConsiderations.deleteConfirm"))) return;
    await removeNote(draft.id);
    setNotes((all) => all.filter((n) => n.id !== draft.id));
    setDraft(null);
    setSelectedNoteId(null);
    toast.success(t("fieldConsiderations.deleted"));
  }

  async function handleCreateFolder(parentId: string | null) {
    if (!activeType) return;
    const name = prompt(t("personalOutlines.folders.namePrompt"));
    if (!name || !name.trim()) return;
    const f: NoteFolder = {
      id: newFolderId(),
      name: name.trim(),
      parentId,
      type: activeType,
      created_at: Date.now(),
    };
    await saveFolder(f);
    setFolders((all) => [...all, f]);
    if (parentId) setExpanded((s) => new Set(s).add(parentId));
  }

  async function handleRenameFolder(folder: NoteFolder) {
    const name = prompt(t("personalOutlines.folders.renamePrompt"), folder.name);
    if (!name || !name.trim()) return;
    const updated = { ...folder, name: name.trim() };
    await saveFolder(updated);
    setFolders((all) => all.map((f) => (f.id === folder.id ? updated : f)));
  }

  async function handleDeleteFolder(folder: NoteFolder) {
    if (!confirm(t("personalOutlines.folders.deleteWarn"))) return;
    await deleteFolderCascade(folder.id);
    if (activeType) {
      const [fs, ns] = await Promise.all([listFolders(activeType), listNotes()]);
      setFolders(fs);
      setNotes(ns.filter((n) => (n.type ?? "field_consideration") === activeType));
    }
    if (selectedFolderId === folder.id) setSelectedFolderId(null);
    if (draft && draft.folderId === folder.id) {
      setDraft(null);
      setSelectedNoteId(null);
    }
  }

  async function handleExportFolder(folder: NoteFolder) {
    try {
      const payload = await exportFolderJSON(folder.id);
      downloadJSON(`pasta-${slugify(folder.name)}.json`, payload);
      toast.success(t("personalOutlines.folders.exportedFolder"));
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    }
  }

  async function handleExportNote() {
    if (!draft) return;
    try {
      const payload = await exportNoteJSON(draft.id);
      downloadJSON(`nota-${slugify(draft.title)}.json`, payload);
      toast.success(t("personalOutlines.folders.exportedNote"));
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    }
  }

  async function handleImportFile(file: File) {
    if (!activeType) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as ExportPayload;
      // força tipo se vier de outra categoria
      if ("folder" in payload && payload.folder.type !== activeType) {
        if (!confirm("O arquivo é de outro tipo. Importar mesmo assim no tipo atual?")) return;
        payload.folder.type = activeType;
        payload.subfolders.forEach((f) => (f.type = activeType));
        payload.notes.forEach((n) => (n.type = activeType));
      }
      if ("note" in payload && (payload.note.type ?? "field_consideration") !== activeType) {
        payload.note.type = activeType;
      }
      const res = await importJSON(payload, selectedFolderId);
      const [fs, ns] = await Promise.all([listFolders(activeType), listNotes()]);
      setFolders(fs);
      setNotes(ns.filter((n) => (n.type ?? "field_consideration") === activeType).sort((a, b) => b.updated_at - a.updated_at));
      toast.success(t("personalOutlines.folders.imported", res));
    } catch (e) {
      toast.error("JSON inválido: " + String(e instanceof Error ? e.message : e));
    }
  }

  const dateFmt = (ts: number) =>
    new Date(ts).toLocaleDateString(i18n.language, { day: "2-digit", month: "short", year: "numeric" });

  // Árvore: pastas filhas de um parentId, filtradas por busca
  const matchesQuery = (n: FieldNote) =>
    !query.trim() || (n.title || "").toLowerCase().includes(query.trim().toLowerCase());
  const rootFolders = folders.filter((f) => f.parentId === null);
  const rootNotes = notes.filter((n) => !n.folderId && matchesQuery(n));

  function FolderRow({ folder, depth }: { folder: NoteFolder; depth: number }) {
    const isOpen = expanded.has(folder.id);
    const childFolders = folders.filter((f) => f.parentId === folder.id);
    const childNotes = notes.filter((n) => n.folderId === folder.id && matchesQuery(n));
    const selected = selectedFolderId === folder.id;
    return (
      <div>
        <div
          className={cn(
            "group flex items-center gap-1 rounded-md px-1.5 py-1 text-sm cursor-pointer",
            selected ? "bg-primary/10 text-primary" : "hover:bg-muted",
          )}
          style={{ paddingLeft: 6 + depth * 12 }}
          onClick={() => setSelectedFolderId(folder.id)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((s) => {
                const n = new Set(s);
                if (n.has(folder.id)) n.delete(folder.id);
                else n.add(folder.id);
                return n;
              });
            }}
            className="p-0.5"
          >
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          {isOpen ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
          <span className="flex-1 truncate">{folder.name}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background">
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => handleCreateFolder(folder.id)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                {t("personalOutlines.folders.newSub")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRenameFolder(folder)}>
                <Pencil className="h-4 w-4 mr-2" />
                {t("personalOutlines.folders.rename")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportFolder(folder)}>
                <Download className="h-4 w-4 mr-2" />
                {t("personalOutlines.folders.exportFolder")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => handleDeleteFolder(folder)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("personalOutlines.folders.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {isOpen && (
          <div>
            {childFolders.map((cf) => (
              <FolderRow key={cf.id} folder={cf} depth={depth + 1} />
            ))}
            {childNotes.map((n) => (
              <NoteRow key={n.id} note={n} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  function NoteRow({ note, depth }: { note: FieldNote; depth: number }) {
    const selected = selectedNoteId === note.id;
    return (
      <button
        type="button"
        onClick={() => selectNote(note)}
        className={cn(
          "w-full flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm",
          selected ? "bg-primary/10 text-primary" : "hover:bg-muted",
        )}
        style={{ paddingLeft: 6 + depth * 12 + 16 }}
      >
        <FileText className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span className="truncate flex-1">{note.title || t("fieldConsiderations.fields.title")}</span>
      </button>
    );
  }

  const isField = activeType === "field_consideration";
  const isOutline = activeType === "outline";

  return (
    <>
      <div className="space-y-4 w-full max-w-full overflow-x-hidden overflow-y-auto box-border min-w-0">
        <header className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{t("personalOutlines.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("personalOutlines.subtitle")}</p>
          </div>
        </header>

        {/* Gerenciamento da Bíblia migrou para "Meu Perfil" */}


        {/* Seletor de tipo (obrigatório) */}
        <Card>
          <CardContent className="p-3 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("personalOutlines.typePicker.label")}:
            </span>
            <div className="inline-flex rounded-md border bg-background p-0.5">
              <button
                type="button"
                onClick={() => setActiveType("field_consideration")}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-sm transition",
                  isField ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {t("personalOutlines.typePicker.field")}
              </button>
              <button
                type="button"
                onClick={() => setActiveType("outline")}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-sm transition",
                  isOutline ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {t("personalOutlines.typePicker.outline")}
              </button>
            </div>
          </CardContent>
        </Card>

        {!activeType ? (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              {t("personalOutlines.typePicker.prompt")}
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4 w-full max-w-full min-w-0">

            {/* Sidebar: árvore de pastas */}
            <Card className="h-fit">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold flex-1">
                    {t("personalOutlines.folders.sectionTitle", { defaultValue: "Pastas e notas" })}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setFoldersCollapsed((v) => !v)}
                    title={foldersCollapsed
                      ? t("personalOutlines.folders.expand", { defaultValue: "Expandir" })
                      : t("personalOutlines.folders.collapse", { defaultValue: "Minimizar" })}
                  >
                    {foldersCollapsed ? <ChevronDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                  </Button>
                </div>
                {!foldersCollapsed && (
                  <>
                    <div className="flex gap-1.5">
                      <Button size="sm" className="flex-1" onClick={handleNewNote}>
                        <Plus className="h-4 w-4 mr-1" /> {t("fieldConsiderations.newNote")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleCreateFolder(null)} title={t("personalOutlines.folders.new")}>
                        <FolderPlus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        title={t("personalOutlines.folders.import")}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImportFile(f);
                          e.target.value = "";
                        }}
                      />
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t("fieldConsiderations.search")}
                        className="pl-7 h-9"
                      />
                    </div>
                    <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
                      <div
                        className={cn(
                          "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm cursor-pointer",
                          selectedFolderId === null ? "bg-primary/10 text-primary" : "hover:bg-muted",
                        )}
                        onClick={() => setSelectedFolderId(null)}
                      >
                        <FolderOpen className="h-4 w-4" />
                        <span className="flex-1">{t("personalOutlines.folders.rootLabel")}</span>
                      </div>
                      {rootFolders.length === 0 && rootNotes.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          {t("personalOutlines.folders.empty")}
                        </p>
                      )}
                      {rootFolders.map((f) => (
                        <FolderRow key={f.id} folder={f} depth={0} />
                      ))}
                      {rootNotes.map((n) => (
                        <NoteRow key={n.id} note={n} depth={0} />
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>


            {/* Editor */}
            <Card className="w-full max-w-full overflow-hidden min-w-0">
              <CardContent className="p-5 space-y-4 w-full max-w-full overflow-x-hidden box-border min-w-0">

                {!draft ? (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    {t("personalOutlines.folders.selectFolder")}
                  </p>
                ) : (
                  <NoteEditor
                    draft={draft}
                    mode={mode}
                    type={activeType}
                    saving={saving}
                    activeBible={activeBible}
                    detected={detected}
                    onPatch={patch}
                    onModeChange={setMode}
                    onSave={handleSave}
                    onDelete={handleDeleteNote}
                    onExport={handleExportNote}
                    onFullscreen={() => setFullscreen(true)}
                    dateFmt={dateFmt}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {fullscreen && draft && (
        <FullscreenOutline
          note={draft}
          library={activeBible}
          onClose={() => setFullscreen(false)}
        />
      )}
    </>
  );
}

// =============================================================
// Editor (formulário condicional por tipo)
// =============================================================

interface EditorProps {
  draft: FieldNote;
  mode: "edit" | "outline";
  type: NoteType;
  saving: boolean;
  activeBible: BibleLibrary | null;
  detected: CitationMatch[];
  onPatch: <K extends keyof FieldNote>(key: K, value: FieldNote[K]) => void;
  onModeChange: (m: "edit" | "outline") => void;
  onSave: () => void;
  onDelete: () => void;
  onExport: () => void;
  onFullscreen: () => void;
  dateFmt: (ts: number) => string;
}

function NoteEditor({
  draft, mode, type, saving, activeBible, detected,
  onPatch, onModeChange, onSave, onDelete, onExport, onFullscreen, dateFmt,
}: EditorProps) {
  const { t } = useTranslation();
  const isField = type === "field_consideration";

  return (
    <div className="w-full max-w-full overflow-x-hidden box-border min-w-0 space-y-4 [overflow-wrap:anywhere] break-words pb-24">
      <div className="flex flex-wrap items-center justify-between gap-2 w-full max-w-full min-w-0">

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-md border bg-background p-0.5">
            <button
              type="button"
              onClick={() => onModeChange("edit")}
              className={cn(
                "px-3 py-1 text-xs rounded-sm transition",
                mode === "edit" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {t("fieldConsiderations.editMode")}
            </button>
            <button
              type="button"
              onClick={() => onModeChange("outline")}
              className={cn(
                "px-3 py-1 text-xs rounded-sm transition",
                mode === "outline" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {t("fieldConsiderations.outlineMode")}
            </button>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {t("fieldConsiderations.updatedAt")}: {dateFmt(draft.updated_at)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SavingIndicator saving={saving} />
          {mode === "outline" && (
            <Button variant="outline" size="sm" onClick={onFullscreen}>
              <Maximize2 className="h-4 w-4 mr-1.5" /> {t("personalOutlines.fullscreen.enter")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 w-full max-w-full min-w-0">
        <div className="grid gap-1.5">
          <Label>{t("fieldConsiderations.fields.title")}</Label>
          <Input
            value={draft.title}
            onChange={(e) => onPatch("title", e.target.value)}
            placeholder={t("fieldConsiderations.fields.titlePh")}
            readOnly={mode === "outline"}
            className="w-full max-w-full min-w-0"
          />

        </div>

        {isField ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 w-full max-w-full min-w-0">
              <div className="grid gap-1.5 min-w-0">
                <Label>{t("fieldConsiderations.fields.prayer")}</Label>
                <Input
                  value={draft.prayer ?? ""}
                  onChange={(e) => onPatch("prayer", e.target.value)}
                  placeholder={t("fieldConsiderations.fields.prayerPh")}
                  readOnly={mode === "outline"}
                  className="w-full max-w-full min-w-0"
                />
              </div>
              <div className="grid gap-1.5 min-w-0">
                <Label>{t("fieldConsiderations.fields.territory")}</Label>
                <Input
                  value={draft.territory ?? ""}
                  onChange={(e) => onPatch("territory", e.target.value)}
                  placeholder={t("fieldConsiderations.fields.territoryPh")}
                  readOnly={mode === "outline"}
                  className="w-full max-w-full min-w-0"
                />
              </div>
            </div>
            <div className="grid gap-1.5 w-full max-w-full min-w-0">
              <Label>{t("fieldConsiderations.fields.assistants")}</Label>
              <Input
                value={draft.assistants ?? ""}
                onChange={(e) => onPatch("assistants", e.target.value)}
                placeholder={t("fieldConsiderations.fields.assistantsPh")}
                readOnly={mode === "outline"}
                className="w-full max-w-full min-w-0"
              />
            </div>

          </>
        ) : (
          <div className="grid gap-1.5 w-full max-w-full min-w-0">
            <Label>{t("personalOutlines.fields.description")}</Label>
            <Input
              value={draft.description ?? ""}
              onChange={(e) => onPatch("description", e.target.value)}
              placeholder={t("personalOutlines.fields.descriptionPh")}
              readOnly={mode === "outline"}
              className="w-full max-w-full min-w-0"
            />
          </div>

        )}

        {mode === "edit" && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2 w-full max-w-full min-w-0 overflow-hidden break-words">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              {t("fieldConsiderations.detected")}
            </div>
            {detected.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("fieldConsiderations.detectedEmpty")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-w-full min-w-0">
                {detected.map((m, i) => (
                  <VerseLink key={`${m.index}-${i}`} match={m} libraryId={activeBible?.id ?? null} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-1.5 w-full max-w-full min-w-0">

          <Label>{t("fieldConsiderations.fields.content")}</Label>
          {mode === "edit" ? (
            <RichNoteEditor
              value={draft.content}
              onChange={(html) => onPatch("content", html)}
              placeholder={t("fieldConsiderations.fields.contentPh")}
              noteId={draft.id}
              minHeight="240px"
            />
          ) : (
            <div className="rounded-md border bg-background px-3 py-2 min-h-[240px] text-sm leading-relaxed break-words [overflow-wrap:anywhere]">
              {draft.content ? (
                <RichOutlineContent html={draft.content} library={activeBible} />
              ) : (
                <span className="text-muted-foreground italic">
                  {t("fieldConsiderations.contentEmpty")}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky action bar — sempre visível no rodapé do editor */}
      <div className="sticky bottom-0 left-0 right-0 z-30 -mx-5 px-5 py-3 bg-background/95 backdrop-blur border-t flex flex-wrap items-center justify-center gap-2 w-[calc(100%+2.5rem)] max-w-[calc(100%+2.5rem)]">
        {mode === "outline" && (
          <Button variant="outline" size="sm" onClick={() => onModeChange("edit")}>
            <Pencil className="h-4 w-4 mr-1.5" /> {t("fieldConsiderations.edit")}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4 mr-1.5" /> {t("personalOutlines.folders.exportNote")}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-1.5" /> {t("fieldConsiderations.delete")}
        </Button>
        {mode === "edit" && (
          <Button size="sm" onClick={onSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" /> {t("fieldConsiderations.save")}
          </Button>
        )}
      </div>
    </div>
  );
}


// =============================================================
// Fullscreen outline
// =============================================================

function FullscreenOutline({
  note,
  library,
  onClose,
}: {
  note: FieldNote;
  library: BibleLibrary | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [scale, setScale] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(FONT_SCALE_KEY);
      const n = raw ? Number(raw) : 1;
      return Number.isFinite(n) && n >= FS_MIN && n <= FS_MAX ? n : 1;
    } catch {
      return 1;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(FONT_SCALE_KEY, String(scale)); } catch { /* noop */ }
  }, [scale]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Trava scroll horizontal do body enquanto a tela cheia está aberta.
  useEffect(() => {
    const prev = document.body.style.overflowX;
    document.body.style.overflowX = "hidden";
    document.body.classList.add("overscroll-x-none");
    return () => {
      document.body.style.overflowX = prev;
      document.body.classList.remove("overscroll-x-none");
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col w-screen max-w-full overflow-x-hidden overscroll-x-none">
      <div className="flex items-center gap-2 border-b px-4 py-2 min-w-0">
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <h2 className="text-sm font-semibold truncate flex-1 min-w-0">
          {note.title || t("fieldConsiderations.fields.title")}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setScale((s) => Math.max(FS_MIN, +(s - FS_STEP).toFixed(2)))}
          title={t("personalOutlines.fullscreen.fontDown")}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-xs tabular-nums w-10 text-center">{Math.round(scale * 100)}%</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setScale((s) => Math.min(FS_MAX, +(s + FS_STEP).toFixed(2)))}
          title={t("personalOutlines.fullscreen.fontUp")}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose} title={t("personalOutlines.fullscreen.exit")}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-6">
        <div
          className="max-w-3xl mx-auto leading-relaxed min-w-0 break-words [overflow-wrap:anywhere]"
          style={{ fontSize: `${scale}rem` }}
        >
          {note.content ? (
            <RichOutlineContent html={note.content} library={library} fontScale={scale} />
          ) : (
            <span className="text-muted-foreground italic">{t("fieldConsiderations.contentEmpty")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
