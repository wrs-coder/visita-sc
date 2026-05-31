import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Maximize2, PencilLine, Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichNoteEditor } from "@/components/notes/RichNoteEditor";
import {
  listAllNotesIncludingTrash,
  saveNote,
  type FieldNote,
} from "@/lib/bible-notes-store";

interface FieldNoteFullscreenDialogProps {
  noteId: string | null;
  onOpenChange: (open: boolean) => void;
  /** Chamado após autosave bem-sucedido (para refresh do preview). */
  onSaved?: (note: FieldNote) => void;
}

/**
 * Visualização/edição em tela cheia da nota dentro do próprio Dashboard.
 *
 * Princípios:
 * - 100% local-first: lê e grava em IndexedDB via bible-notes-store.
 *   A sincronização com Supabase é responsabilidade do pipeline existente
 *   (use-outlines-sync), então não geramos chamadas extras à nuvem aqui.
 *   Isso preserva o orçamento de banco × milhares de usuários.
 * - Autosave debounced (600ms) + flush ao fechar evita gravações em rajada.
 * - Reusa RichNoteEditor (mesmo autor de conteúdo do "modo esboço") para não
 *   duplicar lógica de formatação/atalhos.
 */
export function FieldNoteFullscreenDialog({
  noteId,
  onOpenChange,
  onSaved,
}: FieldNoteFullscreenDialogProps) {
  const { t } = useTranslation();
  const [note, setNote] = useState<FieldNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef<FieldNote | null>(null);

  // Carrega a nota do IndexedDB quando o id muda.
  useEffect(() => {
    if (!noteId) {
      setNote(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const all = await listAllNotesIncludingTrash();
        const found = all.find((n) => n.id === noteId && n.deleted_at == null) ?? null;
        if (!cancelled) setNote(found);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  // Flush pendente ao desmontar / fechar.
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      const pending = dirtyRef.current;
      if (pending) {
        void saveNote(pending).then(() => onSaved?.(pending)).catch(() => {});
        dirtyRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scheduleSave(next: FieldNote) {
    dirtyRef.current = next;
    setStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const toSave = dirtyRef.current;
      if (!toSave) return;
      try {
        await saveNote(toSave);
        dirtyRef.current = null;
        setStatus("saved");
        onSaved?.(toSave);
        setTimeout(() => {
          setStatus((s) => (s === "saved" ? "idle" : s));
        }, 1500);
      } catch {
        setStatus("idle");
      }
    }, 600);
  }

  function patch<K extends keyof FieldNote>(key: K, value: FieldNote[K]) {
    if (!note) return;
    const next: FieldNote = {
      ...note,
      [key]: value,
      updated_at: Date.now(),
      dirty: true,
    };
    setNote(next);
    scheduleSave(next);
  }

  const open = noteId != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 max-w-[100vw] sm:max-w-[95vw] h-[100dvh] sm:h-[95vh] flex flex-col rounded-none sm:rounded-lg overflow-hidden"
      >
        <div className="flex items-center gap-2 border-b px-3 sm:px-4 py-2 shrink-0">
          <Maximize2 className="h-4 w-4 text-primary shrink-0" />
          <Input
            value={note?.title ?? ""}
            onChange={(e) => patch("title", e.target.value)}
            placeholder={t("dashboard.studyNotesTitlePlaceholder")}
            className="border-0 shadow-none focus-visible:ring-0 text-base font-semibold px-1 h-8 min-w-0 flex-1"
            disabled={!note}
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            {status === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">
                  {t("dashboard.studyNotesSavingAuto")}
                </span>
              </>
            )}
            {status === "saved" && (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                <span className="hidden sm:inline">
                  {t("dashboard.studyNotesSavedAuto")}
                </span>
              </>
            )}
          </div>
          {note && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="shrink-0 mr-8"
              onClick={() => {
                // Flush antes de navegar.
                if (debounceRef.current) {
                  clearTimeout(debounceRef.current);
                  debounceRef.current = null;
                }
                const pending = dirtyRef.current;
                if (pending) void saveNote(pending);
              }}
            >
              <Link
                to="/consideracoes-campo"
                search={{ noteId: note.id, mode: "outline" }}
              >
                <PencilLine className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">
                  {t("dashboard.studyNotesGoToOutline")}
                </span>
                <span className="sm:hidden">Esboço</span>
              </Link>
            </Button>
          )}
        </div>

        {/* a11y: títulos invisíveis exigidos pelo Radix Dialog */}
        <DialogTitle className="sr-only">
          {note?.title || t("dashboard.studyNotesTitlePlaceholder")}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t("dashboard.studyNotesOpenFullscreen")}
        </DialogDescription>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              …
            </div>
          ) : !note ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              —
            </div>
          ) : (
            <RichNoteEditor
              noteId={note.id}
              value={note.content ?? ""}
              onChange={(html) => patch("content", html)}
              minHeight="60vh"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
