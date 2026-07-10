import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { FileText, PencilLine, Plus, Minus, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RichOutlineContent } from "@/lib/rich-content";
import { OutlineTimer } from "@/components/notes/OutlineTimer";
import { OutlineInactivitySensor } from "@/components/notes/OutlineInactivitySensor";
import { OutlineAttachmentsBar } from "@/components/notes/OutlineAttachmentsBar";
import {
  listAllNotesIncludingTrash,
  getActiveLibrary,
  type FieldNote,
  type BibleLibrary,
} from "@/lib/bible-notes-store";

interface FieldNoteFullscreenDialogProps {
  noteId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: (note: FieldNote) => void;
}

const FONT_SCALE_KEY = "visita-sc:dashboard:fullscreen:font-scale";
const FS_MIN = 0.75;
const FS_MAX = 2;
const FS_STEP = 0.1;

/**
 * Visualização em tela cheia da nota dentro do Dashboard.
 *
 * Espelha o comportamento do "Fullscreen" da aba "Esboços Pessoais":
 * - Conteúdo renderizado via RichOutlineContent (somente leitura) para que
 *   as citações bíblicas detectadas abram em popup (VerseLink).
 * - Controles de zoom de fonte (+/-), persistidos em localStorage.
 * - Atalho "Esc" fecha; botão dedicado abre a nota em modo esboço (edição
 *   completa) na rota /consideracoes-campo, sem perder o estado local.
 *
 * 100% local-first: nenhuma chamada à nuvem aqui. A sincronização com o
 * Supabase continua a cargo do pipeline existente (use-outlines-sync).
 */
export function FieldNoteFullscreenDialog({
  noteId,
  onOpenChange,
  onSaved: _onSaved,
}: FieldNoteFullscreenDialogProps) {
  const { t } = useTranslation();
  const [note, setNote] = useState<FieldNote | null>(null);
  const [library, setLibrary] = useState<BibleLibrary | null>(null);
  const [loading, setLoading] = useState(false);

  const [scale, setScale] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    try {
      const raw = window.localStorage.getItem(FONT_SCALE_KEY);
      const n = raw ? Number(raw) : 1;
      return Number.isFinite(n) && n >= FS_MIN && n <= FS_MAX ? n : 1;
    } catch {
      return 1;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(FONT_SCALE_KEY, String(scale));
    } catch {
      /* noop */
    }
  }, [scale]);

  // Carrega nota + biblioteca ativa quando o id muda.
  useEffect(() => {
    if (!noteId) {
      setNote(null);
      setLibrary(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [all, lib] = await Promise.all([
          listAllNotesIncludingTrash(),
          getActiveLibrary(),
        ]);
        if (cancelled) return;
        const found =
          all.find((n) => n.id === noteId && n.deleted_at == null) ?? null;
        setNote(found);
        setLibrary(lib);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  const open = noteId != null;

  const showTimer = note != null && (note.type ?? "field_consideration") !== "talk_notes";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 max-w-[100vw] sm:max-w-[100vw] w-screen h-[100dvh] sm:h-[100dvh] flex flex-col rounded-none overflow-hidden"
        onPointerDownOutside={(e) => {
          // Não fechar o diálogo quando o usuário interage com o
          // popover de versículos bíblicos (Radix portala para fora
          // do DialogContent, então a interação é vista como "outside").
          const target = e.target as HTMLElement | null;
          if (target?.closest("[data-radix-popper-content-wrapper]")) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest("[data-radix-popper-content-wrapper]")) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest("[data-radix-popper-content-wrapper]")) {
            e.preventDefault();
          }
        }}
      >
        {showTimer && note && (
          <>
            <OutlineTimer outlineId={note.id} variant="fullscreen" />
            <OutlineInactivitySensor outlineId={note.id} />
          </>
        )}
        <div className={`flex items-center gap-2 border-b px-3 sm:px-4 py-2 shrink-0 min-w-0${showTimer ? " pt-12" : ""}`}>
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <DialogTitle className="text-sm font-semibold truncate flex-1 min-w-0 m-0">
            {note?.title ||
              t("fieldConsiderations.fields.title", { defaultValue: "Nota" })}
          </DialogTitle>

          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setScale((s) => Math.max(FS_MIN, +(s - FS_STEP).toFixed(2)))
            }
            title={t("personalOutlines.fullscreen.fontDown", {
              defaultValue: "Diminuir fonte",
            })}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-xs tabular-nums w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setScale((s) => Math.min(FS_MAX, +(s + FS_STEP).toFixed(2)))
            }
            title={t("personalOutlines.fullscreen.fontUp", {
              defaultValue: "Aumentar fonte",
            })}
          >
            <Plus className="h-4 w-4" />
          </Button>

          {note && (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link
                to="/consideracoes-campo"
                search={{ noteId: note.id, mode: "outline" }}
              >
                <PencilLine className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">
                  {t("dashboard.studyNotesGoToOutline", {
                    defaultValue: "Abrir no modo esboço",
                  })}
                </span>
              </Link>
            </Button>
          )}

          {/* Espaço reservado para o X de fechar do Dialog (absoluto, top-right). */}
          <div className="w-8 shrink-0" aria-hidden />
        </div>

        {note?.attachments && note.attachments.length > 0 && (
          <OutlineAttachmentsBar attachments={note.attachments} readOnly />
        )}





        <DialogDescription className="sr-only">
          {t("dashboard.studyNotesOpenFullscreen", {
            defaultValue: "Visualização em tela cheia",
          })}
        </DialogDescription>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-6">
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
            <div
              className="max-w-3xl mx-auto leading-relaxed min-w-0 break-words [overflow-wrap:anywhere]"
              style={{ fontSize: `${scale}rem` }}
            >
              {note.content ? (
                <RichOutlineContent
                  html={note.content}
                  library={library}
                  fontScale={scale}
                />
              ) : (
                <span className="text-muted-foreground italic">
                  {t("fieldConsiderations.contentEmpty", {
                    defaultValue: "(Sem conteúdo)",
                  })}
                </span>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
