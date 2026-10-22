import { useState } from "react";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InfoList } from "@/components/visit-summary/InfoList";
import { fieldNoteInfoRows, type FieldNoteInfoSource } from "@/lib/field-note-info";

/** Botão discreto que mostra, só para leitura, os detalhes da Consideração de Campo. */
export function FieldNoteInfoButton({ note, className }: { note: FieldNoteInfoSource; className?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const label = t("fieldConsiderations.info.title", { defaultValue: "Detalhes da consideração" });
  const rows = fieldNoteInfoRows(note, (k, d) => t(k, { defaultValue: d }));
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
            <DialogTitle>{label}</DialogTitle>
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
