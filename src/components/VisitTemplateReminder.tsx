import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  alreadyShownToday, markShownToday, pickVisitsNeedingTemplates, type VisitTemplateFields,
} from "@/lib/visit-template-reminder";

/** Pop-up diário (só superintendente) para visitas em até 2 meses sem modelo. */
export function VisitTemplateReminder({ userId, enabled }: { userId: string | null; enabled: boolean }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [hit, setHit] = useState<{ id: string; cong: string; date: string } | null>(null);

  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const now = new Date();
        if (alreadyShownToday(userId, now)) return;
        const { data: congs } = await supabase
          .from("congregations").select("id,name").eq("superintendent_id", userId);
        const ids = (congs ?? []).map((c) => c.id);
        if (!ids.length) return;
        const { data } = await supabase
          .from("visits")
          .select("id,start_date,congregation_id,template_id,checklist_template_id,field_meeting_template_id,meeting_talk_template_id,elder_program_template_id")
          .in("congregation_id", ids);
        const list = pickVisitsNeedingTemplates((data ?? []) as VisitTemplateFields[], now);
        if (cancelled || !list.length) return;
        const v = list[0];
        markShownToday(userId, now);
        setHit({
          id: v.id,
          cong: congs?.find((c) => c.id === v.congregation_id)?.name ?? "—",
          date: format(parseISO(v.start_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR }),
        });
      } catch { /* offline: tenta de novo na próxima abertura */ }
    }, 3000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [enabled, userId]);

  return (
    <Dialog open={!!hit} onOpenChange={(o) => { if (!o) setHit(null); }}>
      <DialogContent className="max-w-sm rounded-3xl text-center">
        <DialogHeader className="items-center space-y-3">
          <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <CalendarClock className="h-7 w-7" />
          </div>
          <DialogTitle className="text-lg">{t("visitReminder.title")}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            <span className="block font-semibold text-foreground">{hit?.cong}</span>
            <span className="block">{hit?.date}</span>
            <span className="block mt-2">{t("visitReminder.body")}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 pt-2">
          <Button
            className="rounded-xl"
            onClick={() => {
              const id = hit?.id;
              setHit(null);
              if (id) nav({ to: "/configuracoes", search: { edit: id } });
            }}
          >
            {t("visitReminder.go")}
          </Button>
          <Button variant="ghost" className="rounded-xl" onClick={() => setHit(null)}>OK</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
