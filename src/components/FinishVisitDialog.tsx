import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Tabelas operacionais ligadas a uma visita. Apagar antes da visita evita
// dependências órfãs (mesmo sem FK explícita). private_notes NÃO entra aqui:
// foi desacoplada (visit_id ON DELETE SET NULL preserva as notas privadas).
const CHILD_TABLES = [
  "meals",
  "meal_day_notes",
  "transport_schedule",
  "field_assignments",
  "field_meetings",
  "schedule_events",
  "checklist_items",
  "midweek_meetings",
  "weekend_meetings",
  "pioneer_meetings",
  "elders_servants_meetings",
] as const;

interface Props {
  visitId: string;
  visitTitle: string;
  onFinished?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function FinishVisitDialog({
  visitId,
  visitTitle,
  onFinished,
  open: openProp,
  onOpenChange,
  hideTrigger,
}: Props) {
  const { t } = useTranslation();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (o: boolean) => {
    if (onOpenChange) onOpenChange(o);
    else setOpenState(o);
  };

  const [s303, setS303] = useState(false);
  const [designacoes, setDesignacoes] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setS303(false);
    setDesignacoes(false);
  };

  const handleFinish = async () => {
    if (!s303 || loading) return;
    setLoading(true);
    try {
      for (const table of CHILD_TABLES) {
        const { error } = await supabase
          .from(table as never)
          .delete()
          .eq("visit_id", visitId);
        if (error) throw new Error(`${table}: ${error.message}`);
      }
      const { error: vErr } = await supabase
        .from("visits")
        .delete()
        .eq("id", visitId);
      if (vErr) throw new Error(vErr.message);

      toast.success(t("finishVisit.success"));
      setOpen(false);
      reset();
      onFinished?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("finishVisit.fail");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <CheckCircle2 className="h-4 w-4 mr-1" /> {t("finishVisit.trigger")}
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t("finishVisit.title")}
          </DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="finishVisit.description"
              values={{ title: visitTitle }}
              components={{ strong: <strong /> }}
            />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label className="flex items-start gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/50">
            <Checkbox
              checked={s303}
              onCheckedChange={(v) => setS303(v === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label className="cursor-pointer font-medium">
                {t("finishVisit.s303")} <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("finishVisit.s303Help")}
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/50">
            <Checkbox
              checked={designacoes}
              onCheckedChange={(v) => setDesignacoes(v === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label className="cursor-pointer font-medium">
                {t("finishVisit.designations")}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">{t("finishVisit.designationsHelp")}</p>
            </div>
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            {t("finishVisit.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleFinish}
            disabled={!s303 || loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-1" />
            )}
            {t("finishVisit.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
