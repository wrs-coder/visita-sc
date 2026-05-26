import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, FileDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { getDateLocale } from "@/lib/date-locale";
import { toast } from "sonner";
import { saveBlob } from "@/lib/share";

export const Route = createFileRoute("/_app/relatorio/$visitId")({
  component: ReportPage,
});

interface Visit {
  id: string; title: string; start_date: string; end_date: string;
  congregation_id: string; substitute_name?: string | null; substitute_phone?: string | null;
}
interface Cong { id: string; name: string; invite_code: string }

type Row = Record<string, unknown>;

function ReportPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
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

  const fmtDate = (d?: string | null) => {
    if (!d) return "";
    try { return format(parseISO(d), "EEEE, d MMMM yyyy", { locale: dateLocale }); } catch { return d; }
  };
  const fmtTime = (tm?: string | null) => tm ? tm.slice(0, 5) : "";

  useEffect(() => {
    (async () => {
      try {
        const { data: v } = await supabase.from("visits").select("*").eq("id", visitId).maybeSingle();
        if (!v) { setLoading(false); return; }
        setVisit(v as Visit);
        const { data: c } = await supabase.from("congregations").select("id,name,invite_code").eq("id", v.congregation_id).maybeSingle();
        setCong((c ?? null) as Cong | null);
        const [s, m, tr, a, fm, mw, we, pi, el, cl] = await Promise.all([
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
        setSchedule(s.data ?? []); setMeals(m.data ?? []); setTransports(tr.data ?? []);
        setAssignments(a.data ?? []); setFieldMeetings(fm.data ?? []);
        setMidweek(mw.data ?? []); setWeekend(we.data ?? []); setPioneer(pi.data ?? []); setElders(el.data ?? []);
        setChecklist(cl.data ?? []);
      } catch (e) {
        console.warn("[relatorio] erro", e);
      } finally { setLoading(false); }
    })();
  }, [visitId]);

  const dash = t("report.labels.dash");
  const _in = t("report.labels.in");

  const exportMarkdown = async () => {
    if (!visit) return;
    const lines: string[] = [];
    lines.push(`# ${t("report.title")}`);
    lines.push("");
    lines.push(`**${t("report.congregation")}** ${cong?.name ?? dash}`);
    lines.push(`**${t("report.type")}** ${visit.title}`);
    lines.push(`**${t("report.period")}** ${fmtDate(visit.start_date)} ${t("report.periodSeparator")} ${fmtDate(visit.end_date)}`);
    if (visit.substitute_name || visit.substitute_phone) {
      lines.push(`**${t("report.substitute")}** ${visit.substitute_name ?? ""} ${visit.substitute_phone ? `(${visit.substitute_phone})` : ""}`);
    }
    const section = (title: string, items: string[]) => {
      if (items.length === 0) return;
      lines.push("", `## ${title}`, "", ...items.map((i) => `- ${i}`));
    };
    section(t("report.sections.schedule"), schedule.map((e) => `${fmtDate(String(e.event_date))} · ${fmtTime(String(e.start_time ?? ""))} — ${String(e.title ?? "")}${e.location ? ` (${String(e.location)})` : ""}`));
    section(t("report.sections.meals"), meals.map((m) => `${fmtDate(String(m.meal_date))} · ${fmtTime(String(m.meal_time ?? ""))} — ${String(m.type ?? "")} ${_in} ${String(m.host_name ?? dash)}${m.location ? ` (${String(m.location)})` : ""}`));
    section(t("report.sections.transport"), transports.map((tr) => `${fmtDate(String(tr.event_date ?? ""))} — ${String(tr.driver_name ?? "")}${tr.contact_phone ? ` · ${String(tr.contact_phone)}` : ""}${tr.description ? ` · ${String(tr.description)}` : ""}`));
    section(t("report.sections.fieldAssignments"), assignments.map((a) => `${fmtDate(String(a.event_date))} · ${String(a.period ?? "")} — ${String(a.acompanhante ?? "")}${a.meeting_point ? ` ${_in} ${String(a.meeting_point)}` : ""}`));
    section(t("report.sections.fieldMeetings"), fieldMeetings.map((f) => `${fmtDate(String(f.event_date))} · ${String(f.period ?? "")} — ${String(f.modality ?? "")}${f.meeting_location ? ` ${_in} ${String(f.meeting_location)}` : ""}`));
    section(t("report.sections.midweek"), midweek.map((x) => `${t("report.labels.chairman")}: ${String(x.chairman ?? dash)} · ${t("report.labels.serviceTalk")}: ${String(x.service_talk_theme ?? dash)}`));
    section(t("report.sections.weekend"), weekend.map((x) => `${t("report.labels.publicTalk")}: ${String(x.public_talk_theme ?? dash)} · ${t("report.labels.finalTalk")}: ${String(x.talk_theme_title ?? dash)}`));
    section(t("report.sections.pioneer"), pioneer.map((x) => `${fmtDate(String(x.meeting_at ?? ""))} — ${String(x.theme ?? dash)}${x.location ? ` (${String(x.location)})` : ""}`));
    section(t("report.sections.elders"), elders.map((x) => `${t("report.labels.theme")}: ${String(x.theme ?? dash)}`));
    section(t("report.sections.checklist"), checklist.map((c) => `[${c.status === "done" ? "x" : " "}] ${String(c.title ?? "")}`));

    const md = lines.join("\n");
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const filename = `relatorio-${cong?.name ?? "visita"}-${visit.start_date}.md`.replace(/\s+/g, "_");
    await saveBlob(blob, {
      filename,
      mimeType: "text/markdown",
      pickerTypes: [{ description: "Markdown", accept: { "text/markdown": [".md"] } }],
    });
    toast.success(t("report.markdownExported"));
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">{t("report.loading")}</div>;
  if (!visit) return <div className="p-6 text-sm text-muted-foreground">{t("report.notFound")}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4 mr-1" /> {t("report.back")}
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportMarkdown}>
            <FileDown className="h-4 w-4 mr-1" /> {t("report.markdown")}
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> {t("report.print")}
          </Button>
        </div>
      </div>

      <article className="report bg-white text-black mx-auto max-w-3xl p-6 md:p-10 rounded-md shadow-card print:shadow-none print:p-0 print:max-w-none">
        <header className="border-b pb-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">{t("report.title")}</h1>
          <p className="mt-2 text-sm">
            <strong>{t("report.congregation")}</strong> {cong?.name ?? dash}<br />
            <strong>{t("report.type")}</strong> {visit.title}<br />
            <strong>{t("report.period")}</strong> {fmtDate(visit.start_date)} {t("report.periodSeparator")} {fmtDate(visit.end_date)}
          </p>
          {(visit.substitute_name || visit.substitute_phone) && (
            <p className="mt-1 text-sm">
              <strong>{t("report.substitute")}</strong> {visit.substitute_name ?? ""}{visit.substitute_phone ? ` · ${visit.substitute_phone}` : ""}
            </p>
          )}
        </header>

        <ReportSection title={t("report.sections.schedule")} empty={schedule.length === 0}>
          {schedule.map((e, i) => (
            <li key={i}>{fmtDate(String(e.event_date))} · <strong>{fmtTime(String(e.start_time ?? ""))}</strong> — {String(e.title ?? "")}{e.location ? <em> ({String(e.location)})</em> : null}</li>
          ))}
        </ReportSection>

        <ReportSection title={t("report.sections.meals")} empty={meals.length === 0}>
          {meals.map((m, i) => (
            <li key={i}>{fmtDate(String(m.meal_date))} · <strong>{fmtTime(String(m.meal_time ?? ""))}</strong> — {String(m.type ?? "")} {_in} {String(m.host_name ?? dash)}{m.location ? <em> · {String(m.location)}</em> : null}{m.contact_phone ? <> · {String(m.contact_phone)}</> : null}</li>
          ))}
        </ReportSection>

        <ReportSection title={t("report.sections.transport")} empty={transports.length === 0}>
          {transports.map((tr, i) => (
            <li key={i}>{tr.event_date ? <>{fmtDate(String(tr.event_date))} — </> : null}<strong>{String(tr.driver_name ?? "")}</strong>{tr.contact_phone ? <> · {String(tr.contact_phone)}</> : null}{tr.description ? <> · {String(tr.description)}</> : null}</li>
          ))}
        </ReportSection>

        <ReportSection title={t("report.sections.fieldAssignments")} empty={assignments.length === 0}>
          {assignments.map((a, i) => (
            <li key={i}>{fmtDate(String(a.event_date))} · {String(a.period ?? "")} — {String(a.acompanhante ?? "")}{a.meeting_point ? <em> · {String(a.meeting_point)}</em> : null}</li>
          ))}
        </ReportSection>

        <ReportSection title={t("report.sections.fieldMeetings")} empty={fieldMeetings.length === 0}>
          {fieldMeetings.map((f, i) => (
            <li key={i}>{fmtDate(String(f.event_date))} · {String(f.period ?? "")} — {String(f.modality ?? "")}{f.meeting_location ? <em> · {String(f.meeting_location)}</em> : null}{f.territory_number ? <> · {t("report.labels.territory")} {String(f.territory_number)}</> : null}</li>
          ))}
        </ReportSection>

        <ReportSection title={t("report.sections.midweek")} empty={midweek.length === 0}>
          {midweek.map((x, i) => (
            <li key={i}>{t("report.labels.chairman")}: <strong>{String(x.chairman ?? dash)}</strong> · {t("report.labels.serviceTalk")}: {String(x.service_talk_theme ?? dash)}</li>
          ))}
        </ReportSection>

        <ReportSection title={t("report.sections.weekend")} empty={weekend.length === 0}>
          {weekend.map((x, i) => (
            <li key={i}>{t("report.labels.publicTalk")}: <strong>{String(x.public_talk_theme ?? dash)}</strong> · {t("report.labels.finalTalk")}: {String(x.talk_theme_title ?? dash)}</li>
          ))}
        </ReportSection>

        <ReportSection title={t("report.sections.pioneer")} empty={pioneer.length === 0}>
          {pioneer.map((x, i) => (
            <li key={i}>{x.meeting_at ? <>{fmtDate(String(x.meeting_at).slice(0, 10))} — </> : null}{String(x.theme ?? dash)}{x.location ? <em> · {String(x.location)}</em> : null}</li>
          ))}
        </ReportSection>

        <ReportSection title={t("report.sections.elders")} empty={elders.length === 0}>
          {elders.map((x, i) => (<li key={i}>{t("report.labels.theme")}: {String(x.theme ?? dash)}</li>))}
        </ReportSection>

        <ReportSection title={t("report.sections.checklist")} empty={checklist.length === 0}>
          {checklist.map((c, i) => (
            <li key={i}>[{c.status === "done" ? "✓" : " "}] {String(c.title ?? "")}</li>
          ))}
        </ReportSection>

        <footer className="mt-8 pt-3 border-t text-[10px] text-gray-500 print:text-black">
          {t("report.generatedAt", { date: format(new Date(), "d MMMM yyyy HH:mm", { locale: dateLocale }) })}
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
