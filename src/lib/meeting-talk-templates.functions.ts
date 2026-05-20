import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_TEMPLATES = 24;

export const WEEKDAY_LABELS: Record<number, string> = {
  0: "Segunda-feira",
  1: "Terça-feira",
  2: "Quarta-feira",
  3: "Quinta-feira",
  4: "Sexta-feira",
  5: "Sábado",
  6: "Domingo",
};

const nameSchema = z.string().trim().min(1).max(120);
const timeSchema = z.string().trim().max(8).nullable().optional();
const weekdaySchema = z.number().int().min(0).max(6).nullable().optional();
const textOpt = z.string().trim().max(400).nullable().optional();

const itemsPayloadSchema = z.object({
  midweek: z.object({
    service_talk_theme: textOpt,
    chairman: textOpt,
    closing_prayer: textOpt,
  }),
  weekend_themes: z.array(z.object({ title: z.string().trim().min(1).max(200) })).max(50),
  pioneer: z.object({
    weekday: weekdaySchema,
    meeting_time: timeSchema,
    super_meeting_weekday: weekdaySchema,
    super_meeting_time: timeSchema,
    location: textOpt,
    theme: textOpt,
    opening_prayer: textOpt,
    closing_prayer: textOpt,
  }),
  elders: z.object({
    theme: textOpt,
    opening_prayer: textOpt,
    closing_prayer: textOpt,
  }),
});

export type MeetingTalkTemplatePayload = z.infer<typeof itemsPayloadSchema>;

export const listMeetingTalkTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: tpls, error } = await supabaseAdmin
      .from("meeting_talk_templates")
      .select("id,name,congregation_id,created_at,updated_at")
      .eq("superintendent_id", userId)
      .order("created_at");
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, templates: tpls ?? [] };
  });

export const getMeetingTalkTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: tpl } = await supabaseAdmin
      .from("meeting_talk_templates")
      .select("id,name,congregation_id,superintendent_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!tpl || tpl.superintendent_id !== userId) {
      return { ok: false as const, error: "Não autorizado." };
    }
    const [mid, themes, pioneer, elders] = await Promise.all([
      supabaseAdmin.from("meeting_talk_template_midweek").select("*").eq("template_id", data.id).maybeSingle(),
      supabaseAdmin.from("meeting_talk_template_weekend_themes").select("id,title,sort_order").eq("template_id", data.id).order("sort_order"),
      supabaseAdmin.from("meeting_talk_template_pioneer").select("*").eq("template_id", data.id).maybeSingle(),
      supabaseAdmin.from("meeting_talk_template_elders").select("*").eq("template_id", data.id).maybeSingle(),
    ]);
    return {
      ok: true as const,
      template: { id: tpl.id, name: tpl.name, congregation_id: tpl.congregation_id },
      midweek: mid.data ?? null,
      weekend_themes: themes.data ?? [],
      pioneer: pioneer.data ?? null,
      elders: elders.data ?? null,
    };
  });

export const createMeetingTalkTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      name: nameSchema,
      congregationId: z.string().uuid().nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { count } = await supabaseAdmin
      .from("meeting_talk_templates")
      .select("id", { count: "exact", head: true })
      .eq("superintendent_id", userId);
    if ((count ?? 0) >= MAX_TEMPLATES) {
      return { ok: false as const, error: `Limite de ${MAX_TEMPLATES} modelos atingido.` };
    }
    const { data: row, error } = await supabaseAdmin
      .from("meeting_talk_templates")
      .insert({ superintendent_id: userId, name: data.name, congregation_id: data.congregationId ?? null })
      .select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha ao criar." };
    return { ok: true as const, id: row.id };
  });

export const updateMeetingTalkTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      name: nameSchema.optional(),
      congregationId: z.string().uuid().nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: own } = await supabaseAdmin
      .from("meeting_talk_templates")
      .select("id").eq("id", data.id).eq("superintendent_id", userId).maybeSingle();
    if (!own) return { ok: false as const, error: "Não autorizado." };
    const patch: { name?: string; congregation_id?: string | null } = {};
    if (data.name) patch.name = data.name;
    if (data.congregationId !== undefined) patch.congregation_id = data.congregationId;
    if (Object.keys(patch).length === 0) return { ok: true as const };
    const { error } = await supabaseAdmin.from("meeting_talk_templates").update(patch).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const deleteMeetingTalkTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: own } = await supabaseAdmin
      .from("meeting_talk_templates")
      .select("id").eq("id", data.id).eq("superintendent_id", userId).maybeSingle();
    if (!own) return { ok: false as const, error: "Não autorizado." };
    const { error } = await supabaseAdmin.from("meeting_talk_templates").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const duplicateMeetingTalkTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), name: nameSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: src } = await supabaseAdmin
      .from("meeting_talk_templates")
      .select("id,superintendent_id").eq("id", data.id).maybeSingle();
    if (!src || src.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };
    const { count } = await supabaseAdmin
      .from("meeting_talk_templates")
      .select("id", { count: "exact", head: true })
      .eq("superintendent_id", userId);
    if ((count ?? 0) >= MAX_TEMPLATES) {
      return { ok: false as const, error: `Limite de ${MAX_TEMPLATES} modelos atingido.` };
    }
    const { data: row, error } = await supabaseAdmin
      .from("meeting_talk_templates")
      .insert({ superintendent_id: userId, name: data.name, congregation_id: null })
      .select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha." };
    const newId = row.id;
    const [mid, themes, pioneer, elders] = await Promise.all([
      supabaseAdmin.from("meeting_talk_template_midweek").select("*").eq("template_id", data.id).maybeSingle(),
      supabaseAdmin.from("meeting_talk_template_weekend_themes").select("title,sort_order").eq("template_id", data.id).order("sort_order"),
      supabaseAdmin.from("meeting_talk_template_pioneer").select("*").eq("template_id", data.id).maybeSingle(),
      supabaseAdmin.from("meeting_talk_template_elders").select("*").eq("template_id", data.id).maybeSingle(),
    ]);
    if (mid.data) await supabaseAdmin.from("meeting_talk_template_midweek").insert({ ...mid.data, template_id: newId });
    if (themes.data?.length) await supabaseAdmin.from("meeting_talk_template_weekend_themes").insert(themes.data.map((t) => ({ template_id: newId, title: t.title, sort_order: t.sort_order })));
    if (pioneer.data) await supabaseAdmin.from("meeting_talk_template_pioneer").insert({ ...pioneer.data, template_id: newId });
    if (elders.data) await supabaseAdmin.from("meeting_talk_template_elders").insert({ ...elders.data, template_id: newId });
    return { ok: true as const, id: newId };
  });

export const saveMeetingTalkTemplateItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ templateId: z.string().uuid(), payload: itemsPayloadSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: own } = await supabaseAdmin
      .from("meeting_talk_templates")
      .select("id").eq("id", data.templateId).eq("superintendent_id", userId).maybeSingle();
    if (!own) return { ok: false as const, error: "Não autorizado." };

    const p = data.payload;
    // Upsert midweek
    await supabaseAdmin.from("meeting_talk_template_midweek").upsert({
      template_id: data.templateId,
      service_talk_theme: p.midweek.service_talk_theme ?? null,
      chairman: p.midweek.chairman ?? null,
      closing_prayer: p.midweek.closing_prayer ?? null,
    });
    // Replace weekend themes
    await supabaseAdmin.from("meeting_talk_template_weekend_themes").delete().eq("template_id", data.templateId);
    if (p.weekend_themes.length) {
      await supabaseAdmin.from("meeting_talk_template_weekend_themes").insert(
        p.weekend_themes.map((t, i) => ({ template_id: data.templateId, title: t.title, sort_order: i })),
      );
    }
    // Upsert pioneer
    await supabaseAdmin.from("meeting_talk_template_pioneer").upsert({
      template_id: data.templateId,
      weekday: p.pioneer.weekday ?? null,
      meeting_time: p.pioneer.meeting_time || null,
      super_meeting_weekday: p.pioneer.super_meeting_weekday ?? null,
      super_meeting_time: p.pioneer.super_meeting_time || null,
      location: p.pioneer.location ?? null,
      theme: p.pioneer.theme ?? null,
      opening_prayer: p.pioneer.opening_prayer ?? null,
      closing_prayer: p.pioneer.closing_prayer ?? null,
    });
    // Upsert elders
    await supabaseAdmin.from("meeting_talk_template_elders").upsert({
      template_id: data.templateId,
      theme: p.elders.theme ?? null,
      opening_prayer: p.elders.opening_prayer ?? null,
      closing_prayer: p.elders.closing_prayer ?? null,
    });
    return { ok: true as const };
  });

// Aplica um modelo de reunião e discurso à visita: copia para midweek_meetings,
// weekend_meetings (1ª opção como selecionada), pioneer_meetings, elders_servants_meetings.
// Resolve weekday -> data concreta dentro da janela start_date..end_date da visita.
export const applyMeetingTalkTemplateForVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ visitId: z.string().uuid(), templateId: z.string().uuid().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: visit } = await supabaseAdmin
      .from("visits").select("id,start_date,end_date,congregation_id,meeting_talk_template_id")
      .eq("id", data.visitId).maybeSingle();
    if (!visit) return { ok: false as const, error: "Visita não encontrada." };
    const { data: cong } = await supabaseAdmin
      .from("congregations").select("superintendent_id").eq("id", visit.congregation_id).maybeSingle();
    if (!cong || cong.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };

    const templateId = data.templateId ?? visit.meeting_talk_template_id ?? null;
    if (!templateId) return { ok: false as const, error: "Nenhum modelo selecionado para esta visita." };
    const own = await supabaseAdmin.from("meeting_talk_templates")
      .select("id").eq("id", templateId).eq("superintendent_id", userId).maybeSingle();
    if (!own.data) return { ok: false as const, error: "Modelo não encontrado." };

    if (visit.meeting_talk_template_id !== templateId) {
      await supabaseAdmin.from("visits").update({ meeting_talk_template_id: templateId }).eq("id", data.visitId);
    }

    const [mid, themes, pioneer, elders] = await Promise.all([
      supabaseAdmin.from("meeting_talk_template_midweek").select("*").eq("template_id", templateId).maybeSingle(),
      supabaseAdmin.from("meeting_talk_template_weekend_themes").select("title,sort_order").eq("template_id", templateId).order("sort_order"),
      supabaseAdmin.from("meeting_talk_template_pioneer").select("*").eq("template_id", templateId).maybeSingle(),
      supabaseAdmin.from("meeting_talk_template_elders").select("*").eq("template_id", templateId).maybeSingle(),
    ]);

    // Midweek: upsert
    {
      const { data: existing } = await supabaseAdmin
        .from("midweek_meetings").select("id").eq("visit_id", data.visitId).maybeSingle();
      const payload = {
        chairman: mid.data?.chairman ?? null,
        closing_prayer: mid.data?.closing_prayer ?? null,
        visit_id: data.visitId,
      };
      if (existing) await supabaseAdmin.from("midweek_meetings").update(payload).eq("id", existing.id);
      else await supabaseAdmin.from("midweek_meetings").insert(payload);
    }

    // Weekend: deixa a 1ª opção pré-selecionada; o dropdown completo é renderizado a partir do template
    {
      const firstTitle = themes.data?.[0]?.title ?? null;
      const { data: existing } = await supabaseAdmin
        .from("weekend_meetings").select("id").eq("visit_id", data.visitId).maybeSingle();
      const payload = {
        visit_id: data.visitId,
        talk_theme_title: firstTitle,
        talk_theme_id: null as string | null,
      };
      if (existing) await supabaseAdmin.from("weekend_meetings").update(payload).eq("id", existing.id);
      else await supabaseAdmin.from("weekend_meetings").insert(payload);
    }

    // Pioneer: resolve weekday → data dentro da visita
    {
      const startD = new Date(visit.start_date + "T00:00:00");
      const endD = new Date(visit.end_date + "T00:00:00");
      // 0 = segunda...6 = domingo (convenção do app); getDay(): 0=Domingo..6=Sábado
      const toAppWeekday = (d: Date) => (d.getDay() + 6) % 7;
      const resolveDate = (weekday: number | null | undefined, time: string | null | undefined): string | null => {
        if (weekday === null || weekday === undefined || !time) return null;
        for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
          if (toAppWeekday(d) === weekday) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return new Date(`${yyyy}-${mm}-${dd}T${time}`).toISOString();
          }
        }
        return null;
      };
      const meetingAt = resolveDate(pioneer.data?.weekday ?? null, pioneer.data?.meeting_time ?? null);
      const superMeetingAt = resolveDate(pioneer.data?.super_meeting_weekday ?? null, pioneer.data?.super_meeting_time ?? null) ?? meetingAt;
      const { data: existing } = await supabaseAdmin
        .from("pioneer_meetings").select("id").eq("visit_id", data.visitId).maybeSingle();
      const payload = {
        visit_id: data.visitId,
        opening_prayer: pioneer.data?.opening_prayer ?? null,
        closing_prayer: pioneer.data?.closing_prayer ?? null,
        location: pioneer.data?.location ?? null,
        meeting_at: meetingAt,
        super_meeting_at: superMeetingAt,
      };
      if (existing) await supabaseAdmin.from("pioneer_meetings").update(payload).eq("id", existing.id);
      else await supabaseAdmin.from("pioneer_meetings").insert(payload);
    }

    // Elders: upsert
    {
      const { data: existing } = await supabaseAdmin
        .from("elders_servants_meetings").select("id").eq("visit_id", data.visitId).maybeSingle();
      const payload = {
        visit_id: data.visitId,
        opening_prayer: elders.data?.opening_prayer ?? null,
        closing_prayer: elders.data?.closing_prayer ?? null,
      };
      if (existing) await supabaseAdmin.from("elders_servants_meetings").update(payload).eq("id", existing.id);
      else await supabaseAdmin.from("elders_servants_meetings").insert(payload);
    }

    return { ok: true as const, weekendThemes: themes.data?.map((t) => t.title) ?? [] };
  });

// Lê (para qualquer membro autorizado) os temas de fim de semana do modelo
// vinculado a uma visita — alimenta o dropdown da aba "Reuniões e Discursos".
export const getVisitWeekendThemes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ visitId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: visit } = await supabaseAdmin
      .from("visits").select("meeting_talk_template_id").eq("id", data.visitId).maybeSingle();
    if (!visit?.meeting_talk_template_id) return { ok: true as const, themes: [] as string[] };
    const { data: themes } = await supabaseAdmin
      .from("meeting_talk_template_weekend_themes")
      .select("title,sort_order")
      .eq("template_id", visit.meeting_talk_template_id)
      .order("sort_order");
    return { ok: true as const, themes: (themes ?? []).map((t) => t.title) };
  });

// ---------- EXPORT / IMPORT ----------

const meetingTalkFileSchema = z.object({
  type: z.literal("meeting_talk_template"),
  version: z.literal(1),
  name: z.string().trim().min(1).max(120),
  midweek: z.object({
    chairman: z.string().trim().max(400).nullable().optional(),
    closing_prayer: z.string().trim().max(400).nullable().optional(),
  }).nullable().optional(),
  weekend_themes: z.array(z.object({
    title: z.string().trim().min(1).max(200),
    sort_order: z.number().int().min(0).max(1000).optional(),
  })).max(50).optional(),
  pioneer: z.object({
    weekday: weekdaySchema,
    meeting_time: timeSchema,
    super_meeting_weekday: weekdaySchema,
    super_meeting_time: timeSchema,
    location: textOpt,
    opening_prayer: textOpt,
    closing_prayer: textOpt,
  }).nullable().optional(),
  elders: z.object({
    opening_prayer: textOpt,
    closing_prayer: textOpt,
  }).nullable().optional(),
});

export const exportMeetingTalkTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: tpl } = await supabaseAdmin
      .from("meeting_talk_templates")
      .select("id,name,superintendent_id")
      .eq("id", data.id).maybeSingle();
    if (!tpl || tpl.superintendent_id !== userId) return { ok: false as const, error: "Não autorizado." };
    const [mid, themes, pioneer, elders] = await Promise.all([
      supabaseAdmin.from("meeting_talk_template_midweek").select("chairman,closing_prayer").eq("template_id", data.id).maybeSingle(),
      supabaseAdmin.from("meeting_talk_template_weekend_themes").select("title,sort_order").eq("template_id", data.id).order("sort_order"),
      supabaseAdmin.from("meeting_talk_template_pioneer").select("weekday,meeting_time,super_meeting_weekday,super_meeting_time,location,opening_prayer,closing_prayer").eq("template_id", data.id).maybeSingle(),
      supabaseAdmin.from("meeting_talk_template_elders").select("opening_prayer,closing_prayer").eq("template_id", data.id).maybeSingle(),
    ]);
    return {
      ok: true as const,
      file: {
        type: "meeting_talk_template" as const,
        version: 1 as const,
        exportedAt: new Date().toISOString(),
        name: tpl.name,
        midweek: mid.data ?? null,
        weekend_themes: themes.data ?? [],
        pioneer: pioneer.data ?? null,
        elders: elders.data ?? null,
      },
    };
  });

export const importMeetingTalkTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ file: meetingTalkFileSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { count } = await supabaseAdmin
      .from("meeting_talk_templates")
      .select("id", { count: "exact", head: true })
      .eq("superintendent_id", userId);
    if ((count ?? 0) >= MAX_TEMPLATES) {
      return { ok: false as const, error: `Limite de ${MAX_TEMPLATES} modelos atingido.` };
    }
    const { data: row, error } = await supabaseAdmin
      .from("meeting_talk_templates")
      .insert({ superintendent_id: userId, name: data.file.name, congregation_id: null })
      .select("id").single();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Falha ao criar." };
    const newId = row.id;
    const f = data.file;
    if (f.midweek) {
      await supabaseAdmin.from("meeting_talk_template_midweek").insert({
        template_id: newId,
        chairman: f.midweek.chairman ?? null,
        closing_prayer: f.midweek.closing_prayer ?? null,
      });
    }
    if (f.weekend_themes?.length) {
      await supabaseAdmin.from("meeting_talk_template_weekend_themes").insert(
        f.weekend_themes.map((t, i) => ({ template_id: newId, title: t.title, sort_order: t.sort_order ?? i })),
      );
    }
    if (f.pioneer) {
      await supabaseAdmin.from("meeting_talk_template_pioneer").insert({
        template_id: newId,
        weekday: f.pioneer.weekday ?? null,
        meeting_time: f.pioneer.meeting_time || null,
        super_meeting_weekday: f.pioneer.super_meeting_weekday ?? null,
        super_meeting_time: f.pioneer.super_meeting_time || null,
        location: f.pioneer.location ?? null,
        opening_prayer: f.pioneer.opening_prayer ?? null,
        closing_prayer: f.pioneer.closing_prayer ?? null,
      });
    }
    if (f.elders) {
      await supabaseAdmin.from("meeting_talk_template_elders").insert({
        template_id: newId,
        opening_prayer: f.elders.opening_prayer ?? null,
        closing_prayer: f.elders.closing_prayer ?? null,
      });
    }
    return { ok: true as const, id: newId };
  });
