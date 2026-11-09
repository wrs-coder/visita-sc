// Leitura limpa de um capítulo (Modo Foco) com a barra do balão bíblico:
// destacar (mesmas cores e mesmos destaques do balão), letra A-/A+, copiar e anotar.
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Circle, CheckCircle2, Highlighter, Eraser, Copy, NotebookPen, X, Type, Volume2, Pause, Play, SkipBack, SkipForward, Sun, PenLine, Star } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";
import { READER_BGS, READER_FONTS, READER_LINE_MAX, READER_LINE_MIN, READER_SCALE_MAX, READER_SCALE_MIN, SPEECH_RATES, chapterVerseSpan, sameColorHighlight, loadReaderSettings, saveReaderSettings, type ReaderSettings } from "@/lib/bible-reader-settings";
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
import { abbreviateBookAlways } from "@/lib/book-abbrev";
import { cn } from "@/lib/utils";
import { isRealTap, type TapStart } from "@/lib/tap-guard";

export function CleanReader({ chapterKey, done, percent, fontClass, onBack, onDone, onHighlight, onImport, onNote, initialVerse, bookProgress }: {
  initialVerse?: number | null;
  /** Capítulos lidos do livro aberto (barra fina no topo). */
  bookProgress?: { done: number; total: number };
  chapterKey: string; done: boolean; percent: number; fontClass: string;
  onBack: () => void; onDone: () => void; onHighlight: (ref: string) => void; onImport: () => void;
  onNote: (ref: string, text: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [book, chStr] = chapterKey.split(":");
  const ch = Number(chStr);
  const title = `${getLocalizedBookName(book, i18n.language) ?? book} ${ch}`;
  const [verses, setVerses] = useState<BibleVerseRecord[] | null>(null);
  const span = chapterVerseSpan(verses);
  const shortBook = `${abbreviateBookAlways(getLocalizedBookName(book, i18n.language) ?? book)} ${ch}`;
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
      const lib = await getActiveLibrary("reading").catch(() => null);
      if (!lib) { if (alive) { setNoLib(true); setVerses([]); } return; }
      const v = await getChapterFromLibrary(lib.id, book, ch).catch(() => []);
      if (alive) { setNoLib(false); setLibId(lib.id); setVerses(v); }
    })();
    window.scrollTo?.(0, 0);
    return () => { alive = false; };
  }, [book, ch]);

  // Volta de Anotar/Ponto alto: rola até o versículo usado.
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || !initialVerse || !verses?.length) return;
    jumped.current = true;
    requestAnimationFrame(() => document.getElementById(`rv-${initialVerse}`)?.scrollIntoView({ block: "center" }));
  }, [verses, initialVerse]);

  const selected = verses?.find((v) => v.verse === sel) ?? null;
  const key = (verse: number) => highlightKey(libId ?? "", book, ch, verse);
  const ref = selected ? `${title}:${selected.verse}` : title;
  const [range, setRange] = useState<{ start: number; end: number } | null>(null);
  // Pílula flutuante perto da seleção (a barra inferior continua como garantia).
  const [pill, setPill] = useState<{ top: number; bottom: number; cx: number } | null>(null);
  useEffect(() => { if (!selected) setPill(null); }, [selected]);

  // Offset de um ponto da seleção dentro do versículo (via data-start dos segmentos).
  const offsetOf = (node: Node | null, off: number): number | null => {
    const el = (node?.nodeType === 3 ? node.parentElement : (node as Element | null))?.closest?.("[data-start]");
    if (!el) return null;
    return Number(el.getAttribute("data-start")) + (node?.nodeType === 3 ? off : 0);
  };
  // Android/iOS cancelam a seleção nativa ao tocar na cor: guardamos o trecho
  // assim que ele é selecionado, para pintar só ele (e não o versículo todo).
  useEffect(() => {
    if (typeof document === "undefined" || !verses?.length) return;
    const onSel = () => {
      const s = window.getSelection?.();
      if (!s || s.isCollapsed || !s.anchorNode || !s.focusNode) return;
      const pa = (s.anchorNode.nodeType === 3 ? s.anchorNode.parentElement : (s.anchorNode as Element))?.closest?.("[id^='rv-']");
      const pb = (s.focusNode.nodeType === 3 ? s.focusNode.parentElement : (s.focusNode as Element))?.closest?.("[id^='rv-']");
      if (!pa || pa !== pb || !scrollRef.current?.contains(pa)) return;
      const v = verses.find((x) => `rv-${x.verse}` === pa.id);
      if (!v) return;
      const a = offsetOf(s.anchorNode, s.anchorOffset);
      const b = offsetOf(s.focusNode, s.focusOffset);
      const r = a != null && b != null ? selectionRange(a, b, v.text.length) : null;
      if (r) {
        setSel(v.verse); setRange(r);
        try { const b = s.getRangeAt(0).getBoundingClientRect(); setPill({ top: b.top, bottom: b.bottom, cx: b.left + b.width / 2 }); } catch { /* sem retângulo */ }
      }
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, [verses]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (v: BibleVerseRecord) => {
    const s = window.getSelection?.();
    if (s && !s.isCollapsed && s.anchorNode && s.focusNode) {
      const a = offsetOf(s.anchorNode, s.anchorOffset);
      const b = offsetOf(s.focusNode, s.focusOffset);
      const r = a != null && b != null ? selectionRange(a, b, v.text.length) : null;
      if (r) { setSel(v.verse); setRange(r); return; }
    }
    setRange(null);
    const next = sel === v.verse ? null : v.verse;
    setSel(next);
    const b = next != null ? document.getElementById(`rv-${v.verse}`)?.getBoundingClientRect() : null;
    setPill(b ? { top: b.top, bottom: b.bottom, cx: b.left + b.width / 2 } : null);
  };

  const paint = (c: HighlightColor, toggle = false) => {
    if (!selected || !libId) return;
    const r = range ?? { start: 0, end: selected.text.length };
    const same = toggle ? sameColorHighlight(getHighlights(key(selected.verse)), r, c) : null;
    if (same) removeHighlightAt(key(selected.verse), same.start);
    else {
      setSettings(saveSettings({ highlightColor: c }));
      addHighlight(key(selected.verse), { ...r, color: c });
    }
    window.getSelection?.()?.removeAllRanges();
    setRange(null); setPill(null);
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
            <p className="flex min-w-0 text-sm font-semibold" title={`${title}${span}`}><span className="truncate">{shortBook}</span><span className="shrink-0">{span}</span></p>
            <p className="text-[11px] text-muted-foreground">{percent}%</p>
          </div>
          <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1 rounded-full px-2.5 text-xs" onClick={() => onHighlight(`${title}:`)}><PenLine className="h-3.5 w-3.5" />{t("guestWs.addHighlight", { defaultValue: "Ponto alto" })}</Button>
          <Button variant="ghost" size="sm" className="h-9 shrink-0 gap-0.5 rounded-full px-2" onClick={() => setSheet(true)} aria-label={t("guestWs.readerOptions", { defaultValue: "Opções de leitura" })}><Type className="h-4 w-4" /><Volume2 className="h-4 w-4 max-[359px]:hidden" /></Button>
          <Button size="sm" className={cn("h-9 shrink-0 gap-1 rounded-full px-2.5 text-xs", done ? "border border-success bg-success text-success-foreground hover:bg-success/90" : "border border-border bg-transparent text-muted-foreground hover:bg-muted")} variant="ghost" aria-pressed={done} onClick={() => { if (!done) { try { navigator.vibrate?.(15); } catch { /* sem vibração */ } toast.success("Capítulo marcado como lido"); } onDone(); }} aria-label={done ? "Lido — toque para desmarcar" : "Marcar capítulo como lido"}>{done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}<span className="max-[359px]:hidden">{t("guestWs.markRead", { defaultValue: "Lido" })}</span></Button>
        </div>
        {bookProgress && bookProgress.total > 0 && (
          <div className="flex items-center gap-2 px-4 pb-2 text-[11px] text-muted-foreground" aria-label={t("guestWs.bookProgress", { defaultValue: "Progresso do livro" })}>
            <span className="max-w-[40%] truncate">{getLocalizedBookName(book, i18n.language) ?? book}</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={bookProgress.total} aria-valuenow={bookProgress.done}>
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.round((bookProgress.done / bookProgress.total) * 100)}%` }} />
            </div>
            <span className="shrink-0 tabular-nums">{bookProgress.done}/{bookProgress.total}</span>
          </div>
        )}
      </div>
      <div ref={scrollRef} onScroll={() => { if (pill) setPill(null); }} className={cn("relative flex-1 overflow-y-auto", !selected && speakIdx === null && "bar-bottom")}>
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
      {dimFallback && rs.brightness != null && rs.brightness < 1 && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[51] bg-foreground" style={{ opacity: (1 - rs.brightness) * 0.7, mixBlendMode: "multiply" }} />
      )}
      {!selected && (speakIdx !== null || paused) && (
        <div className="bar-bottom shrink-0 border-t bg-card px-3 pt-2">
          <div className="mx-auto flex max-w-md items-center justify-between gap-1">
            <Button size="icon" variant="ghost" className="h-11 w-11" aria-label={t("guestWs.prevVerse", { defaultValue: "Versículo anterior" })} onClick={() => void playFrom(Math.max(0, (speakIdx ?? 0) - 1))}><SkipBack className="h-5 w-5" /></Button>
            {paused
              ? <Button size="icon" className="h-12 w-12 rounded-full" aria-label={t("guestWs.play", { defaultValue: "Ouvir" })} onClick={() => void playFrom(speakIdx ?? 0)}><Play className="h-5 w-5" /></Button>
              : <Button size="icon" className="h-12 w-12 rounded-full" aria-label={t("guestWs.pause", { defaultValue: "Pausar" })} onClick={pauseSpeak}><Pause className="h-5 w-5" /></Button>}
            <Button size="icon" variant="ghost" className="h-11 w-11" aria-label={t("guestWs.nextVerse", { defaultValue: "Próximo versículo" })} onClick={() => void playFrom(Math.min((verses?.length ?? 1) - 1, (speakIdx ?? 0) + 1))}><SkipForward className="h-5 w-5" /></Button>
            <Button size="sm" variant="outline" className="h-9 min-w-14 rounded-full" onClick={() => { const i = SPEECH_RATES.indexOf(rs.speechRate as typeof SPEECH_RATES[number]); setR({ speechRate: SPEECH_RATES[(i + 1) % SPEECH_RATES.length] }); }}>{rs.speechRate}x</Button>
            <Button size="icon" variant="ghost" className="h-11 w-11" aria-label={t("guestWs.close", { defaultValue: "Fechar" })} onClick={closeSpeak}><X className="h-5 w-5" /></Button>
          </div>
          <p className="pb-1 text-center text-[11px] text-muted-foreground">{t("guestWs.verseN", { defaultValue: "Versículo" })} {speakIdx !== null ? verses?.[speakIdx]?.verse : ""}</p>
        </div>
      )}
      {selected && pill && (() => {
        const vw = typeof window !== "undefined" ? window.innerWidth : 400, vh = typeof window !== "undefined" ? window.innerHeight : 800;
        const small = vw < 360; const W = Math.min(vw - 16, small ? 266 : 300);
        const left = Math.max(8, Math.min(vw - W - 8, pill.cx - W / 2));
        const below = pill.bottom + 56 < vh - 120;
        const top = below ? pill.bottom + 10 : Math.max(56, pill.top - 54);
        const keep = (e: { preventDefault: () => void }) => e.preventDefault();
        return (
          <div role="toolbar" aria-label={t("guestWs.quickTools", { defaultValue: "Atalhos do destaque" })}
            style={{ left, top, width: W }}
            className="fixed z-[52] flex items-center justify-between gap-0.5 overflow-hidden rounded-full border bg-popover px-2 py-1.5 text-popover-foreground shadow-lg animate-in fade-in zoom-in-95">
            {HIGHLIGHT_COLORS.map((c) => (
              <button key={c} type="button" onPointerDown={keep} onMouseDown={keep} onClick={() => paint(c, true)} aria-label={t(`bibleVerse.highlightColors.${c}`, { defaultValue: c })}
                className={cn("shrink-0 rounded-full border bible-hl-swatch", small ? "h-6 w-6" : "h-7 w-7", `bible-hl-${c}`)} />
            ))}
            <span className="h-6 w-px shrink-0 bg-border" aria-hidden />
            <button type="button" onPointerDown={keep} onMouseDown={keep} onClick={() => { setPill(null); onHighlight(ref); }} aria-label={t("guestWs.addHighlight", { defaultValue: "Ponto alto" })}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-primary hover:bg-muted"><Star className="h-4 w-4" /></button>
            <button type="button" onPointerDown={keep} onMouseDown={keep} onClick={() => { const txt = range ? selected.text.slice(range.start, range.end) : selected.text; setPill(null); onNote(ref, txt); }} aria-label={t("guestWs.annotate", { defaultValue: "Anotar" })}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-primary hover:bg-muted"><NotebookPen className="h-4 w-4" /></button>
          </div>
        );
      })()}
      {selected && (
        <div role="toolbar" aria-label={t("guestWs.verseTools", { defaultValue: "Ferramentas do versículo" })}
          className="bar-bottom flex shrink-0 flex-wrap items-center gap-1 border-t bg-card px-3 pt-2 text-card-foreground">
          <span className="mr-1 text-xs font-medium">{ref}{range ? " · trecho" : ""}</span>
          <Highlighter className="h-4 w-4 text-muted-foreground" aria-hidden />
          {HIGHLIGHT_COLORS.map((c) => (
            <button key={c} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => paint(c)} aria-label={t(`bibleVerse.highlightColors.${c}`, { defaultValue: c })}
              className={cn("h-6 w-6 rounded-full border bible-hl-swatch", `bible-hl-${c}`, settings.highlightColor === c && "ring-2 ring-primary ring-offset-1")} />
          ))}
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={erase} aria-label={t("bibleVerse.clear", { defaultValue: "Limpar destaque" })}><Eraser className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copy} aria-label={t("guestWs.copy", { defaultValue: "Copiar" })}><Copy className="h-4 w-4" /></Button>
          <Button size="sm" variant="default" className="h-8 gap-1" onClick={() => onHighlight(ref)}><PenLine className="h-4 w-4" />{t("guestWs.addHighlight", { defaultValue: "Ponto alto" })}</Button>
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => onNote(ref, selected.text)}><NotebookPen className="h-4 w-4" />{t("guestWs.annotate", { defaultValue: "Anotar" })}</Button>
          <Button size="icon" variant="ghost" className="ml-auto h-8 w-8" onClick={() => setSel(null)} aria-label={t("guestWs.close", { defaultValue: "Fechar" })}><X className="h-4 w-4" /></Button>
        </div>
      )}
      <Drawer open={sheet} onOpenChange={setSheet}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader><DrawerTitle>{t("guestWs.readerOptions", { defaultValue: "Opções de leitura" })}</DrawerTitle></DrawerHeader>
          <div className="mx-auto w-full max-w-md space-y-5 overflow-y-auto px-4 safe-bottom-content">
            <button type="button" disabled={!canSpeak() || !verses?.length} onClick={() => { setSheet(false); void playFrom(Math.max(0, verses?.findIndex((v) => v.verse === sel) ?? 0)); }}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left disabled:opacity-50">
              <Volume2 className="h-5 w-5 text-primary" /><span className="flex-1 text-sm font-medium">{t("guestWs.listenChapter", { defaultValue: "Ouvir capítulo" })}</span><Play className="h-4 w-4" />
            </button>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("guestWs.textSize", { defaultValue: "Tamanho da letra" })}</p>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="h-10 w-12" disabled={rs.textScale <= READER_SCALE_MIN} onClick={() => scale(-0.1)}>A-</Button>
                <Slider className="flex-1" min={READER_SCALE_MIN} max={READER_SCALE_MAX} step={0.05} value={[rs.textScale]} onValueChange={([v]) => setR({ textScale: v })} />
                <Button variant="outline" size="sm" className="h-10 w-12 text-base" disabled={rs.textScale >= READER_SCALE_MAX} onClick={() => scale(0.1)}>A+</Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("guestWs.background", { defaultValue: "Fundo" })}</p>
              <div className="grid grid-cols-4 gap-2">
                {READER_BGS.map((b) => (
                  <button key={b} type="button" aria-pressed={rs.bg === b} onClick={() => setR({ bg: b })}
                    className={cn("flex h-14 flex-col items-center justify-center rounded-xl border text-xs", `bible-color-${b}`, rs.bg === b && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
                    <span className="text-base font-semibold">Aa</span>{t(`guestWs.bg_${b}`, { defaultValue: { white: "Branco", sepia: "Sépia", gray: "Cinza", black: "Noite" }[b] })}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("guestWs.font", { defaultValue: "Fonte" })}</p>
              <div className="grid grid-cols-3 gap-2">
                {READER_FONTS.map((f) => (
                  <button key={f} type="button" aria-pressed={rs.font === f} onClick={() => setR({ font: f })}
                    className={cn("min-h-11 rounded-xl border px-2 text-sm", f !== "system" && `reader-font-${f}`, rs.font === f ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent/60")}>
                    {t(`guestWs.font_${f}`, { defaultValue: { system: "Sem serifa", serif: "Serifa", easy: "Leitura fácil" }[f] })}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><Sun className="h-3.5 w-3.5" />{t("guestWs.brightness", { defaultValue: "Brilho" })}</p>
                {rs.brightness != null && <button type="button" className="text-xs text-primary" onClick={() => setR({ brightness: null })}>{t("guestWs.brightnessAuto", { defaultValue: "Usar do sistema" })}</button>}
              </div>
              <Slider min={0.1} max={1} step={0.05} value={[rs.brightness ?? 1]} onValueChange={([v]) => setR({ brightness: v })} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("guestWs.lineSpacing", { defaultValue: "Espaço entre linhas" })}</p>
              <Slider min={READER_LINE_MIN} max={READER_LINE_MAX} step={0.1} value={[rs.lineHeight]} onValueChange={([v]) => setR({ lineHeight: v })} />
            </div>
            <Button className="w-full" onClick={() => setSheet(false)}>{t("common.ok", { defaultValue: "OK" })}</Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
