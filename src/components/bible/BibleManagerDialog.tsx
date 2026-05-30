import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Trash2, Check, Loader2, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  importEpub,
  listLibraries,
  removeLibrary,
  setActiveLibraryId,
  resolveActiveLibraryId,
  type BibleLibrary,
} from "@/lib/bible-notes-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

export function BibleManagerDialog({ open, onOpenChange, onChanged }: Props) {
  const { t } = useTranslation();
  const [libs, setLibs] = useState<BibleLibrary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setLibs(await listLibraries());
    // Valida o ID ativo contra a lista real (cai p/ a 1ª lib se o ativo sumiu).
    setActiveId(await resolveActiveLibraryId());
  }

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProgress(0);
    try {
      const lib = await importEpub(file, (_phase, pct) => {
        setProgress(Math.round(pct * 100));
      });
      await refresh();
      onChanged?.();
      toast.success(
        t("bibleManager.imported", { title: lib.title }) +
          `  (${lib.bookCount} / ${lib.verseCount})`,
      );
      // Aviso só quando claramente faltou conteúdo significativo (evita
      // falso-positivo em bíblias só-NT, livros de estudo, etc.).
      if (lib.bookCount > 0 && lib.bookCount < 27) {
        toast.warning(
          `Importação parcial: ${lib.bookCount} livros e ${lib.verseCount} versículos detectados.`,
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(t("bibleManager.importError"));
    } finally {
      setProgress(null);
    }
  }

  async function handleUse(id: string) {
    setActiveLibraryId(id);
    setActiveId(id);
    onChanged?.();
  }

  async function handleRemove(id: string) {
    if (!confirm(t("bibleManager.removeConfirm"))) return;
    await removeLibrary(id);
    await refresh();
    onChanged?.();
    toast.success(t("bibleManager.removed"));
  }

  const isBusy = progress !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("bibleManager.title")}</DialogTitle>
          <DialogDescription>{t("bibleManager.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Import area */}
          <div className="rounded-lg border-2 border-dashed p-4 text-center space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept=".epub,application/epub+zip"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={isBusy}
              size="lg"
              className="w-full"
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isBusy ? t("bibleManager.importing") : t("bibleManager.importButton")}
            </Button>
            {isBusy && <Progress value={progress ?? 0} className="h-1.5" />}
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t("bibleManager.importHint")}
            </p>
          </div>

          {/* Installed list */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              {t("bibleManager.installedTitle")}
            </h3>
            {libs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {t("bibleManager.installedEmpty")}
              </p>
            ) : (
              <div className="space-y-2">
                {libs.map((lib) => {
                  const isActive = lib.id === activeId;
                  return (
                    <div key={lib.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{lib.title}</span>
                            {isActive && (
                              <Badge variant="secondary" className="gap-1 h-5">
                                <Check className="h-3 w-3" /> {t("bibleManager.active")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {lib.langLabel} · {t("bibleManager.bookCount", { count: lib.bookCount })} · {t("bibleManager.verseCount", { count: lib.verseCount })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!isActive && (
                            <Button size="sm" variant="outline" onClick={() => handleUse(lib.id)} disabled={isBusy}>
                              {t("bibleManager.use")}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemove(lib.id)}
                            disabled={isBusy}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
