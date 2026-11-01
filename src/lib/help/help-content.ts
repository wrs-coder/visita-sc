// Conteúdo da tela de Ajuda. Cada passo cita rótulos reais do app pela chave
// de tradução (labelKey), então o texto acompanha o nome do botão na tela.
// O teste help-content.test.ts garante que rotas e chaves existem.

export type HelpStep = {
  /** Texto antes do rótulo. */
  before: string;
  /** Chave de tradução do rótulo real exibido no app (entre aspas). */
  labelKey?: string;
  /** Texto depois do rótulo. */
  after?: string;
};

export type HelpTopic = {
  id: string;
  title: string;
  icon: "lock" | "calendar";
  /** Tela real aberta pelo botão "Abrir esta tela". */
  route: string;
  /** Miniatura desenhada com as peças reais do app. */
  preview?: "circuit-pills" | "pin-card";
  steps: HelpStep[];
  /** Palavras extras para a busca. */
  keywords?: string[];
};

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: "security",
    title: "Entrada e segurança",
    icon: "lock",
    route: "/perfil",
    preview: "pin-card",
    keywords: ["pin", "digital", "biometria", "offline", "sem internet", "senha"],
    steps: [
      { before: "Abra o menu lateral e toque em ", labelKey: "sidebar.myProfile", after: "." },
      { before: "Toque na aba ", labelKey: "profile.tabFeatures", after: "." },
      { before: "No cartão ", labelKey: "offlinePin.manageTitle", after: ", toque em “Criar PIN” (é preciso estar com internet nessa primeira vez)." },
      { before: "Digite e repita o PIN de 6 dígitos. Sua senha não fica guardada no aparelho." },
      { before: "Para entrar mais rápido, ative ", labelKey: "offlinePin.useBiometric", after: ". O PIN continua valendo." },
      { before: "Sem internet, a tela de entrada mostra ", labelKey: "offlinePin.title", after: ": use o PIN ou a digital." },
      { before: "O acesso sem internet vale por 30 dias. Cada entrada com internet renova o prazo." },
    ],
  },
  {
    id: "circuit",
    title: "Circuito e visitas",
    icon: "calendar",
    route: "/configuracoes",
    preview: "circuit-pills",
    keywords: ["itinerario", "visita", "congregacao", "calendario", "importar", "ics", "csv"],
    steps: [
      { before: "No topo da área do circuito ficam as pílulas ", labelKey: "sidebar.itinerary", after: " e “Circuito”." },
      { before: "Em ", labelKey: "sidebar.itinerary", after: ", toque em “Nova visita” para cadastrar a semana de uma congregação." },
      { before: "Para trazer o itinerário de outro aplicativo, toque em “Importar” e escolha um arquivo .ics ou .csv. Você revisa tudo antes de salvar." },
      { before: "Na pílula “Circuito” ficam as congregações, os anciãos do circuito e os Grandes Eventos." },
      { before: "O ícone de calendário, ao lado do nome do circuito, abre o mês inteiro." },
    ],
  },
];

export function normalizeHelp(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Filtra temas pelo título, passos (já traduzidos) e palavras-chave. */
export function searchHelp(
  topics: HelpTopic[],
  query: string,
  translate: (key: string) => string,
): HelpTopic[] {
  const q = normalizeHelp(query);
  if (!q) return topics;
  return topics.filter((tp) => {
    const hay = [
      tp.title,
      ...(tp.keywords ?? []),
      ...tp.steps.map((s) => `${s.before} ${s.labelKey ? translate(s.labelKey) : ""} ${s.after ?? ""}`),
    ].join(" ");
    return normalizeHelp(hay).includes(q);
  });
}

/** Evento que abre a busca geral (telas e ações) a partir da tela de Ajuda. */
export const OPEN_PALETTE_EVENT = "visitasc:open-command-palette";
