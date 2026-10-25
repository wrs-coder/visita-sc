/**
 * Rascunho automático dos Esboços pessoais (só no aparelho).
 *
 * Enquanto o orador escreve, guarda uma cópia local a cada pausa (~1,5 s)
 * e ao sair do app. Ao reabrir um esboço com alterações não salvas, mostra
 * uma faixa discreta com "Recuperar" / "Descartar". O salvamento real
 * continua sendo o botão "Salvar" de sempre.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { FieldNote } from "@/lib/bible-notes-store";

const PREFIX = "visita-sc:note-draft:";
const DEBOUNCE_MS = 1500;

interface Stored {
  note: FieldNote;
  savedAt: number;
}

export function readNoteDraft(id: string): Stored | null {
  try {
    const raw = localStorage.getItem(PREFIX + id);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

export function clearNoteDraft(id: string): void {
  try { localStorage.removeItem(PREFIX + id); } catch { /* noop */ }
}

function writeNoteDraft(note: FieldNote): void {
  try {
    localStorage.setItem(PREFIX + note.id, JSON.stringify({ note, savedAt: Date.now() } satisfies Stored));
  } catch (err) {
    console.warn("[note-draft] não foi possível guardar o rascunho", err);
  }
}

/** True quando o texto/título difere do que está salvo. */
export function differsFromSaved(draft: FieldNote, saved: FieldNote | undefined): boolean {
  if (!saved) return !!(draft.title?.trim() || draft.content?.trim());
  return draft.title !== saved.title || draft.content !== saved.content;
}

export function NoteDraftGuard({
  draft,
  saved,
  onRestore,
}: {
  draft: FieldNote;
  saved: FieldNote | undefined;
  onRestore: (note: FieldNote) => void;
}) {
  const { t } = useTranslation();
  const [recovery, setRecovery] = useState<Stored | null>(null);
  const checkedRef = useRef<string | null>(null);
  const latest = useRef(draft);
  latest.current = draft;
  const dirty = differsFromSaved(draft, saved);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // Ao abrir um esboço: oferece recuperar rascunho mais novo que o salvo.
  useEffect(() => {
    if (checkedRef.current === draft.id) return;
    checkedRef.current = draft.id;
    const stored = readNoteDraft(draft.id);
    if (stored && stored.savedAt > (saved?.updated_at ?? 0) && differsFromSaved(stored.note, saved)) {
      setRecovery(stored);
    } else {
      setRecovery(null);
      if (stored) clearNoteDraft(draft.id);
    }
  }, [draft.id, saved]);

  // Gravação automática a cada pausa na digitação (não durante a recuperação).
  useEffect(() => {
    if (recovery) return;
    if (!dirty) {
      clearNoteDraft(draft.id);
      return;
    }
    const id = window.setTimeout(() => writeNoteDraft(draft), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [draft, dirty, recovery]);

  // Ao sair/esconder o app: grava na hora e avisa se fechar com alterações.
  useEffect(() => {
    const flushNow = () => {
      if (dirtyRef.current) writeNoteDraft(latest.current);
    };
    const onHide = () => { if (document.visibilityState === "hidden") flushNow(); };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      flushNow();
      if (dirtyRef.current) e.preventDefault();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      flushNow();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [draft.id]);

  if (!recovery) return null;
  const time = new Intl.DateTimeFormat(undefined, {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(recovery.savedAt);

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs" role="status">
      <span className="flex-1 min-w-0">
        {t("personalOutlines.draft.found", { time, defaultValue: "Há alterações não salvas de {{time}}." })}
      </span>
      <Button
        type="button"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => { onRestore({ ...draft, title: recovery.note.title, content: recovery.note.content }); setRecovery(null); }}
      >
        {t("personalOutlines.draft.restore", { defaultValue: "Recuperar" })}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={() => { clearNoteDraft(draft.id); setRecovery(null); }}
      >
        {t("personalOutlines.draft.discard", { defaultValue: "Descartar" })}
      </Button>
    </div>
  );
}
