import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, FileDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/relatorio/$visitId")({
  component: ReportPage,
});

interface Visit {
  id: string; title: string; start_date: string; end_date: string;
  congregation_id: string; substitute_name?: string | null; substitute_phone?: string | null;
}
interface Cong { id: string; name: string; invite_code: string }

type Row = Record<string, unknown>;

function fmtDate(d?: string | null) {
  if (!d) return "";
  try { return format(parseISO(d), "EEEE, d 'de' MMMM yyyy", { locale: ptBR }); } catch { return d; }
}
function fmtTime(t?: string | null) {
  return t ? t.slice(0, 5) : "";
}

function ReportPage() {
  const { visitId } = Route.useParams();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [cong, setCong] = useState<Cong | null>(null);
  const [schedule, setSchedule] = useState<Row[]>([]);
  const [meals, setMeals] = useState<Row[]>([]);
  const [transports, setTransports] = useState<Row[]>([]);
  const [assignments, setAssignments] = useState<Row[]>([]);
  const [fieldMeetings, setFieldMeetings] = useState<Row[]>([]);
  const [midweek, setMidweek] = useState<Row[]>([]);
  const [weekend, setWeekend] = useState<Row[]>([]);
  const [pioneer, setPioneer] = useState<Row[]>([]);
  const [elders, setElders] = useState<Row[]>([]);
  const [checklist, setChecklist] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: v } = await supabase.from("visits").select("*").eq("id", visitId).maybeSingle();
        if (!v) { setLoading(false); return; }
        setVisit(v as Visit);
        const { data: c } = await supabase.from("congregations").select("id,name,invite_code").eq("id", v.congregation_id).maybeSingle();
        setCong((c ?? null) as Cong | null);
        const [s, m, t, a, fm, mw, we, pi, el, cl] = await Promise.all([
          supabase.from("schedule_events").select("*").eq("visit_id", visitId).order("event_date").order("start_time"),
          supabase.from("meals").select("*").eq("visit_id", visitId).eq("is_active", true).order("meal_date").order("meal_time"),
          supabase.from("transport_schedule").select("*").eq("visit_id", visitId).eq("is_active", true).order("event_date"),
          supabase.from("field_assignments").select("*").eq("visit_id", visitId).eq("is_active", true).order("event_date").order("period"),
          supabase.from("field_meetings").select("*").eq("visit_id", visitId).eq("is_active", true).order("event_date").order("period"),
          supabase.from("midweek_meetings").select("*").eq("visit_id", visitId),
          supabase.from("weekend_meetings").select("*").eq("visit_id", visitId),
          supabase.from("pioneer_meetings").select("*").eq("visit_id", visitId),
          supabase.from("elders_servants_meetings").select("*").eq("visit_id", visitId),
          supabase.from("checklist_items").select("*").eq("visit_id", visitId).order("sort_order"),
        ]);
        setSchedule(s.data ?? []); setMeals(m.data ?? []); setTransports(t.data ?? []);
        setAssignments(a.data ?? []); setFieldMeetings(fm.data ?? []);
        setMidweek(mw.data ?? []); setWeekend(we.data ?? []); setPioneer(pi.data ?? []); setElders(el.data ?? []);
        setChecklist(cl.data ?? []);
      } catch (e) {
        console.warn("[relatorio] erro", e);
      } finally { setLoading(false); }
    })();
  }, [visitId]);

  const exportMarkdown = () => {
    if (!visit) return;
    const lines: string[] = [];
    lines.push(`# Resumo Executivo da Visita`);
    lines.push("");
    lines.push(`**Congregação:** ${cong?.name ?? "—"}`);
    lines.push(`**Tipo:** ${visit.title}`);
    lines.push(`**Período:** ${fmtDate(visit.start_date)} a ${fmtDate(visit.end_date)}`);
    if (visit.substitute_name || visit.substitute_phone) {
      lines.push(`**Substituto:** ${visit.substitute_name ?? ""} ${visit.substitute_phone ? `(${visit.substitute_phone})` : ""}`);
    }
    const section = (title: string, items: string[]) => {
      if (items.length === 0) return;
      lines.push("", `## ${title}`, "", ...items.map((i) => `- ${i}`));
    };
    section("Programação", schedule.map((e) => `${fmtDate(String(e.event_date))} · ${fmtTime(String(e.start_time ?? ""))} — ${String(e.title ?? "")}${e.location ? ` (${String(e.location)})` : ""}`));
    section("Refeições", meals.map((m) => `${fmtDate(String(m.meal_date))} · ${fmtTime(String(m.meal_time ?? ""))} — ${String(m.type ?? "")} em ${String(m.host_name ?? "—")}${m.location ? ` (${String(m.location)})` : ""}`));
    section("Transporte", transports.map((t) => `${fmtDate(String(t.event_date ?? ""))} — ${String(t.driver_name ?? "")}${t.contact_phone ? ` · ${String(t.contact_phone)}` : ""}${t.description ? ` · ${String(t.description)}` : ""}`));
    section("Escala de Campo", assignments.map((a) => `${fmtDate(String(a.event_date))} · ${String(a.period ?? "")} — ${String(a.acompanhante ?? "")}${a.meeting_point ? ` em ${String(a.meeting_point)}` : ""}`));
    section("Reuniões de Campo", fieldMeetings.map((f) => `${fmtDate(String(f.event_date))} · ${String(f.period ?? "")} — ${String(f.modality ?? "")}${f.meeting_location ? ` em ${String(f.meeting_location)}` : ""}`));
    section("Reunião de Meio de Semana", midweek.map((x) => `Presidente: ${String(x.chairman ?? "—")} · Discurso de serviço: ${String(x.service_talk_theme ?? "—")}`));
    section("Reunião de Fim de Semana", weekend.map((x) => `Discurso público: ${String(x.public_talk_theme ?? "—")} · Discurso final: ${String(x.talk_theme_title ?? "—")}`));
    section("Reunião de Pioneiros", pioneer.map((x) => `${fmtDate(String(x.meeting_at ?? ""))} — ${String(x.theme ?? "—")}${x.location ? ` (${String(x.location)})` : ""}`));
    section("Reunião com Anciãos e Servos", elders.map((x) => `Tema: ${String(x.theme ?? "—")}`));
    section("Checklist", checklist.map((c) => `[${c.status === "done" ? "x" : " "}] ${String(c.title ?? "")}`));

    const md = lines.join("\n");
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${cong?.name ?? "visita"}-${visit.start_date}.md`.replace(/\s+/g, "_");
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Markdown exportado");
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">A carregar relatório…</div>;
  if (!visit) return <div className="p-6 text-sm text-muted-foreground">Visita não encontrada.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportMarkdown}>
            <FileDown className="h-4 w-4 mr-1" /> Markdown
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir / Salvar PDF
          </Button>
        </div>
      </div>

      <article className="report bg-white text-black mx-auto max-w-3xl p-6 md:p-10 rounded-md shadow-card print:shadow-none print:p-0 print:max-w-none">
        <header className="border-b pb-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Resumo Executivo da Visita</h1>
          <p className="mt-2 text-sm">
            <strong>Congregação:</strong> {cong?.name ?? "—"}<br />
            <strong>Tipo:</strong> {visit.title}<br />
            <strong>Período:</strong> {fmtDate(visit.start_date)} a {fmtDate(visit.end_date)}
          </p>
          {(visit.substitute_name || visit.substitute_phone) && (
            <p className="mt-1 text-sm">
              <strong>Substituto:</strong> {visit.substitute_name ?? ""}{visit.substitute_phone ? ` · ${visit.substitute_phone}` : ""}
            </p>
          )}
        </header>

        <ReportSection title="Programação" empty={schedule.length === 0}>
          {schedule.map((e, i) => (
            <li key={i}>{fmtDate(String(e.event_date))} · <strong>{fmtTime(String(e.start_time ?? ""))}</strong> — {String(e.title ?? "")}{e.location ? <em> ({String(e.location)})</em> : null}</li>
          ))}
        </ReportSection>

        <ReportSection title="Refeições" empty={meals.length === 0}>
          {meals.map((m, i) => (
            <li key={i}>{fmtDate(String(m.meal_date))} · <strong>{fmtTime(String(m.meal_time ?? ""))}</strong> — {String(m.type ?? "")} em {String(m.host_name ?? "—")}{m.location ? <em> · {String(m.location)}</em> : null}{m.contact_phone ? <> · {String(m.contact_phone)}</> : null}</li>
          ))}
        </ReportSection>

        <ReportSection title="Transporte" empty={transports.length === 0}>
          {transports.map((t, i) => (
            <li key={i}>{t.event_date ? <>{fmtDate(String(t.event_date))} — </> : null}<strong>{String(t.driver_name ?? "")}</strong>{t.contact_phone ? <> · {String(t.contact_phone)}</> : null}{t.description ? <> · {String(t.description)}</> : null}</li>
          ))}
        </ReportSection>

        <ReportSection title="Escala de Campo" empty={assignments.length === 0}>
          {assignments.map((a, i) => (
            <li key={i}>{fmtDate(String(a.event_date))} · {String(a.period ?? "")} — {String(a.acompanhante ?? "")}{a.meeting_point ? <em> · {String(a.meeting_point)}</em> : null}</li>
          ))}
        </ReportSection>

        <ReportSection title="Reuniões de Campo" empty={fieldMeetings.length === 0}>
          {fieldMeetings.map((f, i) => (
            <li key={i}>{fmtDate(String(f.event_date))} · {String(f.period ?? "")} — {String(f.modality ?? "")}{f.meeting_location ? <em> · {String(f.meeting_location)}</em> : null}{f.territory_number ? <> · Território {String(f.territory_number)}</> : null}</li>
          ))}
        </ReportSection>

        <ReportSection title="Reunião de Meio de Semana" empty={midweek.length === 0}>
          {midweek.map((x, i) => (
            <li key={i}>Presidente: <strong>{String(x.chairman ?? "—")}</strong> · Discurso de serviço: {String(x.service_talk_theme ?? "—")}</li>
          ))}
        </ReportSection>

        <ReportSection title="Reunião de Fim de Semana" empty={weekend.length === 0}>
          {weekend.map((x, i) => (
            <li key={i}>Discurso público: <strong>{String(x.public_talk_theme ?? "—")}</strong> · Discurso final: {String(x.talk_theme_title ?? "—")}</li>
          ))}
        </ReportSection>

        <ReportSection title="Reunião de Pioneiros" empty={pioneer.length === 0}>
          {pioneer.map((x, i) => (
            <li key={i}>{x.meeting_at ? <>{fmtDate(String(x.meeting_at).slice(0, 10))} — </> : null}{String(x.theme ?? "—")}{x.location ? <em> · {String(x.location)}</em> : null}</li>
          ))}
        </ReportSection>

        <ReportSection title="Reunião com Anciãos e Servos" empty={elders.length === 0}>
          {elders.map((x, i) => (<li key={i}>Tema: {String(x.theme ?? "—")}</li>))}
        </ReportSection>

        <ReportSection title="Checklist" empty={checklist.length === 0}>
          {checklist.map((c, i) => (
            <li key={i}>[{c.status === "done" ? "✓" : " "}] {String(c.title ?? "")}</li>
          ))}
        </ReportSection>

        <footer className="mt-8 pt-3 border-t text-[10px] text-gray-500 print:text-black">
          Gerado em {format(new Date(), "d 'de' MMMM yyyy 'às' HH:mm", { locale: ptBR })} · Visita SC
        </footer>
      </article>
    </div>
  );
}

function ReportSection({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  if (empty) return null;
  return (
    <section className="mt-5">
      <h2 className="text-base font-bold border-b border-gray-300 mb-2 pb-1">{title}</h2>
      <ul className="text-sm space-y-1 list-disc pl-5">{children}</ul>
    </section>
  );
}
