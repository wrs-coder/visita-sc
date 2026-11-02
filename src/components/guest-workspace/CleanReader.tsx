// Leitura limpa de um capítulo (Modo Foco) com a barra do balão bíblico:
// destacar (mesmas cores e mesmos destaques do balão), letra A-/A+, copiar e anotar.
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Highlighter, Eraser, Copy, NotebookPen, X, Type, Volume2, Pause, Play, SkipBack, SkipForward, Sun, PenLine } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";
import { READER_BGS, READER_FONTS, READER_LINE_MAX, READER_LINE_MIN, READER_SCALE_MAX, READER_SCALE_MIN, SPEECH_RATES, loadReaderSettings, saveReaderSettings, type ReaderSettings } from "@/lib/bible-reader-settings";
import { canSpeak, setScreenBrightness, speakText, stopSpeaking } from "@/lib/reader-native";
import { toast } from "sonner";
import { useImmersiveWhile } from "@/lib/immersive";
import { Button } from "@/components/ui/button";
import { getActiveLibrary, getChapterFromLibrary, type BibleVerseRecord } from "@/lib/bible-notes-store";
import { getLocalizedBookName } from "@/lib/bible-canon";
import {
  HIGHLIGHT_COLORS, addHighlight, buildSegments,
  removeHighlightAt, selectionRange, clearHighlights, getHighlights, highlightKey, loadSettings, saveSettings, type HighlightColor,
} from "@/lib/bible-view-settings";
import { cn } from "@/lib/utils";
import { isRealTap, type TapStart } from "@/lib/tap-guard";

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
  const [rs, setRs] = useState<ReaderSettings>(loadReaderSettings);
  const setR = (p: Partial<ReaderSettings>) => setRs(saveReaderSettings(p));
  const [sheet, setSheet] = useState(false);
  const [dimFallback, setDimFallback] = useState(false);
  // Leitura em voz alta: índice do versículo falado (null = parado).
  const [speakIdx, setSpeakIdx] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const speakRun = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tapStart = useRef<TapStart | null>(null);

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
  const scale = (d: number) => setR({ textScale: rs.textScale + d });

  // Brilho: aplica enquanto o leitor está aberto e devolve ao sistema ao sair.
  useEffect(() => {
    let alive = true;
    void setScreenBrightness(rs.brightness).then((ok) => { if (alive) setDimFallback(!ok); });
    return () => { alive = false; };
  }, [rs.brightness]);
  useEffect(() => () => { void setScreenBrightness(null); }, []);

  const lang = i18n.language?.startsWith("es") ? "es-ES" : i18n.language?.startsWith("en") ? "en-US" : "pt-BR";
  const playFrom = async (idx: number) => {
    if (!verses?.length) return;
    const run = ++speakRun.current;
    await stopSpeaking();
    setPaused(false);
    for (let i = idx; i < verses.length; i++) {
      if (speakRun.current !== run) return;
      setSpeakIdx(i);
      document.getElementById(`rv-${verses[i].verse}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      try { await speakText(verses[i].text, lang, rs.speechRate); }
      catch { if (speakRun.current === run) { toast.error(t("guestWs.ttsError", { defaultValue: "A voz do aparelho não está disponível." })); setSpeakIdx(null); } return; }
    }
    if (speakRun.current === run) setSpeakIdx(null);
  };
  const pauseSpeak = () => { speakRun.current++; void stopSpeaking(); setPaused(true); };
  const closeSpeak = () => { speakRun.current++; void stopSpeaking(); setSpeakIdx(null); setPaused(false); };
  useEffect(() => () => { speakRun.current++; void stopSpeaking(); }, []);
  useEffect(() => { closeSpeak(); /* troca de capítulo */ }, [book, ch]); // eslint-disable-line react-hooks/exhaustive-deps
  const copy = async () => {
    if (!selected) return;
    try { await navigator.clipboard.writeText(`${ref} ${selected.text}`); toast.success(t("guestWs.copied", { defaultValue: "Copiado." })); } catch { /* */ }
  };

  useImmersiveWhile(true);
  return (
    <div className={cn("fixed inset-0 z-50 flex flex-col safe-x-landscape", rs.bg === "white" ? "bg-background" : `bible-color-${rs.bg}`)}>
      <div className={cn("bar-top shrink-0 border-b backdrop-blur", rs.bg === "white" ? "bg-background/95" : `bible-color-${rs.bg}`)}>
        <div className="flex h-12 items-center gap-1 px-1.5">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 shrink-0 rounded-full text-muted-foreground" aria-label={t("guestWs.back", { defaultValue: "Voltar" })}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="text-[11px] text-muted-foreground">{percent}%</p>
          </div>
          <Button variant="ghost" size="sm" className="h-9 shrink-0 gap-0.5 rounded-full px-2.5" onClick={() => setSheet(true)} aria-label={t("guestWs.readerOptions", { defaultValue: "Opções de leitura" })}><Type className="h-4 w-4" /><Volume2 className="h-4 w-4" /></Button>
          <Button size="sm" className="h-9 shrink-0 gap-1 rounded-full px-3" variant={done ? "secondary" : "default"} onClick={onDone}><Check className="h-4 w-4" /><span className="max-w-[7rem] truncate">{done ? t("guestWs.doneNext", { defaultValue: "Lido · próximo" }) : t("guestWs.markDone", { defaultValue: "Concluído" })}</span></Button>
        </div>
      </div>
      <div ref={scrollRef} className={cn("relative flex-1 overflow-y-auto", !selected && speakIdx === null && "bar-bottom")}>
        <article className={cn("mx-auto max-w-2xl px-5 pb-28", fontClass, rs.font !== "system" && `reader-font-${rs.font}`)} style={{ fontSize: rs.textScale !== 1 ? `${rs.textScale}em` : undefined, lineHeight: rs.lineHeight }}>
          <h1 className="py-3 text-2xl font-semibold">{title}</h1>
          {verses === null ? <p className="text-sm text-muted-foreground">{t("guestWs.loading", { defaultValue: "Carregando…" })}</p>
            : noLib ? (
              <div className="space-y-3 py-6 text-sm text-muted-foreground">
                <p>{t("guestWs.noBible", { defaultValue: "Importe a Bíblia (EPUB) para ler aqui. Você ainda pode marcar o capítulo como lido." })}</p>
                <Button variant="outline" size="sm" onClick={onImport}>{t("guestWs.importBible", { defaultValue: "Importar Bíblia (EPUB)" })}</Button>
              </div>
            ) : verses.length === 0 ? <p className="text-sm text-muted-foreground">{t("guestWs.chapterMissing", { defaultValue: "Capítulo não encontrado na Bíblia importada." })}</p>
            : verses.map((v) => (
              <p key={v.key} id={`rv-${v.verse}`} role="button" tabIndex={0} aria-pressed={sel === v.verse}
                onPointerDown={(e) => { tapStart.current = { x: e.clientX, y: e.clientY, t: Date.now(), scroll: scrollRef.current?.scrollTop ?? 0 }; }}
                onPointerCancel={() => { tapStart.current = null; }}
                onPointerUp={(e) => {
                  const start = tapStart.current; tapStart.current = null;
                  const x = e.clientX, y = e.clientY, t0 = Date.now(), scroll = scrollRef.current?.scrollTop ?? 0;
                  setTimeout(() => {
                    const s = window.getSelection?.();
                    if (isRealTap(start, { x, y, t: t0, scroll, hasSelection: !!s && !s.isCollapsed })) pick(v);
                  }, 0);
                }}
                onKeyDown={(e) => { if (e.key === "Enter") setSel(sel === v.verse ? null : v.verse); }}
                className={cn("mb-2 cursor-pointer rounded-sm select-text", sel === v.verse && "underline decoration-primary decoration-2 underline-offset-4", speakIdx !== null && verses[speakIdx]?.verse === v.verse && "bg-primary/15")}>
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
          className="bar-bottom flex shrink-0 flex-wrap items-center gap-1 border-t bg-card px-3 pt-2">
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
    </div>
  );
}
