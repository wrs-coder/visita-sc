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
  icon: "lock" | "calendar" | "week" | "book" | "event" | "report" | "faq";
  /** Tela real aberta pelo botão "Abrir esta tela". */
  route: string;
  /** Miniatura desenhada com as peças reais do app. */
  preview?: "circuit-pills" | "pin-card" | "visit-pills" | "reading-pills" | "event-pills" | "backup-card";
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
  {
    id: "visit-week",
    title: "Semana da visita",
    icon: "week",
    route: "/programa-visita",
    preview: "visit-pills",
    keywords: ["anciaos", "estudos", "revisitas", "reunioes", "refeicoes", "transporte", "checklist", "programa"],
    steps: [
      { before: "No menu lateral, na seção ", labelKey: "sidebar.sectionVisita", after: ", abra o programa da visita." },
      { before: "No topo ficam as pílulas “Anciãos”, “Estudos e Revisitas”, “Reuniões”, “Refeições” e “Transporte”. Toque em uma para trocar de parte." },
      { before: "O app volta sempre para a última pílula que você abriu." },
      { before: "Os quadros podem ser recolhidos e expandidos; o que você digitou não se perde." },
      { before: "No menu lateral, ", labelKey: "sidebar.weekSummary", after: " mostra a semana inteira em uma tela." },
    ],
  },
  {
    id: "outlines-bible",
    title: "Esboços e Bíblia",
    icon: "book",
    route: "/estudo-pessoal",
    preview: "reading-pills",
    keywords: ["esboco", "discurso", "biblia", "leitura", "pontos altos", "anotacoes", "familia", "reuniao", "dias", "word", "docx"],
    steps: [
      { before: "No menu lateral, abra ", labelKey: "sidebar.studyNotes", after: "." },
      { before: "Na aba ", labelKey: "studyPersonal.bible", after: ", escolha a leitura: “Pessoal”, “Família” ou “Reunião”. Cada uma tem seu próprio progresso." },
      { before: "Em “Meta de leitura”, a opção “Dias” define livros para cada dia da semana. Use “Marcar capítulos lidos” para atualizar a programação." },
      { before: "Toque em “Continuar” para abrir o próximo capítulo não lido." },
      { before: "Marque pontos altos “Para comentar” e abra o “Modo comentário” na reunião." },
      { before: "Os esboços de discurso ficam em ", labelKey: "sidebar.personalOutlines", after: ", com importação e exportação em Word." },
      { before: "A Bíblia usada é só a que você importou (EPUB). Sem ela, a leitura não mostra o texto." },
    ],
  },
  {
    id: "big-events",
    title: "Grandes Eventos",
    icon: "event",
    route: "/congregacoes",
    preview: "event-pills",
    keywords: ["assembleia", "congresso", "orador", "convite", "carta", "pdf", "word", "link", "pin", "rtf"],
    steps: [
      { before: "Abra a área do circuito, toque na pílula ", labelKey: "circuit.pillCircuit", after: " e desça até " },
      { before: "Seção ", labelKey: "circuit.sectionEvents", after: ": use “Novo evento” ou “Importar programa” (arquivo .rtf, .etim, .json ou .csv)." },
      { before: "Cada orador recebe um link curto para confirmar a designação." },
      { before: "Na pílula “Modelos de carta” você prepara o papel timbrado; cada evento escolhe o seu modelo." },
      { before: "Toque em “Exportar”: o Word traz a lista das designações para conferir; o PDF gera uma carta por designação, com link ativo." },
      { before: "Se a carta não couber em uma página, o app reduz espaços e fonte e avisa quando não for possível." },
    ],
  },
  {
    id: "reports-backup",
    title: "Relatórios e backup",
    icon: "report",
    route: "/perfil",
    preview: "backup-card",
    keywords: ["relatorio", "pdf", "imprimir", "backup", "restaurar", "zip", "copia"],
    steps: [
      { before: "No Início, no cartão da visita, abra o menu de ações e toque em ", labelKey: "dashboard.executiveReport", after: "." },
      { before: "No relatório, use ", labelKey: "report.print", after: " para guardar em PDF." },
      { before: "Para backup, abra ", labelKey: "sidebar.myProfile", after: " e procure " },
      { before: "O cartão ", labelKey: "profile.backupSection", after: "." },
      { before: "Toque em ", labelKey: "profile.generateBackup", after: " para salvar um arquivo .zip com todos os seus dados." },
      { before: "Para recuperar em outro aparelho, use ", labelKey: "profile.restoreBackup", after: "." },
    ],
  },
  {
    id: "faq",
    title: "Perguntas frequentes",
    icon: "faq",
    route: "/dashboard",
    keywords: ["duvida", "offline", "internet", "sincronizar", "atualizar", "perdi"],
    steps: [
      { before: "Funciona sem internet? Sim. Tudo é salvo no aparelho e enviado quando a conexão voltar." },
      { before: "Salvei sem internet, perdi? Não. A mensagem “salvo no aparelho” indica que está guardado e será sincronizado depois." },
      { before: "Troquei de celular: entre com sua conta; para dados só do aparelho, use ", labelKey: "profile.restoreBackup", after: "." },
      { before: "Como procurar uma tela? Nesta Ajuda, toque em “Ir para uma tela ou ação”." },
      { before: "Os anciãos veem tudo? Não. Eles só veem a visita da própria congregação." },
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
