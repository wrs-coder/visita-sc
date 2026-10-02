// Mescla os extras dos modelos vinculados à visita com os ajustes feitos
// só para esta visita (o ajuste vence quando preenchido). Mesma regra da
// aba "Reuniões e Discursos", usada pelos acessos somente leitura.
import type { VisitTemplateExtras } from "./visit-template-extras.shared";

type Row = Record<string, unknown> | null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (t: string) => any };

function pick<T>(override: T | null | undefined, fallback: T | null | undefined): T | null {
  if (override !== null && override !== undefined && override !== "") return override as T;
  return (fallback ?? null) as T | null;
}

const str = (r: Row, k: string) => ((r?.[k] as string | null | undefined) ?? null);
const num = (r: Row, k: string) => ((r?.[k] as number | null | undefined) ?? null);

export async function loadMergedVisitExtras(
  client: AnyClient,
  visit: {
    id: string;
    meeting_talk_template_id: string | null;
    field_meeting_template_id: string | null;
    template_id: string | null;
  },
  opts: { includeElders?: boolean } = {},
): Promise<VisitTemplateExtras> {
  const includeElders = opts.includeElders ?? true;
  const none = Promise.resolve({ data: null });
  const tpl = visit.meeting_talk_template_id;
  const [fm, root, mid, pio, eld, prog, ov] = (await Promise.all([
    visit.field_meeting_template_id
      ? client.from("field_meeting_templates").select("observations").eq("id", visit.field_meeting_template_id).maybeSingle()
      : none,
    tpl ? client.from("meeting_talk_templates").select("weekend_opening_song,weekend_closing_song,weekend_observations").eq("id", tpl).maybeSingle() : none,
    tpl ? client.from("meeting_talk_template_midweek").select("observations,final_song").eq("template_id", tpl).maybeSingle() : none,
    tpl ? client.from("meeting_talk_template_pioneer").select("observations,weekday,meeting_time").eq("template_id", tpl).maybeSingle() : none,
    tpl && includeElders ? client.from("meeting_talk_template_elders").select("observations,weekday,meeting_time").eq("template_id", tpl).maybeSingle() : none,
    visit.template_id ? client.from("program_templates").select("general_observations").eq("id", visit.template_id).maybeSingle() : none,
    client.from("visit_template_overrides").select("*").eq("visit_id", visit.id).maybeSingle(),
  ])).map((r: { data: Row }) => r.data) as Row[];

  const o = ov ?? {};
  return {
    field: { observations: pick(str(o, "field_observations"), str(fm, "observations")) },
    midweek: {
      observations: pick(str(o, "midweek_observations"), str(mid, "observations")),
      final_song: pick(str(o, "midweek_final_song"), str(mid, "final_song")),
    },
    weekend: {
      opening_song: pick(str(o, "weekend_opening_song"), str(root, "weekend_opening_song")),
      closing_song: pick(str(o, "weekend_closing_song"), str(root, "weekend_closing_song")),
      observations: pick(str(o, "weekend_observations"), str(root, "weekend_observations")),
    },
    pioneer: {
      observations: pick(str(o, "pioneer_observations"), str(pio, "observations")),
      weekday: num(o, "pioneer_weekday") ?? num(pio, "weekday"),
      meeting_time: pick(str(o, "pioneer_meeting_time"), str(pio, "meeting_time")),
    },
    elders: includeElders
      ? {
          observations: pick(str(o, "elders_observations"), str(eld, "observations")),
          weekday: num(o, "elders_weekday") ?? num(eld, "weekday"),
          meeting_time: pick(str(o, "elders_meeting_time"), str(eld, "meeting_time")),
        }
      : null,
    program: { general_observations: pick(str(o, "program_general_observations"), str(prog, "general_observations")) },
  };
}
