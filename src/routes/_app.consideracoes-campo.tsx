import { htmlToDocx, folderToDocxZip, safeFileName, DOCX_MIME, type DocxFolderEntry } from "@/lib/docx-export";
import { saveBlob } from "@/lib/share";
import { FieldNoteInfoButton } from "@/components/notes/FieldNoteInfoButton";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Plus,
  Trash2,
  Search,
  ChevronLeft,
  Save,
  
  Pencil,
  FileText,
  Folder,
  FolderPlus,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Download,
  Upload,
  Maximize2,
  X,
  Minus,
  Move,
  Scissors,
  ClipboardPaste,
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  NotebookPen,
  ChevronsDownUp,
  ChevronsUpDown,
  FileUp,
  Clock,
} from "lucide-react";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { isOfflineMode } from "@/lib/connection-mode";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  listFolders as listFoldersStore,
  saveNote as persistNote,
  deleteNote as removeNote,
  restoreNote as restoreTrashedNote,
  newNoteId,
  getActiveLibrary,
  listFolders,
  saveFolder,
  newFolderId,
  deleteFolderCascade,
  exportFolderJSON,
  exportNoteJSON,
  importJSON,
  FIXED_FOLDER_WEEK_CONSIDERATIONS,
  FIXED_FOLDER_WEEK_OUTLINES,
  isFixedFolder,
  isAutoSyncFolder,
  type FieldNote,
  type NoteFolder,
  type NoteType,
  type BibleLibrary,
  type ExportPayload,
} from "@/lib/bible-notes-store";
import { Checkbox } from "@/components/ui/checkbox";
import { findCitations, stripHtmlForDetection, type CitationMatch } from "@/lib/bible-refs";
import { shareJsonFile, pickFile } from "@/lib/share";
import { VerseLink } from "@/components/bible/BibleVersePopover";
import { BibleHistoryChips } from "@/components/bible/BibleHistoryChips";

// Rodada B: o editor (TipTap) só carrega ao editar um esboço; a lista abre
// primeiro. Ele é pré-carregado em segundo plano para abrir sem espera.
const loadRichNoteEditor = () => import("@/components/notes/RichNoteEditor");
const RichNoteEditor = React.lazy(() => loadRichNoteEditor().then((m) => ({ default: m.RichNoteEditor })));
if (typeof window !== "undefined") {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  const warm = () => { void loadRichNoteEditor().catch(() => {}); };
  if (w.requestIdleCallback) w.requestIdleCallback(warm, { timeout: 3000 });
  else window.setTimeout(warm, 1500);
}
import { OutlineTimer } from "@/components/notes/OutlineTimer";
import { OutlineInactivitySensor } from "@/components/notes/OutlineInactivitySensor";
import { OutlineAttachmentsBar } from "@/components/notes/OutlineAttachmentsBar";
import { RichOutlineContent, sanitizeNoteHtml } from "@/lib/rich-content";
import { searchOutlines } from "@/lib/outline-search";
import { readRecent, touchRecent } from "@/lib/recent-outlines";
import { repairFolderTypes } from "@/lib/folder-type-repair";
import { cn } from "@/lib/utils";
import { appendPlainTextToNote } from "@/lib/note-content";
import { useServerFn } from "@tanstack/react-start";
import {
  listCloudOutlines,
  pushOutlineToCloud,
  pullOutlineFromCloud,
  deleteCloudOutline,
} from "@/lib/personal-outlines.functions";
import { useOutlinesSync } from "@/hooks/use-outlines-sync";
import { TalkOutlineFields, useTalkSync } from "@/components/notes/TalkOutlineFields";
import { sanitizeTalk } from "@/lib/talk-outline-info";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";

// Corrige uma vez por abertura pastas cujo tipo não bate com os esboços dentro.
async function repairFolderTypesLocal() {
  try {
    const [fs, ns] = await Promise.all([listFoldersStore(), listNotes()]);
    const real = fs.filter((f) => !isFixedFolder(f.id));
    const r = repairFolderTypes(real, ns);
    for (const f of r.folders) await saveFolder(f);
    for (const n of r.notes) await persistNote(n);
  } catch { /* silencioso */ }
}

export const Route = createFileRoute("/_app/consideracoes-campo")({
  validateSearch: (search: Record<string, unknown>): {
    noteId?: string;
    mode?: "edit" | "outline";
  } => {
    const noteId = typeof search.noteId === "string" ? search.noteId : undefined;
    const mode = search.mode === "edit" || search.mode === "outline" ? search.mode : undefined;
    return { noteId, mode };
  },
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

async function downloadJSON(filename: string, data: unknown) {
  await shareJsonFile(filename, data);
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
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<NoteType | null>(
    // Se chegamos por link com noteId, já assume field_consideration imediatamente.
    search.noteId ? "field_consideration" : null,
  );
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [notes, setNotes] = useState<FieldNote[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FieldNote | null>(null);
  // Só apresentação: no celular alterna entre Biblioteca (lista) e Modo Foco (esboço).
  const [showLibrary, setShowLibrary] = useState(true);
  const [activePill, setActivePill] = useState<string | null>(null);
  const [libCollapsed, setLibCollapsed] = useState(false);
  useEffect(() => { if (draft) setShowLibrary(false); }, [draft?.id]);
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

  // Estado para mover/recortar (multi-seleção)
  const [clipboardNoteIds, setClipboardNoteIds] = useState<string[]>([]);
  const [moveTarget, setMoveTarget] = useState<
    | { kind: "note"; id: string }
    | { kind: "notes"; ids: string[] }
    | { kind: "folder"; id: string }
    | null
  >(null);

  // Drag & drop (desktop): arrastar notas/pastas para reorganizar / mover entre pastas
  const [dragItem, setDragItem] = useState<
    | { kind: "note"; id: string }
    | { kind: "folder"; id: string }
    | null
  >(null);
  const [dropHint, setDropHint] = useState<
    | { kind: "folder"; id: string }
    | { kind: "root" }
    | { kind: "note"; id: string; pos: "before" | "after" }
    | null
  >(null);

  // Multi-seleção
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Busca por tema, recentes e criação com pasta obrigatória
  const [searchOpen, setSearchOpen] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [pendingCreate, setPendingCreate] = useState<
    null | { kind: "new" } | { kind: "docx"; title: string; html: string }
  >(null);
  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
    setSubmittedQuery("");
  }
  // Limpa seleção/clipboard ao trocar de subaba
  useEffect(() => {
    setSelectedIds(new Set());
    setActivePill(null);
    closeSearch();
    setRecentIds(activeType ? readRecent(activeType) : []);
    // "Anotações" é só edição — força modo edit ao entrar na subaba.
    if (activeType === "talk_notes") setMode("edit");
  }, [activeType]);

  // Pastas das duas subabas (para diálogo cross-subaba)
  const [allFolders, setAllFolders] = useState<NoteFolder[]>([]);
  const refreshAllFolders = React.useCallback(async () => {
    const [a, b] = await Promise.all([
      listFoldersStore("outline"),
      listFoldersStore("field_consideration"),
    ]);
    setAllFolders([...a, ...b]);
  }, []);
  // Carrega pastas das duas subabas quando o diálogo de mover for aberto para notas
  useEffect(() => {
    if (moveTarget && (moveTarget.kind === "note" || moveTarget.kind === "notes")) {
      void refreshAllFolders();
    }
  }, [moveTarget, refreshAllFolders]);

  // Sincronização com a nuvem
  const [cloudOpen, setCloudOpen] = useState(false);
  const [cloudList, setCloudList] = useState<Array<{ id: string; title: string; folder_path: string; note_type: NoteType; updated_at: string }>>([]);
  const [cloudBusy, setCloudBusy] = useState(false);
  const fnListCloud = useServerFn(listCloudOutlines);
  const fnPushCloud = useServerFn(pushOutlineToCloud);
  const fnPullCloud = useServerFn(pullOutlineFromCloud);
  const fnDeleteCloud = useServerFn(deleteCloudOutline);
  const syncOutlines = useOutlinesSync({ auto: false });
  const fixedOutlineCloudPath = "__fixed__week-outlines";
  const fixedFieldCloudPath = "__fixed__week-considerations";

  function folderPathForCloud(folderId: string | null | undefined): string {
    if (!folderId) return "";
    if (folderId === FIXED_FOLDER_WEEK_CONSIDERATIONS) return fixedFieldCloudPath;
    if (folderId === FIXED_FOLDER_WEEK_OUTLINES) return fixedOutlineCloudPath;
    const byId = new Map(folders.map((f) => [f.id, f]));
    const names: string[] = [];
    const seen = new Set<string>();
    let cur = byId.get(folderId);
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      names.unshift(cur.name.trim());
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return names.filter(Boolean).join(" / ").slice(0, 500);
  }

  function displayCloudPath(path: string): string {
    if (path === fixedOutlineCloudPath) {
      return t("personalOutlines.folders.weekOutlines", { defaultValue: "Esboços da Semana" });
    }
    if (path === fixedFieldCloudPath) {
      return t("personalOutlines.folders.weekConsiderations", { defaultValue: "Considerações da Semana" });
    }
    return path;
  }

  async function syncOutlinesIfOnline() {
    if (!activeType) return null;
    // Anotações são 100% locais — não vão para a nuvem.
    if (activeType === "talk_notes") return null;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return null;
    const result = await syncOutlines();
    if (!result.ok) console.warn("[personal-outlines] sync skipped", result.error);
    return result;
  }

  async function refreshCloudList() {
    const r = await fnListCloud();
    if (r.ok) {
      setCloudList(r.outlines.map((o) => {
        const cj = (o.content_json ?? {}) as Record<string, unknown>;
        const note_type: NoteType = cj.note_type === "field_consideration" ? "field_consideration" : "outline";
        return { id: o.id, title: o.title, folder_path: o.folder_path, note_type, updated_at: o.updated_at };
      }));
    }
  }

  async function handleCloudOpen() {
    setCloudOpen(true);
    await refreshCloudList();
  }



  async function handleCloudPush() {
    if (!draft) return;
    if ((draft.type ?? activeType) === "talk_notes") return;
    setCloudBusy(true);
    try {
      const r = await fnPushCloud({
        data: {
          id: draft.cloud_id ?? undefined,
          title: (draft.title || t("personalOutlines.untitled", { defaultValue: "Sem título" })).slice(0, 200),
          folder_path: folderPathForCloud(draft.folderId),
          note_type: (draft.type ?? activeType ?? "outline"),
          content: {
            prayer: draft.prayer ?? null,
            territory: draft.territory ?? null,
            assistants: draft.assistants ?? null,
            description: draft.description ?? null,
            content: draft.content ?? "",
            talk: draft.talk ?? null,
            sort_order: draft.sort_order ?? null,
            event_date: draft.event_date ?? null,
            period: draft.period ?? null,
            attachments: draft.attachments ?? [],
          },
        },
      });
      if (!r.ok) { toast.error(r.error); return; }
      if (r.id) {
        const synced = { ...draft, cloud_id: r.id, dirty: false, synced_at: Date.now() };
        await persistNote(synced);
        setDraft(synced);
        setNotes((all) => all.map((n) => (n.id === synced.id ? synced : n)));
      }
      toast.success(t("personalOutlines.cloud.pushed", { defaultValue: "Esboço enviado para a nuvem." }));
      await refreshCloudList();
    } finally {
      setCloudBusy(false);
    }
  }

  async function handleCloudPull(id: string) {
    setCloudBusy(true);
    try {
      const r = await fnPullCloud({ data: { id } });
      if (!r.ok) { toast.error(r.error); return; }
      const c = (r.outline.content_json ?? {}) as Record<string, unknown>;
      const pulledType: NoteType = c.note_type === "field_consideration" ? "field_consideration" : "outline";
      const now = Date.now();
      const existing = notes.find((note) => note.cloud_id === r.outline.id);
      const n: FieldNote = {
        ...(existing ?? {}),
        id: existing?.id ?? newNoteId(),
        type: pulledType,
        folderId: pulledType === activeType ? selectedFolderId : (existing?.folderId ?? null),
        title: r.outline.title,
        prayer: typeof c.prayer === "string" ? c.prayer : "",
        territory: typeof c.territory === "string" ? c.territory : "",
        assistants: typeof c.assistants === "string" ? c.assistants : "",
        description: typeof c.description === "string" ? c.description : "",
        content: typeof c.content === "string" ? c.content : "",
        talk: sanitizeTalk(c.talk),
        sort_order: typeof c.sort_order === "number" ? c.sort_order : null,
        event_date: typeof c.event_date === "string" ? c.event_date : undefined,
        period: typeof c.period === "string" ? c.period : undefined,
        attachments: Array.isArray(c.attachments)
          ? (c.attachments as FieldNote["attachments"])
          : (existing?.attachments ?? []),
        created_at: existing?.created_at ?? now,
        updated_at: now,
        cloud_id: r.outline.id,
        dirty: false,
        synced_at: now,
      };
      await persistNote(n);
      if (pulledType === activeType) {
        setNotes((all) => {
          const idx = all.findIndex((note) => note.id === n.id || note.cloud_id === n.cloud_id);
          const next = idx >= 0 ? [...all] : [n, ...all];
          if (idx >= 0) next[idx] = n;
          return next.sort((a, b) => b.updated_at - a.updated_at);
        });
        setDraft(n);
        setSelectedNoteId(n.id);
        setMode("outline");
      }
      toast.success(t("personalOutlines.cloud.pulled", { defaultValue: "Esboço importado da nuvem." }));
      setCloudOpen(false);
    } finally {
      setCloudBusy(false);
    }
  }

  async function handleCloudDelete(id: string) {
    if (!confirm(t("personalOutlines.cloud.deleteConfirm", { defaultValue: "Excluir este esboço da nuvem?" }))) return;
    setCloudBusy(true);
    try {
      const r = await fnDeleteCloud({ data: { id } });
      if (!r.ok) { toast.error(r.error); return; }
      toast.success(t("personalOutlines.cloud.deleted", { defaultValue: "Removido da nuvem." }));
      await refreshCloudList();
    } finally {
      setCloudBusy(false);
    }
  }

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
      await repairFolderTypesLocal();
      const [fs, ns] = await Promise.all([listFolders(activeType), listNotes()]);
      setFolders(fs);
      const filteredNs = ns.filter((n) => (n.type ?? "field_consideration") === activeType);
      const sorted = filteredNs.sort((a, b) => b.updated_at - a.updated_at);
      setNotes(sorted);

      // Bootstrap por search param: abre direto a nota pedida (ex.: vindo do dashboard).
      if (search.noteId) {
        const target = sorted.find((n) => n.id === search.noteId);
        if (target) {
          setSelectedNoteId(target.id);
          setSelectedFolderId(target.folderId ?? null);
          if (target.folderId) {
            setExpanded((s) => new Set(s).add(target.folderId as string));
          }
          setDraft(target);
          setMode(search.mode ?? "outline");
        }
        // Limpa o search param para não re-disparar se o usuário navegar internamente.
        navigate({ to: "/consideracoes-campo", search: {}, replace: true });
      }
    })();
  }, [activeType, search.noteId, search.mode, navigate]);

  // Recarrega pastas/notas quando o sync global termina (cobre APK pós-login,
  // resume e online novamente — disparado por useOutlinesSync).
  useEffect(() => {
    if (!activeType) return;
    const handler = async () => {
      const [fs, ns] = await Promise.all([listFolders(activeType), listNotes()]);
      setFolders(fs);
      setNotes(
        ns.filter((n) => (n.type ?? "field_consideration") === activeType)
          .sort((a, b) => b.updated_at - a.updated_at),
      );
    };
    window.addEventListener("visita-sc:outlines-synced", handler);
    return () => window.removeEventListener("visita-sc:outlines-synced", handler);
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
    setShowLibrary(false);
    if (activeType) setRecentIds(touchRecent(activeType, n.id));
    // "Anotações" não tem modo Esboço — sempre abre direto no editor.
    setMode((n.type ?? activeType) === "talk_notes" ? "edit" : "outline");
  }

  // Criação exige escolher a pasta antes.
  function openNewWithFolder(folderId: string) {
    if (!activeType || !pendingCreate) return;
    const base = emptyNote(activeType, folderId);
    const n = pendingCreate.kind === "docx"
      ? { ...base, title: pendingCreate.title, content: pendingCreate.html }
      : base;
    setPendingCreate(null);
    setSelectedFolderId(folderId);
    setExpanded((s) => new Set(s).add(folderId));
    setDraft(n);
    setSelectedNoteId(n.id);
    setShowLibrary(false);
    setRecentIds(touchRecent(activeType, n.id));
    setMode("edit");
  }

  function handleNewNote() {
    if (!activeType) return;
    setPendingCreate({ kind: "new" });
  }

  async function handleImportDocx() {
    if (!activeType) return;
    const file = await pickFile(".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    if (!file) return;
    try {
      const { importDocx } = await import("@/lib/docx-import");
      const r = await importDocx(file);
      setPendingCreate({ kind: "docx", title: r.title, html: sanitizeNoteHtml(r.html) });
      toast.success(t("fieldConsiderations.docxImport.done"));
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "not_docx";
      toast.error(t(`fieldConsiderations.docxImport.err_${code}`, { defaultValue: t("fieldConsiderations.docxImport.err_not_docx") }));
    }
  }

  async function handleSave() {
    if (!draft || !activeType) return;
    setSaving(true);
    const updated: FieldNote = {
      ...draft,
      type: draft.type ?? activeType,
      folderId: draft.folderId ?? null,
      updated_at: Date.now(),
      dirty: true,
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
      if (activeType !== "talk_notes") setMode("outline");
      const syncResult = isAutoSyncFolder(updated.folderId, folders) ? await syncOutlinesIfOnline() : null;
      if (activeType === "outline" && syncResult?.ok) {
        const [fs, ns] = await Promise.all([listFolders(activeType), listNotes()]);
        const syncedNotes = ns
          .filter((n) => (n.type ?? "field_consideration") === activeType)
          .sort((a, b) => b.updated_at - a.updated_at);
        setFolders(fs);
        setNotes(syncedNotes);
        const syncedDraft = syncedNotes.find((n) => n.id === updated.id);
        if (syncedDraft) setDraft(syncedDraft);
      }
      toast.success(t("fieldConsiderations.saved"));
    } catch {
      toast.error(t("common.errorGeneric", { defaultValue: "Erro" }));
    } finally {
      setTimeout(() => setSaving(false), 300);
    }
  }

  async function handleInsertBibleText(text: string) {
    if (!draft || !activeType) return;
    const updated: FieldNote = {
      ...draft,
      type: draft.type ?? activeType,
      content: appendPlainTextToNote(draft.content, text),
      updated_at: Date.now(),
      dirty: true,
    };
    await persistNote(updated);
    setDraft(updated);
    setNotes((all) => {
      const index = all.findIndex((note) => note.id === updated.id);
      const next = index >= 0 ? [...all] : [updated, ...all];
      if (index >= 0) next[index] = updated;
      return next.sort((a, b) => b.updated_at - a.updated_at);
    });
  }

  // "Desfazer" no aviso de exclusão: a nota só foi para a lixeira, então
  // basta restaurá-la (mesma rotina da Lixeira).
  function toastDeletedWithUndo(removed: FieldNote[]) {
    toast.success(t("fieldConsiderations.deleted"), {
      duration: 6000,
      action: removed.length
        ? {
            label: t("common.undo", { defaultValue: "Desfazer" }),
            onClick: async () => {
              for (const n of removed) await restoreTrashedNote(n.id);
              setNotes((all) => {
                const ids = new Set(all.map((n) => n.id));
                const back = removed
                  .filter((n) => !ids.has(n.id))
                  .map((n) => ({ ...n, deleted_at: null }));
                return [...back, ...all].sort((a, b) => b.updated_at - a.updated_at);
              });
            },
          }
        : undefined,
    });
  }

  async function handleDeleteNote() {
    if (!draft) return;
    if (!confirm(t("fieldConsiderations.deleteConfirm"))) return;
    const removedDraft = notes.filter((n) => n.id === draft.id);
    await removeNote(draft.id);
    setNotes((all) => all.filter((n) => n.id !== draft.id));
    setDraft(null);
    setSelectedNoteId(null);
    // Offline-first: a exclusão fica local; sincroniza só no próximo Salvar/Sincronizar.
    toastDeletedWithUndo(removedDraft);
  }

  async function handleDeleteNoteById(noteId: string) {
    if (!confirm(t("fieldConsiderations.deleteConfirm"))) return;
    const removedOne = notes.filter((n) => n.id === noteId);
    await removeNote(noteId);
    setNotes((all) => all.filter((n) => n.id !== noteId));
    if (draft?.id === noteId) {
      setDraft(null);
      setSelectedNoteId(null);
    }
    // Offline-first: a exclusão fica local; sincroniza só no próximo Salvar/Sincronizar.
    toastDeletedWithUndo(removedOne);
  }

  async function handlePushNoteById(noteId: string) {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    if ((note.type ?? activeType) === "talk_notes") return;
    setCloudBusy(true);
    try {
      const r = await fnPushCloud({
        data: {
          id: note.cloud_id ?? undefined,
          title: (note.title || t("personalOutlines.untitled", { defaultValue: "Sem título" })).slice(0, 200),
          folder_path: folderPathForCloud(note.folderId),
          note_type: (note.type ?? activeType ?? "outline"),
          content: {
            prayer: note.prayer ?? null,
            territory: note.territory ?? null,
            assistants: note.assistants ?? null,
            description: note.description ?? null,
            content: note.content ?? "",
            talk: note.talk ?? null,
            sort_order: note.sort_order ?? null,
            event_date: note.event_date ?? null,
            period: note.period ?? null,
            attachments: note.attachments ?? [],
          },
        },
      });
      if (!r.ok) { toast.error(r.error); return; }
      if (r.id) {
        const synced = { ...note, cloud_id: r.id, dirty: false, synced_at: Date.now() };
        await persistNote(synced);
        setNotes((all) => all.map((n) => (n.id === synced.id ? synced : n)));
        if (draft?.id === synced.id) setDraft(synced);
      }
      toast.success(t("personalOutlines.cloud.pushed", { defaultValue: "Esboço enviado para a nuvem." }));
    } finally {
      setCloudBusy(false);
    }
  }

  async function handlePushManyByIds(ids: string[]) {
    for (const id of ids) await handlePushNoteById(id);
  }

  async function handleDeleteMany(ids: string[]) {
    if (ids.length === 0) return;
    if (!confirm(t("fieldConsiderations.deleteConfirm"))) return;
    const removedMany = notes.filter((n) => ids.includes(n.id));
    for (const id of ids) {
      await removeNote(id);
    }
    setNotes((all) => all.filter((n) => !ids.includes(n.id)));
    if (draft && ids.includes(draft.id)) { setDraft(null); setSelectedNoteId(null); }
    setSelectedIds(new Set());
    // Offline-first: exclusão em lote fica local; sincroniza só sob demanda.
    toastDeletedWithUndo(removedMany);
  }

  async function handleExportMany(ids: string[]) {
    for (const id of ids) {
      const note = notes.find((n) => n.id === id);
      if (!note) continue;
      try {
        const payload = await exportNoteJSON(id);
        await downloadJSON(`nota-${slugify(note.title)}.json`, payload);
      } catch (e) {
        toast.error(String(e instanceof Error ? e.message : e));
      }
    }
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
      autoSync: activeType !== "talk_notes" && confirm(t("personalOutlines.folders.autoSyncAsk", { defaultValue: "Sincronizar esta pasta automaticamente na nuvem (outros aparelhos)?" })),
    };
    await saveFolder(f);
    setFolders((all) => [...all, f]);
    if (parentId) setExpanded((s) => new Set(s).add(parentId));
    // Offline-first: criação de pasta fica local; sincroniza só sob demanda.
  }

  async function handleRenameFolder(folder: NoteFolder) {
    const name = prompt(t("personalOutlines.folders.renamePrompt"), folder.name);
    if (!name || !name.trim()) return;
    const updated = { ...folder, name: name.trim() };
    await saveFolder(updated);
    setFolders((all) => all.map((f) => (f.id === folder.id ? updated : f)));
    // Offline-first: renomear pasta fica local; sincroniza só sob demanda.
  }

  async function handleToggleAutoSync(folder: NoteFolder) {
    const updated = { ...folder, autoSync: !folder.autoSync };
    await saveFolder(updated);
    setFolders((all) => all.map((f) => (f.id === folder.id ? updated : f)));
    toast.success(updated.autoSync
      ? t("personalOutlines.folders.autoSyncOn", { defaultValue: "Sincronização automática ativada" })
      : t("personalOutlines.folders.autoSyncOff", { defaultValue: "Sincronização automática desativada" }));
    if (updated.autoSync) void syncOutlinesIfOnline();
  }

  // Ao abrir/retomar o app: busca novidades das pastas sincronizadas (no máx. a cada 5 min).
  const lastAutoSyncRef = React.useRef(0);
  useEffect(() => {
    if (!activeType || activeType === "talk_notes") return;
    const run = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (Date.now() - lastAutoSyncRef.current < 5 * 60 * 1000) return;
      lastAutoSyncRef.current = Date.now();
      void syncOutlinesIfOnline().catch(() => { /* silencioso */ });
    };
    run();
    document.addEventListener("visibilitychange", run);
    window.addEventListener("online", run);
    document.addEventListener("resume", run);
    return () => {
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("online", run);
      document.removeEventListener("resume", run);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType]);

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
    // Offline-first: exclusão de pasta fica local; sincroniza só sob demanda.
  }

  // ---------- Mover / Recortar / Colar ----------

  function getDescendantFolderIds(rootId: string): Set<string> {
    const out = new Set<string>([rootId]);
    let added = true;
    while (added) {
      added = false;
      for (const f of folders) {
        if (f.parentId && out.has(f.parentId) && !out.has(f.id)) {
          out.add(f.id);
          added = true;
        }
      }
    }
    return out;
  }

  async function moveNoteTo(noteId: string, targetFolderId: string | null, targetType?: NoteType) {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    const sameType = !targetType || targetType === (note.type ?? "field_consideration");
    if (sameType && (note.folderId ?? null) === targetFolderId) return;
    const updated: FieldNote = {
      ...note,
      type: targetType ?? note.type,
      folderId: targetFolderId,
      updated_at: Date.now(),
      dirty: true,
    };
    await persistNote(updated);
    if (sameType) {
      setNotes((all) => all.map((n) => (n.id === noteId ? updated : n))
        .sort((a, b) => b.updated_at - a.updated_at));
    } else {
      // Tipo mudou: nota sai da lista atual (subaba diferente).
      setNotes((all) => all.filter((n) => n.id !== noteId));
      if (draft?.id === noteId) { setDraft(null); setSelectedNoteId(null); }
    }
    if (draft && draft.id === noteId && sameType) setDraft(updated);
    if (targetFolderId) setExpanded((s) => new Set(s).add(targetFolderId));
    // Offline-first: mover nota fica local; sincroniza só sob demanda.
    toast.success(t("personalOutlines.folders.noteMoved", { defaultValue: "Nota movida." }));
  }

  async function moveFolderTo(folderId: string, targetParentId: string | null) {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;
    if ((folder.parentId ?? null) === targetParentId) return;
    if (targetParentId && getDescendantFolderIds(folderId).has(targetParentId)) {
      toast.error(t("personalOutlines.folders.cannotMoveIntoSelf", {
        defaultValue: "Não é possível mover uma pasta para dentro dela mesma.",
      }));
      return;
    }
    const updated: NoteFolder = { ...folder, parentId: targetParentId };
    await saveFolder(updated);
    setFolders((all) => all.map((f) => (f.id === folderId ? updated : f)));
    if (targetParentId) setExpanded((s) => new Set(s).add(targetParentId));
    // Offline-first: mover pasta fica local; sincroniza só sob demanda.
    toast.success(t("personalOutlines.folders.folderMoved", { defaultValue: "Pasta movida." }));
  }

  async function handleConfirmMove(targetFolderId: string | null, targetType?: NoteType) {
    if (!moveTarget) return;
    if (moveTarget.kind === "note") {
      await moveNoteTo(moveTarget.id, targetFolderId, targetType);
    } else if (moveTarget.kind === "notes") {
      // Batch atómico: persiste todas, atualiza estado uma única vez e sincroniza no fim.
      const ids = moveTarget.ids;
      const now = Date.now();
      const updates: FieldNote[] = [];
      for (const id of ids) {
        const note = notes.find((n) => n.id === id);
        if (!note) continue;
        const sameType = !targetType || targetType === (note.type ?? "field_consideration");
        if (sameType && (note.folderId ?? null) === targetFolderId) continue;
        const updated: FieldNote = {
          ...note,
          type: targetType ?? note.type,
          folderId: targetFolderId,
          updated_at: now,
          dirty: true,
        };
        await persistNote(updated);
        updates.push(updated);
      }
      const movedIds = new Set(updates.map((u) => u.id));
      const crossType = !!targetType && targetType !== activeType;
      setNotes((all) => {
        if (crossType) return all.filter((n) => !movedIds.has(n.id));
        const map = new Map(updates.map((u) => [u.id, u]));
        return all
          .map((n) => map.get(n.id) ?? n)
          .sort((a, b) => b.updated_at - a.updated_at);
      });
      if (draft && movedIds.has(draft.id)) {
        if (crossType) { setDraft(null); setSelectedNoteId(null); }
        else {
          const upd = updates.find((u) => u.id === draft.id);
          if (upd) setDraft(upd);
        }
      }
      if (targetFolderId) setExpanded((s) => new Set(s).add(targetFolderId));
      setSelectedIds(new Set());
      // Offline-first: mover em lote fica local; sincroniza só sob demanda.
      if (updates.length > 0) {
        toast.success(t("personalOutlines.folders.noteMoved", { defaultValue: "Nota movida." }) + ` (${updates.length})`);
      }
    } else {
      await moveFolderTo(moveTarget.id, targetFolderId);
    }
    setMoveTarget(null);
  }


  async function handleRenameNote(note: FieldNote) {
    const name = prompt(
      t("personalOutlines.folders.renameNotePrompt", { defaultValue: "Novo título da nota:" }),
      note.title,
    );
    if (!name || !name.trim()) return;
    const updated: FieldNote = { ...note, title: name.trim(), updated_at: Date.now(), dirty: true };
    await persistNote(updated);
    setNotes((all) =>
      all
        .map((n) => (n.id === note.id ? updated : n))
        .sort((a, b) => b.updated_at - a.updated_at),
    );
    if (draft && draft.id === note.id) setDraft(updated);
    // Offline-first: renomear nota fica local; sincroniza só sob demanda.
    toast.success(t("personalOutlines.folders.noteRenamed", { defaultValue: "Nota renomeada." }));
  }

  function handleCutNote(noteId: string) {
    setClipboardNoteIds([noteId]);
    toast.success(t("personalOutlines.folders.noteCut", { defaultValue: "Nota recortada." }));
  }

  function handleCutMany(ids: string[]) {
    if (ids.length === 0) return;
    setClipboardNoteIds(ids);
    toast.success(t("personalOutlines.folders.noteCut", { defaultValue: "Nota recortada." }) + ` (${ids.length})`);
  }

  async function handlePasteNote(targetFolderId: string | null) {
    if (clipboardNoteIds.length === 0) return;
    const ids = clipboardNoteIds;
    setClipboardNoteIds([]);
    for (const noteId of ids) {
      const note = notes.find((n) => n.id === noteId);
      if (!note) continue;
      if ((note.folderId ?? null) === targetFolderId) continue;
      const updated: FieldNote = { ...note, folderId: targetFolderId, updated_at: Date.now(), dirty: true };
      await persistNote(updated);
      setNotes((all) => all.map((n) => (n.id === noteId ? updated : n))
        .sort((a, b) => b.updated_at - a.updated_at));
      if (draft && draft.id === noteId) setDraft(updated);
    }
    if (targetFolderId) setExpanded((s) => new Set(s).add(targetFolderId));
    // Offline-first: colar nota fica local; sincroniza só sob demanda.
    toast.success(t("personalOutlines.folders.notePasted", { defaultValue: "Nota colada na pasta." }));
  }

  function handleClearClipboard() {
    setClipboardNoteIds([]);
    toast.info(t("personalOutlines.folders.clipboardCleared", { defaultValue: "Recorte cancelado." }));
  }



  async function handleExportFolderDocx(folder: NoteFolder) {
    const entries: DocxFolderEntry[] = [];
    const walk = (fid: string, path: string[]) => {
      for (const n of notes) if (n.folderId === fid && !n.deleted_at) entries.push({ path, title: n.title || "Esboço", html: n.content ?? "" });
      for (const f of folders) if (f.parentId === fid && !f.deleted_at) walk(f.id, [...path, f.name]);
    };
    walk(folder.id, [folder.name]);
    if (!entries.length) { toast.info(t("personalOutlines.folders.emptyFolder", { defaultValue: "Esta pasta está vazia." })); return; }
    try {
      const blob = await folderToDocxZip(entries);
      await saveBlob(blob, { filename: `${safeFileName(folder.name, "pasta")}.zip`, mimeType: "application/zip" });
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    }
  }

  async function handleExportNoteDocx() {
    if (!draft) return;
    try {
      const blob = await htmlToDocx(draft.title, draft.content ?? "");
      await saveBlob(blob, { filename: `${safeFileName(draft.title)}.docx`, mimeType: DOCX_MIME });
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    }
  }

  async function handleExportFolder(folder: NoteFolder) {
    try {
      const payload = await exportFolderJSON(folder.id);
      await downloadJSON(`pasta-${slugify(folder.name)}.json`, payload);
      toast.success(t("personalOutlines.folders.exportedFolder"));
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    }
  }

  async function handleExportNote() {
    if (!draft) return;
    try {
      const payload = await exportNoteJSON(draft.id);
      await downloadJSON(`nota-${slugify(draft.title)}.json`, payload);
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

  // A busca por tema mostra uma lista própria; a árvore não é filtrada.
  const matchesQuery = (_n: FieldNote) => true;
  const searchResults = submittedQuery ? searchOutlines(notes, submittedQuery) : [];
  const recentNotes = recentIds
    .map((id) => notes.find((n) => n.id === id))
    .filter((n): n is FieldNote => !!n);
  // Ordena dentro da pasta por sort_order asc, fallback updated_at desc.
  const sortInFolder = (a: FieldNote, b: FieldNote) => {
    const ao = a.sort_order ?? Number.POSITIVE_INFINITY;
    const bo = b.sort_order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return b.updated_at - a.updated_at;
  };
  const rootFolders = folders.filter((f) => f.parentId === null);
  const rootNotes = notes.filter((n) => !n.folderId && matchesQuery(n)).sort(sortInFolder);

  async function reorderNote(noteId: string, direction: -1 | 1) {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    const siblings = notes
      .filter((n) => (n.folderId ?? null) === (note.folderId ?? null) && matchesQuery(n))
      .sort(sortInFolder);
    const idx = siblings.findIndex((n) => n.id === noteId);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= siblings.length) return;
    // Normaliza sort_order de todos os irmãos a partir do índice (estável e barato).
    const reordered = [...siblings];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(swapIdx, 0, moved);
    const now = Date.now();
    const updates: FieldNote[] = reordered.map((n, i) => ({
      ...n,
      sort_order: i,
      // Não bumpa updated_at (evita "subir" a nota em listas globais), mas marca dirty.
      dirty: true,
    }));
    for (const u of updates) await persistNote(u);
    setNotes((all) => {
      const map = new Map(updates.map((u) => [u.id, u]));
      return all.map((n) => map.get(n.id) ?? n);
    });
    // Offline-first: reordenar fica local; a ordem do aparelho só vai para
    // a nuvem quando você clicar em Salvar ou Sincronizar agora.
    void now;
  }

  // Move uma nota para `targetFolderId`, inserindo-a antes de `beforeNoteId`
  // (ou no fim se `beforeNoteId` for null). Renumera sort_order dos irmãos.
  async function placeNoteIn(
    noteId: string,
    targetFolderId: string | null,
    beforeNoteId: string | null,
  ) {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    if (beforeNoteId === noteId) return;
    const siblings = notes
      .filter((n) => (n.folderId ?? null) === targetFolderId && n.id !== noteId)
      .sort(sortInFolder);
    let insertIdx = beforeNoteId
      ? siblings.findIndex((n) => n.id === beforeNoteId)
      : siblings.length;
    if (insertIdx < 0) insertIdx = siblings.length;
    const movedNote: FieldNote = { ...note, folderId: targetFolderId, dirty: true };
    const reordered = [...siblings];
    reordered.splice(insertIdx, 0, movedNote);
    const now = Date.now();
    const updates: FieldNote[] = reordered.map((n, i) => ({
      ...n,
      folderId: targetFolderId,
      sort_order: i,
      dirty: true,
      updated_at: n.id === noteId ? now : n.updated_at,
    }));
    for (const u of updates) await persistNote(u);
    setNotes((all) => {
      const map = new Map(updates.map((u) => [u.id, u]));
      return all.map((n) => map.get(n.id) ?? n);
    });
    if (draft && draft.id === noteId) {
      const upd = updates.find((u) => u.id === noteId);
      if (upd) setDraft(upd);
    }
    if (targetFolderId) setExpanded((s) => new Set(s).add(targetFolderId));
    // Offline-first: drag & drop fica local; sincroniza só sob demanda.
  }

  // Move várias notas para `targetFolderId`, antes de `beforeNoteId`, preservando ordem.
  async function placeNotesIn(
    noteIds: string[],
    targetFolderId: string | null,
    beforeNoteId: string | null,
  ) {
    // Ordena os ids selecionados pela ordem atual (estável) antes de mover.
    const ordered = noteIds
      .map((id) => notes.find((n) => n.id === id))
      .filter((n): n is FieldNote => !!n)
      .sort(sortInFolder)
      .map((n) => n.id);
    for (const id of ordered) {
      if (id === beforeNoteId) continue;
      // eslint-disable-next-line no-await-in-loop
      await placeNoteIn(id, targetFolderId, beforeNoteId);
    }
  }

  // ---------- Drag & Drop (dnd-kit, touch + mouse + keyboard) ----------
  const dndSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function parseDndId(raw: string | number | null | undefined):
    | { kind: "note"; id: string }
    | { kind: "folder"; id: string }
    | { kind: "root" }
    | null {
    if (raw == null) return null;
    const s = String(raw);
    if (s === "root") return { kind: "root" };
    if (s.startsWith("note:")) return { kind: "note", id: s.slice(5) };
    if (s.startsWith("folder:")) return { kind: "folder", id: s.slice(7) };
    if (s.startsWith("pill:")) return { kind: "folder", id: s.slice(5) };
    return null;
  }

  function handleDndStart(ev: DragStartEvent) {
    const p = parseDndId(ev.active.id);
    if (!p || p.kind === "root") return;
    setDragItem({ kind: p.kind, id: p.id });
  }

  function handleDndOver(ev: DragOverEvent) {
    const p = parseDndId(ev.over?.id);
    if (!p) { setDropHint(null); return; }
    if (p.kind === "root") setDropHint({ kind: "root" });
    else if (p.kind === "folder") setDropHint({ kind: "folder", id: p.id });
    else setDropHint({ kind: "note", id: p.id, pos: "before" });
  }

  async function handleDndEnd(ev: DragEndEvent) {
    const active = parseDndId(ev.active.id);
    const over = parseDndId(ev.over?.id);
    setDragItem(null);
    setDropHint(null);
    if (!active || active.kind === "root" || !over) return;

    // Move pasta
    if (active.kind === "folder") {
      const targetFolderId = over.kind === "folder" ? over.id : null;
      if (targetFolderId === active.id) return;
      if (targetFolderId && getDescendantFolderIds(active.id).has(targetFolderId)) {
        toast.error(
          t("personalOutlines.folders.cannotMoveIntoSelf", {
            defaultValue: "Não é possível mover uma pasta para dentro dela mesma.",
          }),
        );
        return;
      }
      await moveFolderTo(active.id, targetFolderId);
      return;
    }

    // Move nota (single ou multi-seleção)
    const isMulti = selectedIds.has(active.id) && selectedIds.size > 1;
    const ids = isMulti ? Array.from(selectedIds) : [active.id];

    if (over.kind === "note") {
      const target = notes.find((n) => n.id === over.id);
      if (!target || ids.includes(over.id)) return;
      await placeNotesIn(ids, target.folderId ?? null, over.id);
    } else if (over.kind === "folder") {
      await placeNotesIn(ids, over.id, null);
    } else {
      await placeNotesIn(ids, null, null);
    }
  }


  function PillChip({ id, label }: { id: string | null; label: string }) {
    const droppable = useDroppable({ id: id ? `pill:${id}` : "pill-all", disabled: !id });
    const active = activePill === id;
    return (
      <button
        type="button"
        ref={droppable.setNodeRef}
        onClick={() => {
          setActivePill(id);
          if (id) setExpanded((prev) => new Set(prev).add(id));
        }}
        className={cn(
          "shrink-0 rounded-full border px-3 py-1 text-xs whitespace-nowrap transition max-w-[12rem] truncate",
          active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted",
          droppable.isOver && "ring-2 ring-ring",
        )}
      >
        {label}
      </button>
    );
  }

  function RootDropZone() {
    const droppable = useDroppable({ id: "root" });
    const isOver = dropHint?.kind === "root";
    return (
      <div
        ref={droppable.setNodeRef}
        className={cn(
          "group flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm cursor-pointer",
          selectedFolderId === null ? "bg-primary/10 text-primary" : "hover:bg-muted",
          isOver && "ring-2 ring-primary/60 bg-primary/5",
        )}
        onClick={() => setSelectedFolderId(null)}
      >
        <FolderOpen className="h-4 w-4" />
        <span className="flex-1 text-muted-foreground">{t("personalOutlines.folders.noFolder", { defaultValue: "Sem pasta" })}</span>
        {clipboardNoteIds.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePasteNote(null);
            }}
            className="text-[11px] inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-primary/15 text-primary hover:bg-primary/25"
          >
            <ClipboardPaste className="h-3 w-3" />
            {t("personalOutlines.folders.pasteHere", { defaultValue: "Colar aqui" })}
          </button>
        )}
      </div>
    );
  }

  function FolderRow({ folder, depth }: { folder: NoteFolder; depth: number }) {

    const isOpen = expanded.has(folder.id);
    const childFolders = folders.filter((f) => f.parentId === folder.id);
    const childNotes = notes.filter((n) => n.folderId === folder.id && matchesQuery(n)).sort(sortInFolder);
    const selected = selectedFolderId === folder.id;
    const fixed = isFixedFolder(folder.id);
    const folderName = fixed
      ? (folder.type === "outline"
          ? t("personalOutlines.folders.weekOutlines", { defaultValue: "Esboços da Semana" })
          : t("personalOutlines.folders.weekConsiderations", { defaultValue: "Considerações da Semana" }))
      : folder.name;
    const isDropTarget = dropHint?.kind === "folder" && dropHint.id === folder.id;
    const draggable = useDraggable({ id: `folder:${folder.id}`, disabled: fixed });
    const droppable = useDroppable({ id: `folder:${folder.id}` });
    const setRefs = (el: HTMLElement | null) => {
      draggable.setNodeRef(el);
      droppable.setNodeRef(el);
    };
    return (
      <div>
        <div
          ref={setRefs}
          {...draggable.attributes}
          {...draggable.listeners}
          className={cn(
            "group flex items-center gap-1 rounded-md px-1.5 py-1 text-sm cursor-pointer touch-none select-none",
            selected ? "bg-primary/10 text-primary" : "hover:bg-muted",
            isDropTarget && "ring-2 ring-primary/60 bg-primary/5",
            draggable.isDragging && "opacity-40",
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
          {isOpen
            ? <FolderOpen className={cn("h-4 w-4", fixed && "text-primary")} />
            : <Folder className={cn("h-4 w-4", fixed && "text-primary")} />}
          <span className={cn("flex-1 truncate", fixed && "font-medium")}>{folderName}</span>
          {!fixed && isAutoSyncFolder(folder.id, folders) && activeType !== "talk_notes" && (
            <Cloud className="h-3.5 w-3.5 text-primary" aria-label={t("personalOutlines.folders.autoSyncBadge", { defaultValue: "Sincroniza automaticamente" })} />
          )}
          {fixed && (
            <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-primary/15 text-primary">
              {t("personalOutlines.folders.fixedBadge", { defaultValue: "Fixa" })}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background">
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {!fixed && (
                <DropdownMenuItem onClick={() => handleCreateFolder(folder.id)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  {t("personalOutlines.folders.newSub")}
                </DropdownMenuItem>
              )}
              {!fixed && (
                <DropdownMenuItem onClick={() => handleRenameFolder(folder)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {t("personalOutlines.folders.rename")}
                </DropdownMenuItem>
              )}
              {!fixed && activeType !== "talk_notes" && (
                <DropdownMenuItem onClick={() => handleToggleAutoSync(folder)}>
                  <Cloud className="h-4 w-4 mr-2" />
                  {folder.autoSync
                    ? t("personalOutlines.folders.autoSyncDisable", { defaultValue: "Desativar sincronização automática" })
                    : t("personalOutlines.folders.autoSyncEnable", { defaultValue: "Ativar sincronização automática" })}
                </DropdownMenuItem>
              )}
              {!fixed && (
                <DropdownMenuItem
                  onClick={() => setMoveTarget({ kind: "folder", id: folder.id })}
                >
                  <Move className="h-4 w-4 mr-2" />
                  {t("personalOutlines.folders.moveTo", { defaultValue: "Mover para…" })}
                </DropdownMenuItem>
              )}
              {clipboardNoteIds.length > 0 && (
                <DropdownMenuItem onClick={() => handlePasteNote(folder.id)}>
                  <ClipboardPaste className="h-4 w-4 mr-2" />
                  {t("personalOutlines.folders.pasteHere", { defaultValue: "Colar aqui" })}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleExportFolder(folder)}>
                <Download className="h-4 w-4 mr-2" />
                {t("personalOutlines.folders.exportFolder")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportFolderDocx(folder)}>
                <FileText className="h-4 w-4 mr-2" />
                {t("personalOutlines.folders.exportFolderDocx", { defaultValue: "Exportar pasta (Word)" })}
              </DropdownMenuItem>
              {!fixed && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDeleteFolder(folder)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("personalOutlines.folders.delete")}
                  </DropdownMenuItem>
                </>
              )}
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
    const isClipped = clipboardNoteIds.includes(note.id);
    const isChecked = selectedIds.has(note.id);
    const hint = dropHint?.kind === "note" && dropHint.id === note.id ? "before" : null;
    const draggable = useDraggable({ id: `note:${note.id}` });
    const droppable = useDroppable({ id: `note:${note.id}` });
    const setRefs = (el: HTMLElement | null) => {
      draggable.setNodeRef(el);
      droppable.setNodeRef(el);
    };
    const multiBadge =
      draggable.isDragging && selectedIds.has(note.id) && selectedIds.size > 1
        ? selectedIds.size
        : null;
    return (
      <div
        ref={setRefs}
        {...draggable.attributes}
        {...draggable.listeners}
        className={cn(
          "cv-row group w-full flex items-center gap-1.5 rounded-lg px-1.5 py-2 text-sm touch-none select-none",
          selected ? "bg-primary/10 text-primary" : "hover:bg-muted",
          isClipped && "opacity-60 italic",
          hint === "before" && "border-t-2 border-primary",
          draggable.isDragging && "opacity-40",
        )}
        style={{ paddingLeft: 6 + depth * 12 + 16 }}
      >
        {multiBadge !== null && (
          <span className="text-[10px] rounded bg-primary text-primary-foreground px-1">
            {multiBadge}
          </span>
        )}


        <Checkbox
          checked={isChecked}
          onCheckedChange={(c) => {
            setSelectedIds((s) => {
              const next = new Set(s);
              if (c) next.add(note.id); else next.delete(note.id);
              return next;
            });
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 shrink-0"
          aria-label={t("common.select", { defaultValue: "Selecionar" })}
        />
        <button
          type="button"
          onClick={() => selectNote(note)}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          <FileText className="h-4 w-4 shrink-0 opacity-70" />
          <span className="flex-1 min-w-0">
            <span className="block truncate font-medium">{note.title || t("fieldConsiderations.fields.title")}</span>
            {note.updated_at ? (
              <span className="block truncate text-[11px] text-muted-foreground">{new Date(note.updated_at).toLocaleDateString()}</span>
            ) : null}
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 p-1 rounded hover:bg-background">
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleRenameNote(note)}>
                <Pencil className="h-4 w-4 mr-2" />
                {t("common.rename")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => reorderNote(note.id, -1)}>
                <ChevronUp className="h-4 w-4 mr-2" />
                {t("personalOutlines.folders.moveUp", { defaultValue: "Mover para cima" })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => reorderNote(note.id, 1)}>
                <ChevronDown className="h-4 w-4 mr-2" />
                {t("personalOutlines.folders.moveDown", { defaultValue: "Mover para baixo" })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMoveTarget({ kind: "note", id: note.id })}>
                <Move className="h-4 w-4 mr-2" />
                {t("personalOutlines.folders.moveTo", { defaultValue: "Mover para…" })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCutNote(note.id)}>
                <Scissors className="h-4 w-4 mr-2" />
                {t("personalOutlines.folders.cut", { defaultValue: "Recortar" })}
              </DropdownMenuItem>
              {activeType !== "talk_notes" && (
                <DropdownMenuItem onClick={() => handlePushNoteById(note.id)} disabled={cloudBusy}>
                  <CloudUpload className="h-4 w-4 mr-2" />
                  {t("personalOutlines.cloud.push", { defaultValue: "Enviar para nuvem" })}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => handleDeleteNoteById(note.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("common.delete", { defaultValue: "Excluir" })}
              </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }


  const isField = activeType === "field_consideration";
  const isOutline = activeType === "outline";
  const isTalkNotes = activeType === "talk_notes";

  return (
    <>
      <div className="space-y-4 w-full max-w-full overflow-x-clip box-border min-w-0">
        <header className={cn("flex items-center gap-3", draft && !showLibrary && "hidden lg:flex")}>
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
        <Card className={cn(draft && !showLibrary && "hidden lg:block")}>
          <CardContent className="p-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("personalOutlines.typePicker.label")}:
            </span>
            <div className="flex w-full sm:w-auto rounded-md border bg-background p-0.5">
              <button
                type="button"
                onClick={() => setActiveType("field_consideration")}
                className={cn(
                  "flex-1 sm:flex-none inline-flex items-center justify-center gap-1 whitespace-nowrap px-2 py-1.5 text-[11px] sm:text-xs rounded-sm transition",
                  isField ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {t("personalOutlines.typePicker.field")}
              </button>
              <button
                type="button"
                onClick={() => setActiveType("outline")}
                className={cn(
                  "flex-1 sm:flex-none inline-flex items-center justify-center gap-1 whitespace-nowrap px-2 py-1.5 text-[11px] sm:text-xs rounded-sm transition",
                  isOutline ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {t("personalOutlines.typePicker.outline")}
              </button>
              <button
                type="button"
                onClick={() => setActiveType("talk_notes")}
                className={cn(
                  "flex-1 sm:flex-none inline-flex items-center justify-center gap-1 whitespace-nowrap px-2 py-1.5 text-[11px] sm:text-xs rounded-sm transition",
                  isTalkNotes ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <NotebookPen className="h-3.5 w-3.5 shrink-0" />
                {t("personalOutlines.typePicker.talkNotes")}
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
          <>
          {recentNotes.length > 0 && !submittedQuery && (
            <Card className={cn("mb-4", draft && !showLibrary && "hidden lg:block")}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {t("personalOutlines.recentTitle", { defaultValue: "Esboços recentes" })}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none]">
                  {recentNotes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => selectNote(n)}
                      className={cn(
                        "shrink-0 w-40 rounded-xl border px-3 py-2 text-left transition-colors",
                        selectedNoteId === n.id ? "border-primary bg-primary/10" : "bg-card hover:bg-muted",
                      )}
                    >
                      <span className="block truncate text-sm font-medium">{n.title || t("fieldConsiderations.fields.title")}</span>
                      <span className="block text-[11px] text-muted-foreground">{dateFmt(n.updated_at)}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          <div className={cn("flex flex-col gap-4 w-full max-w-full min-w-0 lg:grid lg:items-start", draft && libCollapsed ? "lg:grid-cols-1" : "lg:grid-cols-[18rem_minmax(0,1fr)]")}>
            {/* Sidebar: árvore de pastas */}
            <Card className={cn("h-fit", draft && !showLibrary && "hidden lg:block", draft && libCollapsed && "lg:hidden")}>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" className="flex-1 h-9 rounded-full">
                            <Plus className="h-4 w-4 mr-1" /> {t("personalOutlines.list.new", { defaultValue: "Novo" })}
                            <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-80" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          <DropdownMenuItem onClick={handleNewNote}>
                            <Plus className="h-4 w-4 mr-2" /> {t("fieldConsiderations.newNote")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleImportDocx}>
                            <FileUp className="h-4 w-4 mr-2" /> {t("fieldConsiderations.docxImport.button")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCreateFolder(null)}>
                            <FolderPlus className="h-4 w-4 mr-2" /> {t("personalOutlines.folders.new")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                            <Upload className="h-4 w-4 mr-2" /> {t("personalOutlines.folders.import")}
                          </DropdownMenuItem>
                          {!isTalkNotes && (
                            <DropdownMenuItem onClick={handleCloudOpen}>
                              <CloudDownload className="h-4 w-4 mr-2" /> {t("personalOutlines.cloud.downloadButton", { defaultValue: "Baixar da nuvem" })}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                      <Button
                        size="sm"
                        variant={searchOpen ? "secondary" : "outline"}
                        className="h-9 w-9 p-0 rounded-full shrink-0"
                        aria-label={t("personalOutlines.search.open", { defaultValue: "Procurar esboço" })}
                        onClick={() => {
                          if (searchOpen) closeSearch();
                          else setSearchOpen(true);
                        }}
                      >
                        {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    {searchOpen && (
                      <form
                        className="flex gap-1.5"
                        onSubmit={(e) => { e.preventDefault(); setSubmittedQuery(query.trim()); }}
                      >
                        <Input
                          autoFocus
                          value={query}
                          onChange={(e) => { setQuery(e.target.value); if (!e.target.value.trim()) setSubmittedQuery(""); }}
                          placeholder={t("personalOutlines.search.placeholder", { defaultValue: "Tema do esboço" })}
                          className="h-9 rounded-full flex-1"
                        />
                        <Button type="submit" size="sm" className="h-9 rounded-full" disabled={!query.trim()}>
                          {t("personalOutlines.search.submit", { defaultValue: "Procurar" })}
                        </Button>
                      </form>
                    )}
                    {clipboardNoteIds.length > 0 && (
                      <div className="flex items-center gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 px-2 py-1.5 text-xs">
                        <Scissors className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="flex-1 truncate">
                          {t("personalOutlines.folders.clipboardHint", {
                            defaultValue: "1 nota recortada. Toque em \"Colar aqui\" na pasta de destino.",
                          })}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2"
                          onClick={handleClearClipboard}
                          title={t("personalOutlines.folders.cancelCut", { defaultValue: "Cancelar recorte" })}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          {t("personalOutlines.folders.cancelCut", { defaultValue: "Cancelar recorte" })}
                        </Button>
                      </div>
                    )}
                    {selectedIds.size > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1.5 text-xs">
                        <span className="font-medium">
                          {t("personalOutlines.folders.selectedCount", { defaultValue: "{{n}} selecionadas", n: selectedIds.size })}
                        </span>
                        <div className="flex-1" />
                        <Button size="sm" variant="outline" className="h-7 px-2"
                          onClick={() => setMoveTarget({ kind: "notes", ids: Array.from(selectedIds) })}>
                          <Move className="h-3.5 w-3.5 mr-1" />
                          {t("personalOutlines.folders.moveTo", { defaultValue: "Mover" })}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2"
                          onClick={() => handleCutMany(Array.from(selectedIds))}>
                          <Scissors className="h-3.5 w-3.5 mr-1" />
                          {t("personalOutlines.folders.cut", { defaultValue: "Recortar" })}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2"
                          onClick={() => handleExportMany(Array.from(selectedIds))}>
                          <Download className="h-3.5 w-3.5 mr-1" />
                          {t("personalOutlines.folders.exportNote", { defaultValue: "Exportar" })}
                        </Button>
                        {activeType !== "talk_notes" && (
                          <Button size="sm" variant="outline" className="h-7 px-2" disabled={cloudBusy}
                            onClick={() => handlePushManyByIds(Array.from(selectedIds))}>
                            <CloudUpload className="h-3.5 w-3.5 mr-1" />
                            {t("personalOutlines.cloud.push", { defaultValue: "Nuvem" })}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive"
                          onClick={() => handleDeleteMany(Array.from(selectedIds))}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          {t("common.delete", { defaultValue: "Excluir" })}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2"
                          onClick={() => setSelectedIds(new Set())}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                    <DndContext
                      sensors={dndSensors}
                      onDragStart={handleDndStart}
                      onDragOver={handleDndOver}
                      onDragEnd={handleDndEnd}
                      onDragCancel={() => { setDragItem(null); setDropHint(null); }}
                    >
                      {submittedQuery ? (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground px-1">
                            {t("personalOutlines.search.results", { defaultValue: "{{n}} resultado(s) para \"{{q}}\"", n: searchResults.length, q: submittedQuery })}
                          </p>
                          {searchResults.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">
                              {t("personalOutlines.search.none", { defaultValue: "Nenhum esboço com esse tema." })}
                            </p>
                          ) : (
                            <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
                              {searchResults.map((n) => <NoteRow key={n.id} note={n} depth={0} />)}
                            </div>
                          )}
                        </div>
                      ) : (
                      <>
                      {rootFolders.length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none]">
                          <PillChip id={null} label={t("common.all", { defaultValue: "Todos" })} />
                          {rootFolders.map((f) => (
                            <PillChip key={f.id} id={f.id} label={f.name} />
                          ))}
                        </div>
                      )}
                      <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
                        {rootFolders.length === 0 && rootNotes.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            {t("personalOutlines.folders.empty")}
                          </p>
                        )}
                        {rootFolders
                          .filter((f) => !activePill || f.id === activePill)
                          .map((f) => (
                            <FolderRow key={f.id} folder={f} depth={0} />
                          ))}
                        {!activePill && rootNotes.length > 0 && <RootDropZone />}
                        {!activePill && rootNotes.map((n) => (
                          <NoteRow key={n.id} note={n} depth={1} />
                        ))}
                      </div>
                      </>
                      )}
                      <DragOverlay dropAnimation={null}>
                        {dragItem ? (
                          <div className="rounded-md bg-primary text-primary-foreground px-2 py-1 text-xs shadow-lg">
                            {dragItem.kind === "folder"
                              ? t("personalOutlines.folders.label", { defaultValue: "Pasta" })
                              : (selectedIds.has(dragItem.id) && selectedIds.size > 1
                                  ? t("personalOutlines.folders.selectedCount", { defaultValue: "{{n}} selecionadas", n: selectedIds.size })
                                  : (notes.find((n) => n.id === dragItem.id)?.title || t("fieldConsiderations.fields.title")))}
                          </div>
                        ) : null}
                      </DragOverlay>
                    </DndContext>

                  </>
                )}
              </CardContent>
            </Card>


            {/* Editor */}
            <Card className={cn("w-full max-w-full overflow-hidden min-w-0", (!draft || showLibrary) && "hidden lg:block")}>
              <CardContent className="p-5 space-y-4 w-full max-w-full overflow-x-hidden box-border min-w-0">
                {draft && (
                  <div className="flex items-center -ml-2 -mt-2">
                    <Button variant="ghost" size="sm" className="lg:hidden h-8 px-2 text-primary" onClick={() => { setShowLibrary(true); window.scrollTo({ top: 0 }); }}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> {t("personalOutlines.list.back", { defaultValue: "Esboços" })}
                    </Button>
                    <Button variant="ghost" size="sm" className="hidden lg:inline-flex h-8 px-2 text-primary" onClick={() => setLibCollapsed((v) => !v)}>
                      {libCollapsed ? <ChevronLeft className="h-4 w-4 mr-1" /> : <Maximize2 className="h-4 w-4 mr-1" />}
                      {libCollapsed
                        ? t("personalOutlines.list.show", { defaultValue: "Mostrar esboços" })
                        : t("personalOutlines.list.expand", { defaultValue: "Expandir" })}
                    </Button>
                  </div>
                )}

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
                    onExportDocx={handleExportNoteDocx}
                    onFullscreen={() => setFullscreen(true)}
                    onCloud={handleCloudOpen}
                    dateFmt={dateFmt}
                    onInsertBibleText={handleInsertBibleText}
                  />
                )}
              </CardContent>
            </Card>
          </div>
          </>
        )}
      </div>

      {fullscreen && draft && (
        <FullscreenOutline
          note={draft}
          library={activeBible}
          onClose={() => setFullscreen(false)}
          onInsertBibleText={handleInsertBibleText}
        />
      )}

      <Dialog open={cloudOpen} onOpenChange={setCloudOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-full sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="break-words [overflow-wrap:anywhere]">
              {t("personalOutlines.cloud.title", { defaultValue: "Esboços na nuvem" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground break-words [overflow-wrap:anywhere]">
              {t("personalOutlines.cloud.help", { defaultValue: "Os esboços e pastas são sincronizados com a nuvem e mantidos em cache local para uso offline. Ao baixar, o esboço entra na pasta selecionada." })}
            </p>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                {t("personalOutlines.cloud.count", { defaultValue: "Salvos: {{n}}", n: cloudList.length })}
              </span>
              <Button size="sm" className="h-auto max-w-full whitespace-normal text-left sm:text-center" disabled={!draft || cloudBusy} onClick={handleCloudPush}>
                <CloudUpload className="h-4 w-4 mr-1.5" />
                {t("personalOutlines.cloud.push", { defaultValue: "Enviar esboço atual" })}
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto overflow-x-hidden rounded-md border divide-y">
              {(() => {
                const filtered = cloudList.filter((o) => (o.note_type ?? "outline") === (activeType ?? "outline"));
                if (filtered.length === 0) {
                  return (
                    <p className="p-4 text-sm text-muted-foreground text-center">
                      {t("personalOutlines.cloud.empty", { defaultValue: "Nenhum esboço na nuvem." })}
                    </p>
                  );
                }
                return filtered.map((o) => (
                  <div key={o.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 p-2 max-w-full min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium whitespace-normal break-words [overflow-wrap:anywhere]">{o.title}</p>
                      {o.folder_path && <p className="text-xs text-muted-foreground whitespace-normal break-words [overflow-wrap:anywhere]">{displayCloudPath(o.folder_path)}</p>}
                    </div>
                    <Button size="sm" variant="outline" disabled={cloudBusy} onClick={() => handleCloudPull(o.id)}>
                      <CloudDownload className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" disabled={cloudBusy} onClick={() => handleCloudDelete(o.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ));
              })()}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloudOpen(false)}>
              {t("common.close", { defaultValue: "Fechar" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={!!pendingCreate} onOpenChange={(o) => { if (!o) setPendingCreate(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("personalOutlines.chooseFolder.title", { defaultValue: "Salvar em qual pasta?" })}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto space-y-1">
            {folders.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">
                {t("personalOutlines.chooseFolder.empty", { defaultValue: "Crie uma pasta para guardar o esboço." })}
              </p>
            )}
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => openNewWithFolder(f.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-left hover:bg-muted"
              >
                <Folder className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleCreateFolder(null)}>
              <FolderPlus className="h-4 w-4 mr-1" /> {t("personalOutlines.folders.new")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {moveTarget && (
        <MoveToDialog
          folders={folders}
          allFolders={allFolders.length > 0 ? allFolders : folders}
          activeType={activeType}
          target={moveTarget}
          notes={notes}
          onClose={() => setMoveTarget(null)}
          onConfirm={handleConfirmMove}
          getDescendantFolderIds={getDescendantFolderIds}
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
  onExportDocx: () => void;
  onFullscreen: () => void;
  onCloud: () => void;
  dateFmt: (ts: number) => string;
  onInsertBibleText: (text: string) => void | Promise<void>;
}

function NoteEditor({
  draft, mode, type, saving, activeBible, detected,
  onPatch, onModeChange, onSave, onDelete, onExport, onExportDocx, onFullscreen, onCloud, dateFmt, onInsertBibleText,
}: EditorProps) {
  const { t } = useTranslation();
  const isField = type === "field_consideration";
  const isTalk = type === "talk_notes";
  const { visit } = useActiveVisit();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const META_COLLAPSED_KEY = "visita-sc:outline-meta-collapsed";
  const [metaCollapsed, setMetaCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(META_COLLAPSED_KEY) === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(META_COLLAPSED_KEY, metaCollapsed ? "1" : "0"); } catch { /* noop */ }
  }, [metaCollapsed]);

  const isWeekConsiderations = draft.folderId === FIXED_FOLDER_WEEK_CONSIDERATIONS;
  const isWeekOutline = type === "outline" && draft.folderId === FIXED_FOLDER_WEEK_OUTLINES;
  const onTalk = (v: NonNullable<FieldNote["talk"]>) => onPatch("talk", v);
  const talkSync = useTalkSync(visit?.id, draft.talk, onTalk);
  const canSync = isField && isWeekConsiderations && !!draft.event_date && !!draft.period && !!visit;
  const offline = isOfflineMode();

  const handleSyncFromField = async () => {
    if (!canSync || !visit) return;
    setSyncing(true);
    try {
      const weekdayMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
      };
      const dow = weekdayMap[String(draft.event_date)];
      if (dow === undefined) {
        toast.info(t("fieldConsiderations.syncFromField.empty"));
        return;
      }
      const days = eachDayOfInterval({ start: parseISO(visit.start_date), end: parseISO(visit.end_date) });
      const day = days.find((d) => d.getDay() === dow);
      if (!day) {
        toast.info(t("fieldConsiderations.syncFromField.empty"));
        return;
      }
      const dateKey = format(day, "yyyy-MM-dd");
      const periodLabelMap: Record<string, string> = {
        morning: t("meetingsTalks.field.morning"),
        afternoon: t("meetingsTalks.field.afternoon"),
        evening: t("meetingsTalks.field.evening", { defaultValue: "Noite" }),
      };
      const periodLabel = periodLabelMap[String(draft.period)] ?? String(draft.period);
      const { data, error } = await supabase
        .from("field_meetings")
        .select("territory_number,territory_location,auxiliary_leaders,closing_prayer")
        .eq("visit_id", visit.id)
        .eq("event_date", dateKey)
        .eq("period", periodLabel)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!data) {
        toast.info(t("fieldConsiderations.syncFromField.empty"));
        return;
      }
      const parts: string[] = [];
      if (data.territory_number && String(data.territory_number).trim()) {
        parts.push(`S-13 nº ${String(data.territory_number).trim()}`);
      }
      if (data.territory_location && String(data.territory_location).trim()) {
        parts.push(String(data.territory_location).trim());
      }
      const territoryValue = parts.join(" — ");
      onPatch("territory", territoryValue);
      onPatch("assistants", data.auxiliary_leaders ?? "");
      onPatch("prayer", data.closing_prayer ?? "");
      setLastSyncAt(Date.now());
      toast.success(t("fieldConsiderations.syncFromField.success"));
    } finally {
      setSyncing(false);
    }
  };


  return (
    <div className="w-full max-w-full overflow-x-clip box-border min-w-0 [overflow-wrap:anywhere] break-words flex flex-col min-h-[calc(100dvh-8rem)]">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 w-full max-w-full min-w-0 mb-3">

        <div className="flex items-center gap-2 flex-wrap">
          {!isTalk && (
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
          )}
          <span className="text-[11px] text-muted-foreground">
            {t("fieldConsiderations.updatedAt")}: {dateFmt(draft.updated_at)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SavingIndicator saving={saving} />
          {isField && (
            <FieldNoteInfoButton
              note={draft}
              onSync={canSync && !offline ? handleSyncFromField : undefined}
              syncing={syncing}
            />
          )}
          {isWeekOutline && draft.talk?.kind && (
            <FieldNoteInfoButton
              note={draft}
              onSync={talkSync.can ? talkSync.sync : undefined}
              syncing={talkSync.syncing}
            />
          )}
          {!(isField && mode === "outline") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMetaCollapsed((v) => !v)}
            title={metaCollapsed
              ? t("personalOutlines.editor.expandMeta", { defaultValue: "Expandir cabeçalho" })
              : t("personalOutlines.editor.collapseMeta", { defaultValue: "Minimizar cabeçalho" })}
          >
            {metaCollapsed ? <ChevronsUpDown className="h-4 w-4" /> : <ChevronsDownUp className="h-4 w-4" />}
            {isField && (
              <span className="ml-1 text-xs">
                {t("fieldConsiderations.editDetails", { defaultValue: "Editar detalhes" })}
              </span>
            )}
          </Button>
          )}
          {mode === "outline" && !isTalk && (
            <Button variant="outline" size="sm" onClick={onFullscreen}>
              <Maximize2 className="h-4 w-4 mr-1.5" /> {t("personalOutlines.fullscreen.enter")}
            </Button>
          )}
        </div>
      </div>



      <div className="shrink-0 grid gap-3 w-full max-w-full min-w-0 mb-3 empty:hidden max-h-[38vh] overflow-y-auto overflow-x-hidden pr-1">
        {!metaCollapsed && !(isField && mode === "outline") && (<>
        {isField && (
          <div className="grid gap-3 sm:grid-cols-2 w-full max-w-full min-w-0">
            <div className="grid gap-1.5 min-w-0">
              <Label>{t("fieldConsiderations.fields.date")}</Label>
              <Select
                value={draft.event_date ?? ""}
                onValueChange={(v) => onPatch("event_date", v)}
              >
                <SelectTrigger className="w-full max-w-full min-w-0">
                  <SelectValue placeholder={t("fieldConsiderations.fields.datePh")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monday">{t("fieldConsiderations.fields.weekdays.monday")}</SelectItem>
                  <SelectItem value="tuesday">{t("fieldConsiderations.fields.weekdays.tuesday")}</SelectItem>
                  <SelectItem value="wednesday">{t("fieldConsiderations.fields.weekdays.wednesday")}</SelectItem>
                  <SelectItem value="thursday">{t("fieldConsiderations.fields.weekdays.thursday")}</SelectItem>
                  <SelectItem value="friday">{t("fieldConsiderations.fields.weekdays.friday")}</SelectItem>
                  <SelectItem value="saturday">{t("fieldConsiderations.fields.weekdays.saturday")}</SelectItem>
                  <SelectItem value="sunday">{t("fieldConsiderations.fields.weekdays.sunday")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 min-w-0">
              <Label>{t("fieldConsiderations.fields.period")}</Label>
              <Select
                value={draft.period ?? ""}
                onValueChange={(v) => onPatch("period", v)}
              >
                <SelectTrigger className="w-full max-w-full min-w-0">
                  <SelectValue placeholder={t("fieldConsiderations.fields.periodPh")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">{t("fieldConsiderations.fields.morning")}</SelectItem>
                  <SelectItem value="afternoon">{t("fieldConsiderations.fields.afternoon")}</SelectItem>
                  <SelectItem value="evening">{t("fieldConsiderations.fields.evening")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {isWeekOutline && mode === "edit" && (
          <TalkOutlineFields talk={draft.talk} onChange={onTalk} visitId={visit?.id} />
        )}

        <div className="grid gap-1.5">
          <Label>{t("fieldConsiderations.fields.title")}</Label>
          {mode === "edit" ? (
            <Input
              value={draft.title}
              onChange={(e) => onPatch("title", e.target.value)}
              placeholder={t("fieldConsiderations.fields.titlePh")}
              className="w-full max-w-full min-w-0"
            />
          ) : (
            <div className="w-full max-w-full min-w-0 rounded-md border bg-muted/30 px-3 py-2 text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {draft.title || <span className="text-muted-foreground">{t("fieldConsiderations.fields.titlePh")}</span>}
            </div>
          )}
        </div>

        {isField ? (
          <>
            {canSync && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSyncFromField}
                  disabled={syncing || offline}
                  title={offline ? t("fieldConsiderations.syncFromField.offline") : undefined}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-1.5", syncing && "animate-spin")} />
                  {t("fieldConsiderations.syncFromField.button")}
                </Button>
                {lastSyncAt && (
                  <span className="text-[11px] text-muted-foreground">
                    {t("fieldConsiderations.syncFromField.lastSync")}: {new Date(lastSyncAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}
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
                {mode === "edit" ? (
                  <Input
                    value={draft.territory ?? ""}
                    onChange={(e) => onPatch("territory", e.target.value)}
                    placeholder={t("fieldConsiderations.fields.territoryPh")}
                    className="w-full max-w-full min-w-0"
                  />
                ) : (
                  <div className="w-full max-w-full min-w-0 rounded-md border bg-muted/30 px-3 py-2 text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                    {draft.territory || <span className="text-muted-foreground">{t("fieldConsiderations.fields.territoryPh")}</span>}
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-1.5 w-full max-w-full min-w-0">
              <Label>{t("fieldConsiderations.fields.assistants")}</Label>
              {mode === "edit" ? (
                <Input
                  value={draft.assistants ?? ""}
                  onChange={(e) => onPatch("assistants", e.target.value)}
                  placeholder={t("fieldConsiderations.fields.assistantsPh")}
                  className="w-full max-w-full min-w-0"
                />
              ) : (
                <div className="w-full max-w-full min-w-0 rounded-md border bg-muted/30 px-3 py-2 text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {draft.assistants || <span className="text-muted-foreground">{t("fieldConsiderations.fields.assistantsPh")}</span>}
                </div>
              )}
            </div>

          </>
        ) : null}
        </>)}

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
                  <VerseLink key={`${m.index}-${i}`} match={m} libraryId={activeBible?.id ?? null} onInsert={onInsertBibleText} />
                ))}
              </div>
            )}
            <BibleHistoryChips library={activeBible} onInsert={onInsertBibleText} />
          </div>

        )}
      </div>


      <div className="flex-1 min-h-[22rem] flex flex-col gap-1.5 w-full max-w-full min-w-0">

        <div className="shrink-0 -mx-3 sm:-mx-5 px-3 sm:px-5 py-2 bg-background border-b flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Label>{t("fieldConsiderations.fields.content")}</Label>
          {!isTalk && mode === "outline" && (
            <div className="w-full sm:w-auto overflow-x-auto">
              <OutlineTimer outlineId={draft.id} variant="toolbar" />
            </div>
          )}
        </div>
        {!isTalk && mode === "outline" && (
          <OutlineInactivitySensor outlineId={draft.id} />
        )}

        {(() => {
          const hasAttachments = (draft.attachments?.length ?? 0) > 0;
          // Barra de anexos tem altura fixa de 5rem (h-20). Descontar do
          // cálculo da janela rígida para preservar o scroll interno.
          const attachRow = hasAttachments ? " - 5rem" : "";
          const minH = metaCollapsed ? `calc(100dvh - 14rem${attachRow})` : "22rem";
          const maxH = metaCollapsed ? `calc(100dvh - 14rem${attachRow})` : "60vh";
          return mode === "edit" ? (
            <React.Suspense fallback={<div className="flex-1 rounded-md border bg-muted/30" style={{ minHeight: minH }} aria-busy="true" />}>
            <RichNoteEditor
              value={draft.content}
              onChange={(html) => onPatch("content", html)}
              placeholder={t("fieldConsiderations.fields.contentPh")}
              noteId={draft.id}
              minHeight={minH}
              maxHeight={maxH}
              className="flex-1 min-h-0"
              // Missão 01: sem cronômetro embutido no modo edição.
              outlineId={undefined}
              compact={metaCollapsed}
              attachments={draft.attachments ?? []}
              onAttachmentsChange={(next) => onPatch("attachments", next)}
            />
            </React.Suspense>
          ) : (
            <>
              {hasAttachments && (
                <OutlineAttachmentsBar
                  attachments={draft.attachments ?? []}
                  readOnly
                  className="rounded-md border"
                />
              )}
              <div className="flex-1 min-h-[22rem] bg-background px-1 py-4 sm:px-6 text-[17px] leading-8 break-words [overflow-wrap:anywhere]">
                <div className="max-w-[68ch] mx-auto">
                {draft.content ? (
                  <RichOutlineContent html={draft.content} library={activeBible} onInsertVerse={onInsertBibleText} />
                ) : (
                  <span className="text-muted-foreground italic">
                    {t("fieldConsiderations.contentEmpty")}
                  </span>
                )}
                </div>
              </div>
            </>
          );
        })()}

      </div>


      {/* Action bar — sempre visível no rodapé do editor (flex item, não sticky) */}
      <div className="shrink-0 mt-3 -mx-5 px-3 sm:px-5 py-3 bg-background/95 backdrop-blur border-t flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 w-[calc(100%+1.5rem)] sm:w-[calc(100%+2.5rem)] max-w-[calc(100%+2.5rem)]">
        {mode === "outline" && (
          <Button variant="outline" size="sm" onClick={() => onModeChange("edit")} title={t("fieldConsiderations.edit")}>
            <Pencil className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">{t("fieldConsiderations.edit")}</span>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onExport} title={t("personalOutlines.folders.exportNote")}>
          <Download className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">{t("personalOutlines.folders.exportNote")}</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onExportDocx} title={t("personalOutlines.folders.exportDocx", { defaultValue: "Word (.docx)" })}>
          <FileText className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">Word</span>
        </Button>
        {!isTalk && (
          <Button variant="outline" size="sm" onClick={onCloud} title={t("personalOutlines.cloud.button", { defaultValue: "Nuvem" })}>
            <Cloud className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">{t("personalOutlines.cloud.button", { defaultValue: "Nuvem" })}</span>
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive" title={t("fieldConsiderations.delete")}>
          <Trash2 className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">{t("fieldConsiderations.delete")}</span>
        </Button>
        {mode === "edit" && (
          <Button size="sm" onClick={onSave} disabled={saving} title={t("fieldConsiderations.save")}>
            <Save className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">{t("fieldConsiderations.save")}</span>
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
  onInsertBibleText,
}: {
  note: FieldNote;
  library: BibleLibrary | null;
  onClose: () => void;
  onInsertBibleText: (text: string) => void | Promise<void>;
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

  const showTimer = (note.type ?? "field_consideration") !== "talk_notes";

  return (
    <div className="webkit-stable-layer fixed inset-0 z-[100] bg-background flex flex-col w-screen max-w-full overflow-x-hidden overscroll-x-none safe-top safe-bottom safe-x">
      {showTimer && <OutlineTimer outlineId={note.id} variant="fullscreen" />}
      {showTimer && <OutlineInactivitySensor outlineId={note.id} />}
      <div className="border-b px-4 py-2 min-w-0 shrink-0">

        {/* Linha 1: título + fechar (sempre visível) */}
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-sm font-semibold truncate flex-1 min-w-0">
            {note.title || t("fieldConsiderations.fields.title")}
          </h2>

          {/* Controles inline em telas >= sm */}
          <div className="hidden sm:flex items-center gap-2">
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
          </div>

          {((note.type ?? "field_consideration") === "field_consideration" || !!note.talk?.kind) && <FieldNoteInfoButton note={note} />}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 h-9 w-9"
            title={t("personalOutlines.fullscreen.exit")}
            aria-label={t("personalOutlines.fullscreen.exit")}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Linha 2 (apenas mobile): zoom */}
        <div className="flex sm:hidden items-center gap-1 mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => setScale((s) => Math.max(FS_MIN, +(s - FS_STEP).toFixed(2)))}
            title={t("personalOutlines.fullscreen.fontDown")}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-xs tabular-nums w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => setScale((s) => Math.min(FS_MAX, +(s + FS_STEP).toFixed(2)))}
            title={t("personalOutlines.fullscreen.fontUp")}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {note.attachments && note.attachments.length > 0 && (
        <OutlineAttachmentsBar attachments={note.attachments} readOnly />
      )}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-6">
        <div
          className="max-w-3xl mx-auto leading-relaxed min-w-0 break-words [overflow-wrap:anywhere]"
          style={{ fontSize: `${scale}rem` }}
        >
          {note.content ? (
            <>
              <RichOutlineContent html={note.content} library={library} fontScale={scale} onInsertVerse={onInsertBibleText} />
              <div className="mt-5">
                <BibleHistoryChips library={library} onInsert={onInsertBibleText} />
              </div>
            </>
          ) : (
            <span className="text-muted-foreground italic">{t("fieldConsiderations.contentEmpty")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Move-to dialog (escolhe pasta destino para uma nota ou pasta)
// =============================================================

function MoveToDialog({
  folders,
  notes,
  target,
  onClose,
  onConfirm,
  getDescendantFolderIds,
  allFolders,
  activeType,
}: {
  folders: NoteFolder[];
  notes: FieldNote[];
  target: { kind: "note"; id: string } | { kind: "notes"; ids: string[] } | { kind: "folder"; id: string };
  onClose: () => void;
  onConfirm: (targetFolderId: string | null, targetType?: NoteType) => Promise<void> | void;
  getDescendantFolderIds: (rootId: string) => Set<string>;
  allFolders?: NoteFolder[];
  activeType?: NoteType | null;
}) {
  const { t } = useTranslation();
  const isNoteMove = target.kind === "note" || target.kind === "notes";
  const treeFolders = isNoteMove && allFolders ? allFolders : folders;

  // Pasta atual do item (origem) — para mostrar "aqui" (só faz sentido p/ kind=note).
  const currentParentId: string | null =
    target.kind === "note"
      ? (notes.find((n) => n.id === target.id)?.folderId ?? null)
      : target.kind === "folder"
        ? (folders.find((f) => f.id === target.id)?.parentId ?? null)
        : null;

  const forbidden: Set<string> = target.kind === "folder"
    ? getDescendantFolderIds(target.id)
    : new Set();

  function Row({
    label,
    depth,
    folderId,
    icon,
    targetType,
  }: {
    label: string;
    depth: number;
    folderId: string | null;
    icon: React.ReactNode;
    targetType?: NoteType;
  }) {
    const isCurrent = (folderId ?? null) === (currentParentId ?? null) && (!targetType || targetType === activeType);
    const isForbidden = folderId !== null && forbidden.has(folderId);
    const disabled = isCurrent || isForbidden;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onConfirm(folderId, targetType)}
        className={cn(
          "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
          disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted",
        )}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {icon}
        <span className="flex-1 truncate">{label}</span>
        {isCurrent && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t("personalOutlines.folders.hereLabel", { defaultValue: "aqui" })}
          </span>
        )}
      </button>
    );
  }

  function renderTree(parentId: string | null, depth: number, type?: NoteType): React.ReactNode {
    return treeFolders
      .filter((f) => (f.parentId ?? null) === parentId && (!type || f.type === type))
      .map((f) => (
        <div key={f.id}>
          <Row
            label={isFixedFolder(f.id)
              ? (f.id === FIXED_FOLDER_WEEK_OUTLINES || f.type === "outline"
                  ? t("personalOutlines.folders.weekOutlines", { defaultValue: "Esboços da Semana" })
                  : t("personalOutlines.folders.weekConsiderations", { defaultValue: "Considerações da Semana" }))
              : f.name}
            depth={depth}
            folderId={f.id}
            icon={<Folder className={cn("h-4 w-4", isFixedFolder(f.id) ? "text-primary" : "text-muted-foreground")} />}
            targetType={type ?? f.type}
          />
          {renderTree(f.id, depth + 1, type)}
        </div>
      ));
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("personalOutlines.folders.moveTo", { defaultValue: "Mover para…" })}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto -mx-2 px-2 space-y-0.5">
          {isNoteMove && allFolders ? (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2 pt-1">
                {t("personalOutlines.typePicker.outline", { defaultValue: "Esboços" })}
              </div>
              {renderTree(null, 0, "outline")}
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2 pt-3">
                {t("personalOutlines.typePicker.field", { defaultValue: "Consideração de Campo" })}
              </div>
              {renderTree(null, 0, "field_consideration")}
            </>
          ) : (
            <>
              <Row
                label={t("personalOutlines.folders.root", { defaultValue: "📁 Raiz (sem pasta)" })}
                depth={0}
                folderId={null}
                icon={<FolderOpen className="h-4 w-4 text-muted-foreground" />}
              />
              {renderTree(null, 0)}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel", { defaultValue: "Cancelar" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


