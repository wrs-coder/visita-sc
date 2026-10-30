// Leitura limpa de um capítulo (Modo Foco) com a barra do balão bíblico:
// destacar (mesmas cores e mesmos destaques do balão), letra A-/A+, copiar e anotar.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Plus, Highlighter, Eraser, Copy, NotebookPen, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getActiveLibrary, getChapterFromLibrary, type BibleVerseRecord } from "@/lib/bible-notes-store";
import { getLocalizedBookName } from "@/lib/bible-canon";
import {
  HIGHLIGHT_COLORS, TEXT_SCALE_MAX, TEXT_SCALE_MIN, TEXT_SCALE_STEP, addHighlight, buildSegments, clampTextScale,
  removeHighlightAt, selectionRange, clearHighlights, getHighlights, highlightKey, loadSettings, saveSettings, type HighlightColor,
} from "@/lib/bible-view-settings";
import { cn } from "@/lib/utils";

export function CleanReader({ chapterKey, done, percent, fontClass, onBack, onDone, onHighlight, onImport, onNote }: {
  chapterKey: string; done: boolean; percent: number; fontClass: string;
  onBack: () => void; onDone: () => void; onHighlight: (ref: string) => void; onImport: () => void;
  onNote: (ref: string, text: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [book, chStr] = chapterKey.split(":");
  const ch = Number(chStr);
  const title = `${getLocalizedBookName(book, i18n.language) ?? book} ${ch}`;
  const [verses, setVerses] = useState<BibleVerseRecord[] | null>(null);
  const [libId, setLibId] = useState<string | null>(null);
  const [noLib, setNoLib] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [settings, setSettings] = useState(loadSettings);
  const [, bump] = useState(0);

  useEffect(() => {
    let alive = true;
    setVerses(null); setSel(null);
    void (async () => {
      const lib = await getActiveLibrary().catch(() => null);
      if (!lib) { if (alive) { setNoLib(true); setVerses([]); } return; }
      const v = await getChapterFromLibrary(lib.id, book, ch).catch(() => []);
      if (alive) { setNoLib(false); setLibId(lib.id); setVerses(v); }
    })();
    window.scrollTo?.(0, 0);
    return () => { alive = false; };
  }, [book, ch]);

  const selected = verses?.find((v) => v.verse === sel) ?? null;
  const key = (verse: number) => highlightKey(libId ?? "", book, ch, verse);
  const ref = selected ? `${title}:${selected.verse}` : title;
  const [range, setRange] = useState<{ start: number; end: number } | null>(null);

  // Offset de um ponto da seleção dentro do versículo (via data-start dos segmentos).
  const offsetOf = (node: Node | null, off: number): number | null => {
    const el = (node?.nodeType === 3 ? node.parentElement : (node as Element | null))?.closest?.("[data-start]");
    if (!el) return null;
    return Number(el.getAttribute("data-start")) + (node?.nodeType === 3 ? off : 0);
  };
  const pick = (v: BibleVerseRecord) => {
    const s = window.getSelection?.();
    if (s && !s.isCollapsed && s.anchorNode && s.focusNode) {
      const a = offsetOf(s.anchorNode, s.anchorOffset);
      const b = offsetOf(s.focusNode, s.focusOffset);
      const r = a != null && b != null ? selectionRange(a, b, v.text.length) : null;
      if (r) { setSel(v.verse); setRange(r); return; }
    }
    setRange(null);
    setSel(sel === v.verse ? null : v.verse);
  };

  const paint = (c: HighlightColor) => {
    if (!selected || !libId) return;
    setSettings(saveSettings({ highlightColor: c }));
    addHighlight(key(selected.verse), { ...(range ?? { start: 0, end: selected.text.length }), color: c });
    window.getSelection?.()?.removeAllRanges();
    setRange(null);
    bump((n) => n + 1);
  };
  const erase = () => {
    if (!selected || !libId) return;
    if (range) removeHighlightAt(key(selected.verse), range.start); else clearHighlights(key(selected.verse));
    setRange(null); bump((n) => n + 1);
  };
  const scale = (d: number) => setSettings(saveSettings({ textScale: clampTextScale(settings.textScale + d) }));
  const copy = async () => {
    if (!selected) return;
    try { await navigator.clipboard.writeText(`${ref} ${selected.text}`); toast.success(t("guestWs.copied", { defaultValue: "Copiado." })); } catch { /* */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background safe-top safe-bottom safe-x">
      <div className="flex items-center gap-2 px-2 py-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-muted-foreground"><ArrowLeft className="h-4 w-4" />{t("guestWs.back", { defaultValue: "Voltar" })}</Button>
        <span className="ml-auto pr-2 text-xs text-muted-foreground">{title} · {percent}%</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <article className={cn("mx-auto max-w-2xl px-5 pb-8 leading-relaxed", fontClass)} style={{ fontSize: settings.textScale !== 1 ? `${settings.textScale}em` : undefined }}>
          <h1 className="py-3 text-2xl font-semibold">{title}</h1>
          {verses === null ? <p className="text-sm text-muted-foreground">{t("guestWs.loading", { defaultValue: "Carregando…" })}</p>
            : noLib ? (
              <div className="space-y-3 py-6 text-sm text-muted-foreground">
                <p>{t("guestWs.noBible", { defaultValue: "Importe a Bíblia (EPUB) para ler aqui. Você ainda pode marcar o capítulo como lido." })}</p>
                <Button variant="outline" size="sm" onClick={onImport}>{t("guestWs.importBible", { defaultValue: "Importar Bíblia (EPUB)" })}</Button>
              </div>
            ) : verses.length === 0 ? <p className="text-sm text-muted-foreground">{t("guestWs.chapterMissing", { defaultValue: "Capítulo não encontrado na Bíblia importada." })}</p>
            : verses.map((v) => (
              <p key={v.key} role="button" tabIndex={0} aria-pressed={sel === v.verse}
                onMouseUp={() => pick(v)} onTouchEnd={() => setTimeout(() => pick(v), 0)}
                onKeyDown={(e) => { if (e.key === "Enter") setSel(sel === v.verse ? null : v.verse); }}
                className={cn("mb-2 cursor-pointer rounded-sm select-text", sel === v.verse && "underline decoration-primary decoration-2 underline-offset-4")}>
                <sup className="mr-1 text-xs text-muted-foreground">{v.verse}</sup>
                {buildSegments(v.text, libId ? getHighlights(key(v.verse)) : []).map((s, i) => (
                  <span key={i} data-start={s.start} className={s.highlighted ? `bible-highlight bible-hl-${s.color ?? "yellow"}` : undefined}>{s.text}</span>
                ))}
              </p>
            ))}
        </article>
      </div>
      {selected && (
        <div role="toolbar" aria-label={t("guestWs.verseTools", { defaultValue: "Ferramentas do versículo" })}
          className="flex flex-wrap items-center gap-1 border-t bg-card px-3 py-2">
          <span className="mr-1 text-xs font-medium">{ref}{range ? " · trecho" : ""}</span>
          <Highlighter className="h-4 w-4 text-muted-foreground" aria-hidden />
          {HIGHLIGHT_COLORS.map((c) => (
            <button key={c} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => paint(c)} aria-label={t(`bibleVerse.highlightColors.${c}`, { defaultValue: c })}
              className={cn("h-6 w-6 rounded-full border bible-hl-swatch", `bible-hl-${c}`, settings.highlightColor === c && "ring-2 ring-primary ring-offset-1")} />
          ))}
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={erase} aria-label={t("bibleVerse.clear", { defaultValue: "Limpar destaque" })}><Eraser className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="h-8 px-2" disabled={settings.textScale <= TEXT_SCALE_MIN} onClick={() => scale(-TEXT_SCALE_STEP)}>A-</Button>
          <Button size="sm" variant="ghost" className="h-8 px-2" disabled={settings.textScale >= TEXT_SCALE_MAX} onClick={() => scale(TEXT_SCALE_STEP)}>A+</Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copy} aria-label={t("guestWs.copy", { defaultValue: "Copiar" })}><Copy className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => onNote(ref, selected.text)}><NotebookPen className="h-4 w-4" />{t("guestWs.annotate", { defaultValue: "Anotar" })}</Button>
          <Button size="icon" variant="ghost" className="ml-auto h-8 w-8" onClick={() => setSel(null)} aria-label={t("guestWs.close", { defaultValue: "Fechar" })}><X className="h-4 w-4" /></Button>
        </div>
      )}
      <div className="flex gap-2 border-t bg-background p-3">
        <Button variant="outline" className="flex-1 gap-1" onClick={() => onHighlight(selected ? ref : `${title}:`)}><Plus className="h-4 w-4" />{t("guestWs.addHighlight", { defaultValue: "Ponto alto" })}</Button>
        <Button className="flex-1 gap-1" variant={done ? "secondary" : "default"} onClick={onDone}><Check className="h-4 w-4" />{done ? t("guestWs.doneNext", { defaultValue: "Lido · próximo" }) : t("guestWs.markDone", { defaultValue: "Concluído" })}</Button>
      </div>
    </div>
  );
}
