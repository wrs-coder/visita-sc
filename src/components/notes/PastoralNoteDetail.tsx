/**
 * Nota "Pastoreio" aberta sozinha (estilo Samsung Notes): campos do
 * pastoreio + "Esboço do pastoreio" com o mesmo editor dos Esboços Pessoais
 * (formatação, textos bíblicos, links, imagens, vídeos), modo esboço (📖)
 * e tela cheia (⤢). O esboço fica em payload.outline_html e os anexos em
 * payload.attachments — notas antigas abrem com o esboço vazio.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BookOpen, Check, ChevronDown, Loader2, Maximize2, Minimize2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getActiveLibrary, type BibleLibrary, type FieldNote } from "@/lib/bible-notes-store";
import { appendPlainTextToNote } from "@/lib/note-content";
import type { NoteAttachment } from "@/lib/outline-attachments";
import { readPastoralOutline } from "@/lib/pastoral-outline";
import { FullscreenOutline } from "@/components/outlines/OutlinesWorkspace";
import { FloatingVersePanel } from "@/components/guest-workspace/FloatingVersePanel";
import { findCitations, stripHtmlForDetection } from "@/lib/bible-refs";
import { pastoralFieldsSummary } from "@/lib/pastoral-outline";
import { cn } from "@/lib/utils";

const FIELDS_COLLAPSED_KEY = "pastoral.fieldsCollapsed";

const RichNoteEditor = lazy(() => import("./RichNoteEditor").then((m) => ({ default: m.RichNoteEditor })));

export interface PastoralNoteLike {
  id: string;
  title: string | null;
  note_date: string | null;
  companion: string | null;
  involved_names: string | null;
  additional_info: string | null;
  payload: Record<string, unknown> | null;
}

export function PastoralNoteDetail({ note, saving, onSave, onRemove, onClose }: {
  note: PastoralNoteLike;
  saving: boolean;
  onSave: (patch: Partial<PastoralNoteLike>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const initial = readPastoralOutline(note.payload);
  const [title, setTitle] = useState(note.title ?? "");
  const [date, setDate] = useState(note.note_date ?? "");
  const [companion, setCompanion] = useState(note.companion ?? "");
  const [involved, setInvolved] = useState(note.involved_names ?? "");
  const [additional, setAdditional] = useState(note.additional_info ?? "");
  const [html, setHtml] = useState(initial.html);
  const [attachments, setAttachments] = useState<NoteAttachment[]>(initial.attachments);
  const [expanded, setExpanded] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [library, setLibrary] = useState<BibleLibrary | null>(null);
  useEffect(() => { void getActiveLibrary("outlines").then(setLibrary); }, []);
  // Informações da visita recolhíveis; a escolha fica neste aparelho.
  const [fieldsCollapsed, setFieldsCollapsed] = useState(false);
  useEffect(() => {
    try { setFieldsCollapsed(localStorage.getItem(FIELDS_COLLAPSED_KEY) === "1"); } catch { /* noop */ }
  }, []);
  const toggleFields = () => setFieldsCollapsed((v) => {
    try { localStorage.setItem(FIELDS_COLLAPSED_KEY, v ? "0" : "1"); } catch { /* noop */ }
    return !v;
  });
  // Textos bíblicos digitados no esboço (mesma detecção dos Esboços Pessoais).
  const detected = useMemo(
    () => (library ? findCitations(library.books, stripHtmlForDetection(html)) : []),
    [library, html],
  );
  const insertBibleText = (text: string) => setHtml((h) => appendPlainTextToNote(h, text));

  const dirty = title !== (note.title ?? "") || date !== (note.note_date ?? "")
    || companion !== (note.companion ?? "") || involved !== (note.involved_names ?? "")
    || additional !== (note.additional_info ?? "") || html !== initial.html
    || JSON.stringify(attachments) !== JSON.stringify(initial.attachments);

  const save = () => {
    if (!dirty) return;
    onSave({
      title: title || null, note_date: date || null, companion, involved_names: involved,
      additional_info: additional,
      payload: { ...(note.payload ?? {}), outline_html: html, attachments },
    });
  };
  const close = () => { save(); onClose(); };

  const asFieldNote: FieldNote = {
    id: `pastoral-${note.id}`, type: "talk_notes", title: title || t("notes.categories.pastoral.default", { defaultValue: "Pastoreio" }),
    content: html, attachments, created_at: 0, updated_at: 0,
  };

  // Portal: a lista usa content-visibility (contenção), que prenderia este
  // overlay fixed dentro do cartão — ele ficava como uma faixa fina.
  // Camada z-45: acima do topo do app (z-30) e ABAIXO das janelas de link,
  // anexos e listas (z-50), que antes abriam escondidas atrás da nota.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div data-back-closable className="fixed inset-0 z-[45] flex flex-col bg-background bar-top">
      <div className="flex items-center gap-1 border-b px-2 py-2 shrink-0">
        <Button size="icon" variant="ghost" onClick={close} aria-label={t("common.back", { defaultValue: "Voltar" })} title={t("common.back", { defaultValue: "Voltar" })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 flex-1 border-0 px-1 font-semibold shadow-none focus-visible:ring-0" placeholder={t("notes.titlePlaceholder")} />
        <Button size="icon" variant="ghost" onClick={() => setOutlineOpen(true)} aria-label={t("fieldConsiderations.outlineMode")} title={t("fieldConsiderations.outlineMode")}>
          <BookOpen className="h-5 w-5" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => setExpanded((v) => !v)} aria-label={t("notes.pastoral.fullscreen", { defaultValue: "Tela cheia" })} title={t("notes.pastoral.fullscreen", { defaultValue: "Tela cheia" })}>
          {expanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={onRemove} aria-label={t("common.delete", { defaultValue: "Excluir" })}>
          <Trash2 className="h-5 w-5 text-destructive" />
        </Button>
        <Button size="icon" variant="ghost" disabled={!dirty || saving} onClick={save} aria-label={t("notes.save")} title={t("notes.save")}>
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
        {!expanded && (
          <section className="rounded-2xl border bg-card">
            <button
              type="button"
              onClick={toggleFields}
              aria-expanded={!fieldsCollapsed}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold">{t("notes.pastoral.visitInfo", { defaultValue: "Informações da visita" })}</span>
                {fieldsCollapsed && (
                  <span className="block truncate text-xs text-muted-foreground">{pastoralFieldsSummary({ date, companion, involved }, (n) => t("notes.pastoral.peopleCount", { count: n, defaultValue: "{{count}} pessoas" })) || "—"}</span>
                )}
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", !fieldsCollapsed && "rotate-180")} />
            </button>
            {/* Recolhido só esconde (não desmonta), para não perder o que foi digitado. */}
            <div className={cn("grid grid-cols-1 gap-2 border-t px-3 pb-3 pt-2", fieldsCollapsed && "hidden")}>
              <div><Label className="text-xs">{t("notes.pastoral.dateLabel")}</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div><Label className="text-xs">{t("notes.pastoral.companion")}</Label><Input value={companion} onChange={(e) => setCompanion(e.target.value)} placeholder={t("notes.pastoral.companionPlaceholder")} /></div>
              <div><Label className="text-xs">{t("notes.pastoral.involved")}</Label><Textarea rows={3} value={involved} onChange={(e) => setInvolved(e.target.value)} placeholder={t("notes.pastoral.involvedPlaceholder")} /></div>
              <div><Label className="text-xs">{t("notes.pastoral.additional")}</Label><Textarea rows={3} value={additional} onChange={(e) => setAdditional(e.target.value)} placeholder={t("notes.pastoral.additionalPlaceholder")} /></div>
            </div>
          </section>
        )}
        <div className="space-y-1">
          <Label className="text-xs">{t("notes.pastoral.outline", { defaultValue: "Esboço do pastoreio" })}</Label>
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
            <RichNoteEditor
              value={html}
              onChange={setHtml}
              noteId={`pastoral-${note.id}`}
              minHeight={expanded ? "calc(100dvh - 10rem)" : "18rem"}
              placeholder={t("notes.pastoral.outlinePlaceholder", { defaultValue: "Pontos, textos bíblicos, links, imagens e vídeos para mostrar…" })}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              collapsibleToolbarKey="pastoral.toolbarOpen"
            />
          </Suspense>
        </div>
        <FloatingVersePanel
          library={library}
          detected={detected}
          onInsert={insertBibleText}
          storageKey="pastoral.versePanel.pos"
        />
      </div>
      {outlineOpen && (
        <FullscreenOutline
          note={asFieldNote}
          library={library}
          onClose={() => setOutlineOpen(false)}
          onInsertBibleText={insertBibleText}
        />
      )}
    </div>,
    document.body,
  );
}
