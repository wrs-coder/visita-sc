import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface DayDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}

/**
 * Diálogo somente-leitura usado nos cartões do dashboard e no
 * VisitSummaryView (subaba "Hoje" do Resumo do Dia e cartões diários
 * da subaba "Transporte" do Resumo da Semana). Apenas apresenta as
 * informações já carregadas pela tela de origem, sem cortes.
 */
export function DayDetailsDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
}: DayDetailsDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="whitespace-normal break-words [overflow-wrap:anywhere]">
            {title}
          </DialogTitle>
          {subtitle && (
            <div className="text-xs text-muted-foreground mt-1 whitespace-normal break-words [overflow-wrap:anywhere]">
              {subtitle}
            </div>
          )}
        </DialogHeader>
        <div className="text-sm space-y-3 text-foreground/90">{children}</div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.close", { defaultValue: "Fechar" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
