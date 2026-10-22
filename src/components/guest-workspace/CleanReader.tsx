// Leitura limpa de um capítulo (Modo Foco).
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveLibrary, getChapterFromLibrary, type BibleVerseRecord } from "@/lib/bible-notes-store";
import { getLocalizedBookName } from "@/lib/bible-canon";
import { cn } from "@/lib/utils";

export function CleanReader({ chapterKey, done, percent, fontClass, onBack, onDone, onHighlight, onImport }: {
  chapterKey: string; done: boolean; percent: number; fontClass: string;
  onBack: () => void; onDone: () => void; onHighlight: (ref: string) => void; onImport: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [book, chStr] = chapterKey.split(":");
  const ch = Number(chStr);
  const title = `${getLocalizedBookName(book, i18n.language) ?? book} ${ch}`;
  const [verses, setVerses] = useState<BibleVerseRecord[] | null>(null);
  const [noLib, setNoLib] = useState(false);

  useEffect(() => {
    let alive = true;
    setVerses(null);
    void (async () => {
      const lib = await getActiveLibrary().catch(() => null);
      if (!lib) { if (alive) { setNoLib(true); setVerses([]); } return; }
      const v = await getChapterFromLibrary(lib.id, book, ch).catch(() => []);
      if (alive) { setNoLib(false); setVerses(v); }
    })();
    window.scrollTo?.(0, 0);
    return () => { alive = false; };
  }, [book, ch]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-2 px-2 py-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-muted-foreground"><ArrowLeft className="h-4 w-4" />{t("guestWs.back", { defaultValue: "Voltar" })}</Button>
        <span className="ml-auto pr-2 text-xs text-muted-foreground">{title} · {percent}%</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <article className={cn("mx-auto max-w-2xl px-5 pb-8 leading-relaxed", fontClass)}>
          <h1 className="py-3 text-2xl font-semibold">{title}</h1>
          {verses === null ? <p className="text-sm text-muted-foreground">{t("guestWs.loading", { defaultValue: "Carregando…" })}</p>
            : noLib ? (
              <div className="space-y-3 py-6 text-sm text-muted-foreground">
                <p>{t("guestWs.noBible", { defaultValue: "Importe a Bíblia (EPUB) para ler aqui. Você ainda pode marcar o capítulo como lido." })}</p>
                <Button variant="outline" size="sm" onClick={onImport}>{t("guestWs.importBible", { defaultValue: "Importar Bíblia (EPUB)" })}</Button>
              </div>
            ) : verses.length === 0 ? <p className="text-sm text-muted-foreground">{t("guestWs.chapterMissing", { defaultValue: "Capítulo não encontrado na Bíblia importada." })}</p>
            : verses.map((v) => <p key={v.key} className="mb-2"><sup className="mr-1 text-xs text-muted-foreground">{v.verse}</sup>{v.text}</p>)}
        </article>
      </div>
      <div className="flex gap-2 border-t bg-background p-3">
        <Button variant="outline" className="flex-1 gap-1" onClick={() => onHighlight(`${title}:`)}><Plus className="h-4 w-4" />{t("guestWs.addHighlight", { defaultValue: "Ponto alto" })}</Button>
        <Button className="flex-1 gap-1" variant={done ? "secondary" : "default"} onClick={onDone}><Check className="h-4 w-4" />{done ? t("guestWs.doneNext", { defaultValue: "Lido · próximo" }) : t("guestWs.markDone", { defaultValue: "Concluído" })}</Button>
      </div>
    </div>
  );
}
