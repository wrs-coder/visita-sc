// Pré-carga de TODAS as tabelas relevantes para o usuário ativo, gravando o
// resultado no TanStack Query cache (que é persistido em IndexedDB pelo
// query-persister). 100% read-only — sem mutações, sem triggers, sem mudanças
// em updated_at/sync_status. Falhas individuais não abortam o fluxo.
//
// Onda 7.11 — Missão 05B (warm-up incremental):
// Antes de baixar cada passo, sondamos `max(updated_at)` da(s) tabela(s)
// envolvida(s). Se o valor bate com o armazenado em
// `visita-sc:last-warmup`, o passo é considerado "fresco" e pulado por
// completo — o cache (React Query + IndexedDB) preservado supre a tela.
// Se houver mudança, fazemos o fetch completo do passo (mais simples e
// seguro do que mesclar `gt(updated_at)` em relações compostas como
// `.in('visit_id', visitIds)`), e atualizamos o `max` armazenado.
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { prefetchRouteShells } from "@/lib/offline-shells";

export const OFFLINE_READY_KEY = "visita-sc:offline-ready";
export const LAST_WARMUP_KEY = "visita-sc:last-warmup";

export type ProgressEvent = {
  step: number;
  total: number;
  label: string;
  errors: number;
};

export type PrefetchOpts = {
  queryClient: QueryClient;
  userId: string;
  congregationId: string | null;
  role: "superintendent" | "elder" | null;
  signal?: AbortSignal;
  onProgress?: (e: ProgressEvent) => void;
  t?: (key: string) => string;
  /** Força refetch completo, ignorando o cache de freshness. */
  force?: boolean;
};

type WarmupState = {
  at: number;
  congId: string | null;
  userId: string | null;
  tables: Record<string, string | null>;
};

function readWarmupState(): WarmupState {
  if (typeof window === "undefined") return { at: 0, congId: null, userId: null, tables: {} };
  try {
    const raw = localStorage.getItem(LAST_WARMUP_KEY);
    if (!raw) return { at: 0, congId: null, userId: null, tables: {} };
    const parsed = JSON.parse(raw) as Partial<WarmupState>;
    return {
      at: parsed.at ?? 0,
      congId: parsed.congId ?? null,
      userId: parsed.userId ?? null,
      tables: parsed.tables ?? {},
    };
  } catch {
    return { at: 0, congId: null, userId: null, tables: {} };
  }
}

function writeWarmupState(s: WarmupState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_WARMUP_KEY, JSON.stringify(s));
  } catch {
    /* quota */
  }
}

export function getLastWarmupAt(): number | null {
  const s = readWarmupState();
  return s.at > 0 ? s.at : null;
}

export function clearWarmupState() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LAST_WARMUP_KEY);
  } catch {
    /* noop */
  }
}

async function probeMaxUpdatedAt(table: string): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = supabase.from(table as never);
    const { data, error } = await q
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : null;
    return (row?.updated_at as string | undefined) ?? null;
  } catch {
    return null;
  }
}

type StepFn = () => Promise<void>;
type Step = { label: string; tables: string[]; run: StepFn };

export async function prefetchAllForOffline(opts: PrefetchOpts): Promise<{
  completed: number;
  errors: number;
  skipped: number;
  aborted: boolean;
}> {
  const { queryClient, userId, congregationId, role, signal, onProgress, t, force } = opts;
  const tr = (k: string, fallback: string) => (t ? t(k) : fallback);

  // Se trocou de usuário ou congregação ativa, descarta o estado salvo.
  const stored = readWarmupState();
  const baseTables: Record<string, string | null> =
    stored.userId === userId && stored.congId === congregationId && !force
      ? { ...stored.tables }
      : {};
  const newMaxes: Record<string, string | null> = {};

  const set = (key: unknown[], data: unknown) => {
    try {
      queryClient.setQueryData(key, data);
    } catch (e) {
      console.warn("[offline-prefetch] setQueryData falhou", key, e);
    }
  };

  const fetchTable = async <T = unknown>(
    table: string,
    apply: (q: ReturnType<typeof supabase.from>) => unknown,
  ): Promise<T[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = apply(supabase.from(table as never));
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as T[];
  };

  const visitIds: string[] = [];
  const templateIds = {
    program: [] as string[],
    checklist: [] as string[],
    fieldMeeting: [] as string[],
    talk: [] as string[],
    elderProgram: [] as string[],
  };

  const steps: Step[] = [
    {
      label: tr("offline.step.profile", "Perfil"),
      tables: ["profiles"],
      run: async () => {
        const data = await fetchTable("profiles", (q) => q.select("*").eq("id", userId));
        set(["offline", "profile", userId], data[0] ?? null);
      },
    },
    {
      label: tr("offline.step.roles", "Permissões"),
      tables: ["user_roles"],
      run: async () => {
        const data = await fetchTable("user_roles", (q) => q.select("*").eq("user_id", userId));
        set(["offline", "user_roles", userId], data);
      },
    },
    {
      label: tr("offline.step.congregations", "Congregações"),
      tables: ["congregations"],
      run: async () => {
        const data = await fetchTable(
          "congregations",
          (q) =>
            role === "superintendent"
              ? q.select("*").eq("superintendent_id", userId)
              : q.select("*"),
        );
        set(["offline", "congregations", userId], data);
      },
    },
    {
      label: tr("offline.step.visits", "Visitas"),
      tables: ["visits"],
      run: async () => {
        const data = await fetchTable<{ id: string }>("visits", (q) => q.select("*"));
        visitIds.push(...data.map((v) => v.id));
        set(["offline", "visits", userId], data);
      },
    },
    {
      label: tr("offline.step.schedule", "Cronograma"),
      tables: ["schedule_events"],
      run: async () => {
        if (visitIds.length === 0) return;
        const data = await fetchTable("schedule_events", (q) =>
          q.select("*").in("visit_id", visitIds),
        );
        set(["offline", "schedule_events", userId], data);
      },
    },
    {
      label: tr("offline.step.meals", "Refeições"),
      tables: ["meals", "meal_day_notes"],
      run: async () => {
        if (visitIds.length === 0) return;
        const meals = await fetchTable("meals", (q) => q.select("*").in("visit_id", visitIds));
        const notes = await fetchTable("meal_day_notes", (q) =>
          q.select("*").in("visit_id", visitIds),
        );
        set(["offline", "meals", userId], meals);
        set(["offline", "meal_day_notes", userId], notes);
      },
    },
    {
      label: tr("offline.step.field", "Estudos e revisitas"),
      tables: ["field_assignments", "field_meetings"],
      run: async () => {
        if (visitIds.length === 0) return;
        const fa = await fetchTable("field_assignments", (q) =>
          q.select("*").in("visit_id", visitIds),
        );
        const fm = await fetchTable("field_meetings", (q) =>
          q.select("*").in("visit_id", visitIds),
        );
        set(["offline", "field_assignments", userId], fa);
        set(["offline", "field_meetings", userId], fm);
      },
    },
    {
      label: tr("offline.step.transport", "Transporte"),
      tables: ["transport_schedule"],
      run: async () => {
        if (visitIds.length === 0) return;
        const data = await fetchTable("transport_schedule", (q) =>
          q.select("*").in("visit_id", visitIds),
        );
        set(["offline", "transport_schedule", userId], data);
      },
    },
    {
      label: tr("offline.step.checklist", "Checklist"),
      tables: ["checklist_items"],
      run: async () => {
        if (visitIds.length === 0) return;
        const data = await fetchTable("checklist_items", (q) =>
          q.select("*").in("visit_id", visitIds),
        );
        set(["offline", "checklist_items", userId], data);
      },
    },
    {
      label: tr("offline.step.meetings", "Reuniões e discursos"),
      tables: [
        "midweek_meetings",
        "weekend_meetings",
        "pioneer_meetings",
        "elders_servants_meetings",
      ],
      run: async () => {
        if (visitIds.length === 0) return;
        const [midweek, weekend, pioneer, elders] = await Promise.all([
          fetchTable("midweek_meetings", (q) => q.select("*").in("visit_id", visitIds)),
          fetchTable("weekend_meetings", (q) => q.select("*").in("visit_id", visitIds)),
          fetchTable("pioneer_meetings", (q) => q.select("*").in("visit_id", visitIds)),
          fetchTable("elders_servants_meetings", (q) => q.select("*").in("visit_id", visitIds)),
        ]);
        set(["offline", "midweek_meetings", userId], midweek);
        set(["offline", "weekend_meetings", userId], weekend);
        set(["offline", "pioneer_meetings", userId], pioneer);
        set(["offline", "elders_servants_meetings", userId], elders);
      },
    },
    {
      label: tr("offline.step.circuit", "Eventos do circuito"),
      tables: ["circuit_schedule_events"],
      run: async () => {
        const data = await fetchTable("circuit_schedule_events", (q) => q.select("*"));
        set(["offline", "circuit_schedule_events", userId], data);
      },
    },
    {
      label: tr("offline.step.templatesProgram", "Modelos de programação"),
      tables: ["program_templates", "program_template_items"],
      run: async () => {
        const tpls = await fetchTable<{ id: string }>("program_templates", (q) => q.select("*"));
        templateIds.program.push(...tpls.map((x) => x.id));
        set(["offline", "program_templates", userId], tpls);
        if (templateIds.program.length) {
          const items = await fetchTable("program_template_items", (q) =>
            q.select("*").in("template_id", templateIds.program),
          );
          set(["offline", "program_template_items", userId], items);
        }
      },
    },
    {
      label: tr("offline.step.templatesChecklist", "Modelos de checklist"),
      tables: ["checklist_templates", "checklist_template_items"],
      run: async () => {
        const tpls = await fetchTable<{ id: string }>("checklist_templates", (q) => q.select("*"));
        templateIds.checklist.push(...tpls.map((x) => x.id));
        set(["offline", "checklist_templates", userId], tpls);
        if (templateIds.checklist.length) {
          const items = await fetchTable("checklist_template_items", (q) =>
            q.select("*").in("template_id", templateIds.checklist),
          );
          set(["offline", "checklist_template_items", userId], items);
        }
      },
    },
    {
      label: tr("offline.step.templatesFieldMeeting", "Modelos de reuniões de campo"),
      tables: ["field_meeting_templates", "field_meeting_template_items"],
      run: async () => {
        const tpls = await fetchTable<{ id: string }>("field_meeting_templates", (q) =>
          q.select("*"),
        );
        templateIds.fieldMeeting.push(...tpls.map((x) => x.id));
        set(["offline", "field_meeting_templates", userId], tpls);
        if (templateIds.fieldMeeting.length) {
          const items = await fetchTable("field_meeting_template_items", (q) =>
            q.select("*").in("template_id", templateIds.fieldMeeting),
          );
          set(["offline", "field_meeting_template_items", userId], items);
        }
      },
    },
    {
      label: tr("offline.step.templatesTalk", "Modelos de reunião e discursos"),
      tables: [
        "meeting_talk_templates",
        "meeting_talk_template_midweek",
        "meeting_talk_template_pioneer",
        "meeting_talk_template_elders",
        "meeting_talk_template_weekend_themes",
      ],
      run: async () => {
        const tpls = await fetchTable<{ id: string }>("meeting_talk_templates", (q) =>
          q.select("*"),
        );
        templateIds.talk.push(...tpls.map((x) => x.id));
        set(["offline", "meeting_talk_templates", userId], tpls);
        if (templateIds.talk.length) {
          const [midweek, pioneer, elders, weekend] = await Promise.all([
            fetchTable("meeting_talk_template_midweek", (q) =>
              q.select("*").in("template_id", templateIds.talk),
            ),
            fetchTable("meeting_talk_template_pioneer", (q) =>
              q.select("*").in("template_id", templateIds.talk),
            ),
            fetchTable("meeting_talk_template_elders", (q) =>
              q.select("*").in("template_id", templateIds.talk),
            ),
            fetchTable("meeting_talk_template_weekend_themes", (q) =>
              q.select("*").in("template_id", templateIds.talk),
            ),
          ]);
          set(["offline", "meeting_talk_template_midweek", userId], midweek);
          set(["offline", "meeting_talk_template_pioneer", userId], pioneer);
          set(["offline", "meeting_talk_template_elders", userId], elders);
          set(["offline", "meeting_talk_template_weekend_themes", userId], weekend);
        }
      },
    },
    {
      label: tr("offline.step.talkThemes", "Temas de discurso"),
      tables: ["talk_themes"],
      run: async () => {
        const data = await fetchTable("talk_themes", (q) => q.select("*"));
        set(["offline", "talk_themes", userId], data);
      },
    },
    {
      label: tr("offline.step.notes", "Notas privadas"),
      tables: ["private_notes"],
      run: async () => {
        if (role !== "superintendent") return;
        const data = await fetchTable("private_notes", (q) =>
          q.select("*").eq("superintendent_id", userId),
        );
        set(["offline", "private_notes", userId], data);
      },
    },
    {
      label: tr("offline.step.personalOutlines", "Esboços pessoais"),
      tables: ["personal_outlines"],
      run: async () => {
        const data = await fetchTable("personal_outlines", (q) =>
          q.select("*").eq("user_id", userId),
        );
        set(["offline", "personal_outlines", userId], data);
      },
    },
    {
      label: tr("offline.step.coupleMessages", "Comunicação do casal"),
      tables: ["couple_messages"],
      run: async () => {
        if (role !== "superintendent") return;
        const data = await fetchTable("couple_messages", (q) =>
          q.select("*").eq("superintendent_id", userId),
        );
        set(["offline", "couple_messages", userId], data);
      },
    },
    {
      label: tr("offline.step.elderVisitData", "Conteúdo dos anciãos por visita"),
      tables: [
        "elder_encouragements",
        "elder_local_matters",
        "elder_pastoral_visits",
        "elder_recommendations",
        "visit_pending_updates",
        "elder_program_visit_sections",
        "elder_program_visit_slots",
      ],
      run: async () => {
        if (visitIds.length === 0) return;
        const [enc, local, pastoral, recs, pending, sections, slots] = await Promise.all([
          fetchTable("elder_encouragements", (q) => q.select("*").in("visit_id", visitIds)),
          fetchTable("elder_local_matters", (q) => q.select("*").in("visit_id", visitIds)),
          fetchTable("elder_pastoral_visits", (q) => q.select("*").in("visit_id", visitIds)),
          fetchTable("elder_recommendations", (q) => q.select("*").in("visit_id", visitIds)),
          fetchTable("visit_pending_updates", (q) => q.select("*").in("visit_id", visitIds)),
          fetchTable("elder_program_visit_sections", (q) => q.select("*").in("visit_id", visitIds)),
          fetchTable("elder_program_visit_slots", (q) => q.select("*").in("visit_id", visitIds)),
        ]);
        set(["offline", "elder_encouragements", userId], enc);
        set(["offline", "elder_local_matters", userId], local);
        set(["offline", "elder_pastoral_visits", userId], pastoral);
        set(["offline", "elder_recommendations", userId], recs);
        set(["offline", "visit_pending_updates", userId], pending);
        set(["offline", "elder_program_visit_sections", userId], sections);
        set(["offline", "elder_program_visit_slots", userId], slots);
      },
    },
    {
      label: tr("offline.step.elderProgramTemplates", "Modelos da programação dos anciãos"),
      tables: [
        "elder_program_templates",
        "elder_program_template_sections",
        "elder_program_template_slots",
        "elder_program_template_events",
      ],
      run: async () => {
        const tpls = await fetchTable<{ id: string }>("elder_program_templates", (q) =>
          q.select("*"),
        );
        templateIds.elderProgram.push(...tpls.map((x) => x.id));
        set(["offline", "elder_program_templates", userId], tpls);
        if (templateIds.elderProgram.length) {
          const [sections, slots, events] = await Promise.all([
            fetchTable("elder_program_template_sections", (q) =>
              q.select("*").in("template_id", templateIds.elderProgram),
            ),
            fetchTable("elder_program_template_slots", (q) =>
              q.select("*").in("template_id", templateIds.elderProgram),
            ),
            fetchTable("elder_program_template_events", (q) =>
              q.select("*").in("template_id", templateIds.elderProgram),
            ),
          ]);
          set(["offline", "elder_program_template_sections", userId], sections);
          set(["offline", "elder_program_template_slots", userId], slots);
          set(["offline", "elder_program_template_events", userId], events);
        }
      },
    },
    {
      label: tr("offline.step.shells", "Telas do aplicativo"),
      tables: [], // sem tabela; sempre executa (idempotente, cache do SW)
      run: async () => {
        await prefetchRouteShells({ signal });
      },
    },
  ];

  let completed = 0;
  let errors = 0;
  let skipped = 0;
  const total = steps.length;
  // Marca início para o usuário ver progresso imediato.
  onProgress?.({ step: 0, total, label: tr("offline.step.starting", "Iniciando…"), errors: 0 });

  for (const [i, step] of steps.entries()) {
    if (signal?.aborted) {
      return { completed, errors, skipped, aborted: true };
    }
    onProgress?.({ step: i, total, label: step.label, errors });
    try {
      // Sondagem incremental: se todas as tabelas envolvidas têm o mesmo
      // max(updated_at) que já registramos, o cache local já está atualizado
      // e pulamos o fetch completo deste passo.
      let isFresh = false;
      let probes: (string | null)[] = [];
      if (step.tables.length > 0 && !force) {
        probes = await Promise.all(step.tables.map(probeMaxUpdatedAt));
        // Só consideramos "fresco" quando temos baseline para TODAS as tabelas
        // e todas as sondas retornaram (probe!==null) e batem com o baseline.
        isFresh = probes.every((p, idx) => {
          const known = baseTables[step.tables[idx]];
          return p !== null && known != null && known === p;
        });
      }

      if (isFresh) {
        skipped++;
        // Garante que o estado salvo continua válido para esse passo.
        step.tables.forEach((tbl, idx) => {
          newMaxes[tbl] = probes[idx];
        });
      } else {
        await step.run();
        completed++;
        // Atualiza baseline com o max recém-sondado (ou re-sonda se não tinha).
        if (step.tables.length > 0) {
          const finalProbes =
            probes.length === step.tables.length
              ? probes
              : await Promise.all(step.tables.map(probeMaxUpdatedAt));
          step.tables.forEach((tbl, idx) => {
            newMaxes[tbl] = finalProbes[idx];
          });
        }
      }
    } catch (err) {
      errors++;
      console.warn(`[offline-prefetch] passo "${step.label}" falhou:`, err);
    }
    onProgress?.({ step: i + 1, total, label: step.label, errors });
    await new Promise((r) => setTimeout(r, 10));
  }

  // Marca timestamp do último warm-up (mesmo que parcial) e persiste o baseline.
  if ((completed > 0 || skipped > 0) && typeof window !== "undefined") {
    try {
      localStorage.setItem(OFFLINE_READY_KEY, String(Date.now()));
    } catch {
      /* quota */
    }
    writeWarmupState({
      at: Date.now(),
      congId: congregationId,
      userId,
      tables: { ...baseTables, ...newMaxes },
    });
  }
  try {
    await queryClient.getQueryCache().getAll();
  } catch {
    /* noop */
  }

  console.info(
    `[offline-prefetch] warm-up concluído — baixados: ${completed} • pulados (cache fresco): ${skipped} • erros: ${errors}`,
  );

  return { completed, errors, skipped, aborted: false };
}

export function getOfflineReadyAt(): number | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(OFFLINE_READY_KEY);
  return v ? Number(v) : null;
}
