/**
 * Nome de cada tela mostrado na barra do topo (celular) ou na barra fina
 * do conteúdo (tablet/computador). O <h1> da tela continua só para
 * leitores de tela. Rotas sem título (Início etc.) mostram o topo de sempre.
 */
export const PAGE_TITLE_KEYS: Record<string, string> = {
  "/notas": "notes.title",
  "/estudo-pessoal": "sidebar.studyNotes",
  "/perfil": "profile.title",
  "/ajuda": "pageTitles.help",
  "/lixeira": "pageTitles.trash",
  "/refeicoes": "meals.title",
  "/transporte": "transport.title",
  "/escala": "fieldStudies.title",
  "/comunicacao-casal": "couple.title",
  "/reunioes-discursos": "meetingsTalks.title",
  "/resumo-semana": "sidebar.weekSummary",
  "/relatorio": "report.title",
  "/programa-ancioes": "pageTitles.elderBody",
  "/pacotes-visita": "pageTitles.visitPackages",
  "/congregacoes": "congregations.title",
  "/configuracoes": "itinerary.title",
  "/cronograma": "schedule.title",
  "/modelos": "templates.program.title",
  "/modelo-reunioes-de-campo": "templates.field.title",
  "/modelo-reunioes-discursos": "templates.meetingTalk.title",
  "/modelo-programacao-ancioes": "pageTitles.elderTemplates",
  "/checklist-modelos": "templates.checklist.title",
};

export function pageTitleKey(pathname: string): string | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (PAGE_TITLE_KEYS[p]) return PAGE_TITLE_KEYS[p];
  const first = "/" + (p.split("/")[1] ?? "");
  return first === "/relatorio" ? PAGE_TITLE_KEYS["/relatorio"] : null;
}
