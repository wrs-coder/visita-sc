import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Pencil, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DAY_KEYS, customSlotLabel, visitWeekdays, slotTaken } from "@/lib/pastoral-slots";
import { parseSlotLabel } from "@/lib/pastoral-dispatch";

export function PastoralSlotEditor({ current, start, end, used, disabled, onSave, addLabel }: {
  /** Quando definido, mostra um botão "+ texto" e cria um horário novo em vez de editar. */
  addLabel?: string;
  current: string | null;
  start: string;
  end: string;
  used: Set<string>;
  disabled: boolean;
  onSave: (label: string) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [conflict, setConflict] = useState(false);
  const days = visitWeekdays(start, end);
  const label = day === "" ? null : customSlotLabel(Number(day), time, start, end);
  const save = useMutation({
    mutationFn: (value: string) => onSave(value),
    onSuccess: (ok) => { if (ok) setOpen(false); },
  });
  const changeOpen = (value: boolean) => {
    if (save.isPending) return;
    if (value) {
      const p = parseSlotLabel(current, start, end);
      setDay(p.date ? String(new Date(`${p.date}T00:00:00Z`).getUTCDay()) : "");
      setTime(p.time ?? "");
      setConflict(false);
    }
    setOpen(value);
  };
  const submit = () => {
    if (!label || disabled || save.isPending) return;
    if (!conflict && slotTaken(label, used)) { setConflict(true); return; }
    save.mutate(label);
  };
  return <>
    {addLabel ? (
      <Button type="button" variant="outline" size="sm" className="flex-1 rounded-full" disabled={disabled} onClick={() => changeOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> {addLabel}
      </Button>
    ) : (
    <Button type="button" variant="ghost" size="icon" className="shrink-0" disabled={disabled}
      aria-label={t("elderProgram.editSlot")} title={t("elderProgram.editSlot")} onClick={() => changeOpen(true)}>
      <Pencil className="h-4 w-4" />
    </Button>
    )}
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[85dvh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle>{addLabel ? "Novo horário de pastoreio" : t("elderProgram.editSlot")}</DialogTitle>
          <DialogDescription>{addLabel ? "Vale só para esta visita. O modelo não muda." : (current || t("elderProgram.noSlot"))}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pastoral-slot-day">{t("elderProgram.slotDay")}</Label>
            <Select value={day} disabled={save.isPending} onValueChange={(v) => { setDay(v); setConflict(false); }}>
              <SelectTrigger id="pastoral-slot-day"><SelectValue placeholder={t("elderProgram.slotDay")} /></SelectTrigger>
              <SelectContent>{days.map((d) => <SelectItem key={d} value={String(d)}>{t(`meetingsTalks.weekdays.${DAY_KEYS[d]}`)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pastoral-slot-time">{t("elderProgram.slotTime")}</Label>
            <Input id="pastoral-slot-time" type="time" value={time} disabled={save.isPending}
              onChange={(e) => { setTime(e.target.value); setConflict(false); }} />
          </div>
          {conflict && <p role="alert" className="text-sm text-destructive">{t("elderProgram.slotConflict")}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" disabled={save.isPending} onClick={() => changeOpen(false)}>{t("common.cancel")}</Button>
          <Button type="button" disabled={!label || disabled || save.isPending} onClick={submit}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {addLabel ? "Adicionar" : t(conflict ? "elderProgram.confirmSlot" : "meetingsTalks.saveData")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}