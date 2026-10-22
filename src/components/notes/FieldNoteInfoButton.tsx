import { useState } from "react";
import { Info, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InfoList } from "@/components/visit-summary/InfoList";
import { fieldNoteInfoRows, type FieldNoteInfoSource } from "@/lib/field-note-info";
import { cn } from "@/lib/utils";
import { talkOutlineInfoRows, type TalkInfo } from "@/lib/talk-outline-info";

/** Botão discreto que mostra, só para leitura, os detalhes da Consideração de Campo. */
export function FieldNoteInfoButton({
  note,
  className,
  onSync,
  syncing,
}: {
  note: FieldNoteInfoSource & { talk?: TalkInfo | null };
  className?: string;
  onSync?: () => void | Promise<void>;
  syncing?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const tr = (k: string, d: string) => t(k, { defaultValue: d });
  const isTalk = !!note.talk?.kind;
  const label = isTalk ? tr("talkOutline.info.title", "Detalhes do esboço") : tr("fieldConsiderations.info.title", "Detalhes da consideração");
  const rows = isTalk ? talkOutlineInfoRows(note.talk, tr) : fieldNoteInfoRows(note, tr);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={className ?? "h-8 w-8 shrink-0 rounded-full"}
        onClick={() => setOpen(true)}
        title={label}
        aria-label={label}
      >
        <Info className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="z-[130] max-w-[92vw] sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 pr-6">
              <DialogTitle className="flex-1">{label}</DialogTitle>
              {onSync && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs rounded-full"
                  disabled={syncing}
                  onClick={() => void onSync()}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5 mr-1", syncing && "animate-spin")} />
                  {t("common.sync", { defaultValue: "Sincronizar" })}
                </Button>
              )}
            </div>
            <DialogDescription className="sr-only">{label}</DialogDescription>
          </DialogHeader>
          {rows.length ? (
            <InfoList rows={rows} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("fieldConsiderations.info.empty", { defaultValue: "Sem detalhes preenchidos." })}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
