import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Trash2, Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  downloadLanguage,
  removeLanguage,
  getLangStatus,
  type BibleLangStatus,
} from "@/lib/bible-notes-store";
import type { BibleLang } from "@/lib/bible-refs";
import { toast } from "sonner";

const LANGS: BibleLang[] = ["pt", "en", "es"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Triggered after any change so the page can refresh "Bíblia ativa". */
  onChanged?: () => void;
}

export function BibleManagerDialog({ open, onOpenChange, onChanged }: Props) {
  const { t } = useTranslation();
  const [statuses, setStatuses] = useState<Record<BibleLang, BibleLangStatus | null>>({
    pt: null, en: null, es: null,
  });
  const [busy, setBusy] = useState<Record<BibleLang, number | null>>({
    pt: null, en: null, es: null,
  });

  async function refreshAll() {
    const entries = await Promise.all(LANGS.map(async (l) => [l, await getLangStatus(l)] as const));
    setStatuses(Object.fromEntries(entries) as Record<BibleLang, BibleLangStatus>);
  }

  useEffect(() => {
    if (open) refreshAll();
  }, [open]);

  async function handleDownload(lang: BibleLang) {
    setBusy((b) => ({ ...b, [lang]: 0 }));
    try {
      await downloadLanguage(lang, (pct) => {
        setBusy((b) => ({ ...b, [lang]: Math.round(pct * 100) }));
      });
      await refreshAll();
      onChanged?.();
      toast.success(t("bibleManager.downloaded", { lang: langLabel(lang, t) }));
    } catch {
      toast.error(t("common.errorGeneric", { defaultValue: "Erro" }));
    } finally {
      setBusy((b) => ({ ...b, [lang]: null }));
    }
  }

  async function handleRemove(lang: BibleLang) {
    if (!confirm(t("bibleManager.removeConfirm"))) return;
    await removeLanguage(lang);
    await refreshAll();
    onChanged?.();
    toast.success(t("bibleManager.removed", { lang: langLabel(lang, t) }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("bibleManager.title")}</DialogTitle>
          <DialogDescription>{t("bibleManager.subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {LANGS.map((lang) => {
            const s = statuses[lang];
            const progress = busy[lang];
            const isBusy = progress !== null;
            return (
              <div key={lang} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{langLabel(lang, t)}</span>
                    {s?.downloaded ? (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3 w-3" /> {t("bibleManager.downloadedBadge")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{t("bibleManager.notDownloaded")}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {s?.downloaded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(lang)}
                        disabled={isBusy}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" onClick={() => handleDownload(lang)} disabled={isBusy}>
                      {isBusy ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-1.5" />
                      )}
                      {s?.downloaded ? t("bibleManager.update") : t("bibleManager.download")}
                    </Button>
                  </div>
                </div>
                {isBusy && <Progress value={progress ?? 0} className="h-1.5" />}
                {s?.downloaded && (
                  <p className="text-[11px] text-muted-foreground">
                    {t("bibleManager.verseCount", { count: s.verseCount })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function langLabel(lang: BibleLang, t: (k: string) => string): string {
  return t(`bibleManager.langs.${lang}`);
}
