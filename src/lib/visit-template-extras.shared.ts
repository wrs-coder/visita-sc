export interface VisitTemplateExtras {
  field: { observations: string | null } | null;
  midweek: { observations: string | null; final_song: string | null } | null;
  weekend: {
    opening_song: string | null;
    closing_song: string | null;
    observations: string | null;
  } | null;
  pioneer: { observations: string | null; weekday: number | null; meeting_time: string | null } | null;
  elders: { observations: string | null; weekday: number | null; meeting_time: string | null } | null;
  program: { general_observations: string | null } | null;
}

export const EMPTY_VISIT_TEMPLATE_EXTRAS: VisitTemplateExtras = {
  field: null,
  midweek: null,
  weekend: null,
  pioneer: null,
  elders: null,
  program: null,
};
