// Onda 7.9 — Anúncio acessível de mudança de rota.
// Componente invisível visualmente, lido por leitores de tela (NVDA, VoiceOver,
// TalkBack) sempre que o pathname muda. Resolve a perda de contexto típica de
// SPAs onde a navegação não recarrega o <title> de forma audível.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const ROUTE_LABELS: Record<string, string> = {
  "/": "sidebar.home",
  "/dashboard": "sidebar.home",
  "/cronograma": "sidebar.schedule",
  "/configuracoes": "sidebar.itinerary",
  "/congregacoes": "sidebar.congregations",
  "/consideracoes-campo": "sidebar.personalOutlines",
  "/notas": "sidebar.privateNotes",
  "/lixeira": "sidebar.trash",
  "/resumo-semana": "sidebar.weekSummary",
  "/comunicacao-casal": "sidebar.coupleMessages",
  "/programa-ancioes": "sidebar.elderProgram",
  "/escala": "sidebar.fieldStudies",
  "/reunioes-discursos": "sidebar.meetingsTalks",
  "/refeicoes": "sidebar.meals",
  "/transporte": "sidebar.transport",
  "/checklist": "sidebar.checklist",
  "/modelos": "sidebar.scheduleTemplates",
  "/checklist-modelos": "sidebar.checklistTemplates",
  "/modelo-reunioes-de-campo": "sidebar.fieldMeetingTemplate",
  "/modelo-reunioes-discursos": "sidebar.meetingTalkTemplates",
  "/modelo-programacao-ancioes": "sidebar.elderProgramTemplate",
  "/perfil": "sidebar.myProfile",
};

export function RouteAnnouncer({ pathname }: { pathname: string }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");

  useEffect(() => {
    const key = ROUTE_LABELS[pathname];
    const name = key ? t(key) : (pathname === "/" ? "" : pathname.replace(/^\//, ""));
    if (!name) return;
    // Pequeno delay para garantir que o leitor de tela perceba a mudança
    // depois da transição visual de 120ms.
    const id = window.setTimeout(() => {
      setMessage(t("a11y.pageAnnounce", { defaultValue: "{{name}} carregado", name }));
    }, 180);
    return () => window.clearTimeout(id);
  }, [pathname, t]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
