import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { readWithMirror } from "@/lib/local-first";

type VisitRow = { id: string; title: string; congregation_id: string; start_date: string; end_date: string; is_active?: boolean };

interface Props {
  congregations: Array<{ id: string; name: string }>;
}

/** Botão de calendário + lista somente leitura das próximas visitas agendadas. */
export function UpcomingVisitsButton({ congregations }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<VisitRow[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const today = format(new Date(), "yyyy-MM-dd");
    (async () => {
      try {
        const { rows: list } = await readWithMirror<VisitRow>({
          table: "visits",
          remote: async () =>
            await supabase
              .from("visits")
              .select("id, title, congregation_id, start_date, end_date")
              .gte("end_date", today)
              .eq("is_active", true)
              .order("start_date", { ascending: true }),
          filter: (v) => v.is_active !== false && v.end_date >= today,
          sort: (a, b) => a.start_date.localeCompare(b.start_date),
        });
        if (!cancelled) setRows(list);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const today = format(new Date(), "yyyy-MM-dd");
  const fmt = (d: string) => format(parseISO(d), "dd/MM");
  const nameOf = (id: string) => congregations.find((c) => c.id === id)?.name ?? "—";

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-8 w-8 rounded-full p-0 shrink-0"
        aria-label={t("dashboard.upcomingVisits", { defaultValue: "Próximas visitas" })}
        title={t("dashboard.upcomingVisits", { defaultValue: "Próximas visitas" })}
        onClick={() => setOpen(true)}
      >
        <CalendarDays className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dashboard.upcomingVisits", { defaultValue: "Próximas visitas" })}</DialogTitle>
          </DialogHeader>
          {rows === null ? (
            <div className="py-6 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("dashboard.noUpcomingVisits", { defaultValue: "Nenhuma visita agendada" })}
            </p>
          ) : (
            <ul className="divide-y divide-border max-h-[60vh] overflow-y-auto">
              {rows.map((v) => {
                const current = v.start_date <= today && v.end_date >= today;
                return (
                  <li key={v.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{nameOf(v.congregation_id)}</div>
                      <div className="text-xs text-muted-foreground truncate">{v.title}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm tabular-nums">{fmt(v.start_date)} – {fmt(v.end_date)}</div>
                      {current && (
                        <span className="inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                          {t("dashboard.inProgress", { defaultValue: "Em andamento" })}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
