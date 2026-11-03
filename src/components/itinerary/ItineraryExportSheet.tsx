import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { saveBlob } from "@/lib/share";
import { DOCX_MIME, htmlToDocx } from "@/lib/docx-export";
import {
  buildExportRows, itineraryListHtml, itineraryPdfCalendar, itineraryPdfList, itineraryXlsx, monthPages, periodRange, currentSemester, XLSX_MIME,
  type ExportVisit, type ExportWeek, type PeriodMode,
} from "@/lib/itinerary-export";

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const fmtD = (s: string) => { const [y, m, d] = s.split("-").map(Number); return `${d} ${MES[m - 1]} ${y}`; };
const fmtRange = (r: { from: string; to: string }) => `${fmtD(r.from)} – ${fmtD(r.to)}`;

type Fmt = "pdf" | "docx" | "xlsx";

function Pills<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={`min-h-10 rounded-full border px-4 text-sm font-medium ${value === v ? "border-primary bg-primary text-primary-foreground" : "bg-muted/40 text-foreground"}`}>{l}</button>
      ))}
    </div>
  );
}

export function ItineraryExportSheet({ open, onOpenChange, visits, congs, circuit, superintendent }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  visits: ExportVisit[]; congs: { id: string; name: string }[];
  circuit?: string | null; superintendent?: string | null;
}) {
  const [fmt, setFmt] = useState<Fmt>("pdf");
  const [style, setStyle] = useState<"list" | "calendar">("list");
  const [period, setPeriod] = useState<PeriodMode>(() => currentSemester(new Date()));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const customBad = period === "custom" && (!from || !to || to < from);
  const range = periodRange(period, new Date(), { from, to });
  const [includeOff, setIncludeOff] = useState(true);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const { data } = await supabase.from("itinerary_weeks").select("start_date,end_date,week_type,notes").order("start_date");
      const now = new Date();
      const rows = buildExportRows(visits, congs, (data ?? []) as ExportWeek[], { range, includeOff });
      if (!rows.length) { toast.error("Nenhuma semana no período escolhido."); return; }
      const meta = { circuit, superintendent, generatedAt: now };
      const base = `itinerario-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      let blob: Blob, filename: string, mimeType: string;
      if (fmt === "pdf") {
        if (style === "calendar" && monthPages(rows).length > 1) toast.message("Período com mais de 6 meses: o calendário terá mais de 1 folha.");
        blob = style === "calendar" ? await itineraryPdfCalendar(rows, meta) : await itineraryPdfList(rows, meta);
        filename = `${base}${style === "calendar" ? "-calendario" : ""}.pdf`; mimeType = "application/pdf";
      } else if (fmt === "docx") {
        blob = await htmlToDocx("Itinerário", itineraryListHtml(rows, meta)); filename = `${base}.docx`; mimeType = DOCX_MIME;
      } else {
        blob = await itineraryXlsx(rows); filename = `${base}.xlsx`; mimeType = XLSX_MIME;
      }
      await saveBlob(blob, { filename, mimeType });
      onOpenChange(false);
    } catch (e) {
      toast.error(`Não foi possível exportar: ${(e as Error).message}`);
    } finally { setBusy(false); }
  };

  return (
    <Drawer open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DrawerContent className="max-h-[90dvh]">
        <DrawerHeader className="text-left"><DrawerTitle>Exportar itinerário</DrawerTitle></DrawerHeader>
        <div className="space-y-5 overflow-y-auto px-4 pb-6">
          <section className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Formato</p>
            <Pills value={fmt} onChange={setFmt} options={[["pdf", "PDF"], ["docx", "Word"], ["xlsx", "Excel"]]} />
          </section>
          {fmt === "pdf" && (
            <section className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Estilo</p>
              <Pills value={style} onChange={setStyle} options={[["list", "Lista"], ["calendar", "Calendário"]]} />
            </section>
          )}
          <section className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Período</p>
            <Pills value={period} onChange={setPeriod} options={[["sem1", "1º Semestre"], ["sem2", "2º Semestre"], ["serviceYear", "Ano de serviço"], ["all", "Tudo agendado"], ["custom", "Personalizado"]]} />
            {period === "custom" && (
              <div className="divide-y rounded-xl bg-muted/50">
                <label className="flex min-h-11 items-center justify-between gap-3 px-3 text-sm">De
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-transparent text-right text-sm" /></label>
                <label className="flex min-h-11 items-center justify-between gap-3 px-3 text-sm">Até
                  <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="bg-transparent text-right text-sm" /></label>
              </div>
            )}
            {customBad ? <p className="text-xs text-destructive">{from && to ? "A data final deve ser depois da inicial." : "Escolha as duas datas."}</p>
              : range && <p className="text-xs text-muted-foreground">{fmtRange(range)}</p>}
          </section>
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 text-sm">
            Incluir semanas sem visita
            <Switch checked={includeOff} onCheckedChange={setIncludeOff} />
          </label>
          <Button className="h-12 w-full rounded-full text-base" disabled={busy || customBad} onClick={run}>{busy ? "Gerando…" : "Gerar e partilhar"}</Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
