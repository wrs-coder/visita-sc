// Novidades separadas por versão. A primeira é a atual; as demais formam o histórico.
// A cada release: acrescentar uma nova entrada no topo e atualizar RELEASE_NOTES_VERSION.
/** A quem a novidade afeta. Ausente = todos. */
export type ReleaseAudience = "super" | "elder" | "wife" | "all";
export type ReleaseSection = { title: string; items: string[]; audience?: ReleaseAudience[] };
export type ReleaseEntry = { version: string; subtitle?: string; sections: ReleaseSection[] };

// Novidades da 5.0.4 (histórico).
const OLD_SECTIONS: ReleaseSection[] = [
  {
    title: "Esboços e anotações com mais espaço",
    items: [
      "Ao escrever, a barra do topo vira uma linha única com voltar, modo, salvar e mais opções.",
      "Ferramentas de texto recolhidas: abra só quando precisar; o app lembra sua escolha.",
      "Oração, Território e Ajudantes começam recolhidos, com botão rápido para abrir.",
      "A palavra \"Conteúdo\" saiu: o campo mostra \"Escreva aqui…\" até você começar.",
      "Botão 📖 flutuante com os versículos encontrados; arraste para onde preferir.",
    ],
  },
  {
    title: "Espaço da esposa",
    items: [
      "Anotações e Estudo pessoal com tela limpa, linha única no topo e botão 📖.",
      "Pastas em pílulas deslizantes, busca na lupa e datas como \"há 2 dias\".",
      "Leitura da Bíblia com pílula \"Pontos altos\" e progresso compacto.",
      "Configurações reorganizadas, com o backup em destaque.",
    ],
  },
  {
    title: "Circuito e idioma",
    items: [
      "O app abre no idioma do celular (Português, Inglês ou Espanhol); a escolha feita no app sempre vale.",
      "Aba do circuito mais limpa: o card repetido com o nome do circuito saiu.",
      "Pílula \"Circuito\" com duas partes: Congregações e Anciãos do circuito.",
      "Calendário do mês no estilo agenda, com visitas e eventos.",
      "Notas privadas numa linha só: congregação, + Novo e lupa.",
    ],
  },
  {
    title: "Corpo de Anciãos",
    items: [
      "Aba Anciãos em pílulas: Perguntas do SC, Pastoreio, Encorajamento, Recomendações e Assuntos locais.",
      "Checklist agora fica dentro da aba Anciãos, em Perguntas do SC.",
      "Pastoreio com pílulas de dia e horário: um dia por vez e aviso de quantos pastoreios restam.",
      "Botão para trocar o dia ou horário do pastoreio sem perder o que foi escrito.",
      "Card \"Acesso Restrito\" recolhido e mais discreto.",
    ],
  },
  {
    title: "Programa da visita",
    items: [
      "Transporte com pílulas de dia: veja só os carros daquele dia.",
      "Resumo da semana liberado para os anciãos da congregação, só para leitura.",
      "\"Programação geral\" no Resumo da semana: escolha as partes do PDF e inclua as observações do superintendente.",
      "Botões de relatório nas abas agora são um ícone discreto.",
      "Sem internet, os anciãos abrem direto no Painel com todas as informações.",
    ],
  },
  {
    title: "Modelos e pacotes",
    items: [
      "Pacotes de modelos guardados na nuvem: não se perdem ao trocar de celular.",
      "Alterações feitas sem internet sobem sozinhas quando a conexão volta.",
      "Terça e Segunda opcionais em cada seção, com aviso amigável ao ocultar.",
      "Aba Reuniões com pílulas e botão \"Salvar modelo\" embaixo.",
    ],
  },
  {
    title: "Discursos e cronômetro",
    items: [
      "Tempo por tópico: horário previsto em cada parte do discurso.",
      "Toque na pílula para concluir o tópico e ver se está adiantado ou atrasado.",
      "Pílula de tempo acompanha a rolagem, com tamanho, opacidade e posição ajustáveis.",
      "Botão do relógio transforma subtítulos com tempo, como \"(4 min)\", em tópicos.",
      "Aviso de esquecimento mostra o tempo escolhido e permite descontar o tempo já falado.",
      "Cronômetro esquecido ligado pausa sozinho; opção de som nos avisos.",
    ],
  },
  {
    title: "Esboços",
    items: [
      "Rascunho salvo automaticamente, com opção de recuperar depois.",
      "Botão Sincronizar nos detalhes da tela cheia.",
    ],
  },
  {
    title: "Painel",
    items: [
      "Aba Agenda com faixa de dias para ver qualquer dia da semana.",
      "Recados da esposa agora num ícone no topo, com contador.",
      "Botão voltar do celular navega entre telas em vez de fechar o app.",
    ],
  },
  {
    title: "Sem internet",
    items: [
      "Dados guardados por 30 dias no aparelho, sem telas vazias.",
      "Aviso da idade dos dados e das alterações aguardando envio.",
      "Lista \"Não enviados\" com Tentar novamente ou Descartar.",
      "Alterações aparecem na tela na hora.",
      "Aviso quando o acesso sem internet (PIN) estiver perto de vencer.",
      "Fim do falso aviso de \"Sessão expirada\".",
    ],
  },
];

export const RELEASE_NOTES_VERSION = "5.3.0";

/**
 * Aviso automático "O que há de novo" nesta versão: desligado a pedido.
 * O texto continua em Configurações → Ver novidades e no aviso de atualização.
 * Troque para true para voltar a abrir sozinho na primeira abertura após atualizar.
 */
export const WHATS_NEW_AUTO_SHOW = true;

export const RELEASE_HISTORY: ReleaseEntry[] = [
  {
    version: "5.3.0",
    sections: [
      {
        title: "Esboços na nuvem, um por um", audience: ["super"],
        items: [
          "No celular, arraste o esboço para a esquerda (verde) para enviar e para a direita (azul) para receber.",
          "Os três pontinhos de cada esboço e de cada pasta trazem \"Enviar para a nuvem\" e \"Receber da nuvem\".",
          "Receber agora traz esboços e subpastas novos criados no outro aparelho, sem duplicar.",
        ],
      },
      {
        title: "Aviso de pendências no menu", audience: ["super", "elder"],
        items: [
          "O balão amarelo (pendências, sem internet) saiu do topo e fica no menu lateral, ao lado do modo escuro.",
          "Um pontinho no botão do menu avisa quando há algo para enviar.",
        ],
      },
      {
        title: "Lembretes e painel offline", audience: ["super"],
        items: [
          "Cada bloco dos Lembretes pode ser recolhido ou expandido.",
          "\"Pronto para usar sem internet\" agora confere também o Painel da visita (reuniões e pastoreios).",
        ],
      },
    ],
  },
  {
    version: "5.2.0",
    sections: [
      {
        title: "Exportar o itinerário", audience: ["super"],
        items: [
          "Botão \"Exportar\" no Itinerário: PDF em Lista ou Calendário (6 meses numa folha), Word e Excel.",
          "Escolha 1º Semestre (set–fev), 2º Semestre (mar–ago) ou um período personalizado.",
          "Semanas sem visita aparecem com a observação (ex.: \"Semana de pioneiro - Assembleia\") e visitas SCS ganham a marca \"SCS\".",
          "Semanas sem visita agora podem ser editadas no lápis.",
          "\"+ Nova visita\" reúne Criar nova e Importar de arquivo.",
        ],
      },
      {
        title: "Congregações: importar e exportar", audience: ["super"],
        items: [
          "\"+ Nova\" → Importar de arquivo (CSV do JW.org, Word ou Excel), com revisão antes de criar.",
          "Códigos de acesso simples gerados na hora e número da congregação opcional.",
          "Nomes parecidos são reconhecidos: substitua só o nome, o código continua.",
          "Exportar gera um Word com todas as congregações e códigos.",
        ],
      },
      {
        title: "Contato do substituto (Visita SCS)", audience: ["super", "elder"],
        items: [
          "Telefone em qualquer formato, inclusive de outros países, e e-mail do JW Hub opcional.",
          "Os anciãos veem no painel com quem falar sobre a programação da visita, com toque para ligar ou enviar e-mail.",
        ],
      },
      {
        title: "Leitor da Bíblia renovado", audience: ["all"],
        items: [
          "Botão Aa🔊: tamanho e tipo de letra, cor de fundo, brilho, espaço entre linhas e ouvir o capítulo em áudio.",
          "\"✎ Ponto alto\" e \"Lido\" no topo; nomes longos de livros aparecem abreviados.",
          "\"Lido\" começa como círculo vazio e fica verde com ✓ ao marcar, para não confundir.",
          "Na leitura por dia, cada livro mostra em que dia da semana será lido.",
        ],
      },
      {
        title: "Espaço da esposa", audience: ["super", "wife"],
        items: [
          "O superintendente pode escrever o nome da esposa no Perfil, e ela é recebida pelo nome.",
        ],
      },
    ],
  },
  {
    version: "5.1.0",
    sections: [
      {
        title: "Textos bíblicos com um toque", audience: ["all"],
        items: [
          "Referências em azul abrem a Bíblia numa janela, sem sair da tela.",
          "Vale em Pontos altos, Notas Privadas, notas do JW Library, Para comentar e Modo comentário.",
        ],
      },
      {
        title: "Agenda do painel mais completa", audience: ["super", "elder"],
        items: [
          "Temas dos dois discursos do fim de semana, presidente, orações e território.",
          "Botão \"Mais detalhes\" para expandir e recolher as informações.",
          "Termos como \"sick\" ou \"grupo_de_campo\" agora aparecem em português.",
        ],
      },
      {
        title: "Cartas de Grandes Eventos", audience: ["super"],
        items: [
          "Cores da carta configuráveis: título, caixa da designação e informações.",
          "Grupos do modelo com expandir e recolher.",
          "No Word, uma linha separa cada convite.",
        ],
      },
      {
        title: "Leitura da Bíblia e lembretes", audience: ["all"],
        items: [
          "Lembrete com horário para a Leitura pessoal e a Leitura em família.",
          "Aviso vermelho quando a leitura do dia ainda não foi feita.",
          "Antecedência livre: minutos, horas, dias ou semanas.",
          "Leitura da Reunião: agora dá para digitar o capítulo.",
        ],
      },
      {
        title: "Ajuda e novidades por perfil", audience: ["all"],
        items: [
          "Botão de Ajuda no topo da tela.",
          "Ajuda própria para o Corpo de Anciãos.",
          "Cada novidade mostra a quem se aplica: SC, Anciãos, Esposa ou Todos.",
        ],
      },
      {
        title: "Tela e rolagem", audience: ["all"],
        items: [
          "Todas as telas e o menu lateral rolam além da última linha; nada fica sob a barra do Android.",
        ],
      },
    ],
  },
  {
    version: "5.0.9",
    subtitle: "Edição especial — reúne as novidades das versões 5.0.5 a 5.0.9.",
    sections: [
      {
        title: "Painel com mais espaço", audience: ["super", "elder"],
        items: [
          "O cabeçalho some ao rolar o painel para baixo e volta ao rolar para cima, como no iOS e na One UI.",
          "Perto do topo, ao digitar ou ao trocar de tela, ele fica sempre visível.",
        ],
      },
      {
        title: "Grandes Eventos do Circuito", audience: ["super"],
        items: [
          "Crie o evento, as partes e os oradores na pílula Circuito.",
          "Escolha um link com PIN para todos ou um link pessoal para cada orador.",
          "Importe o programa do .etim ou do Circuito Manager (.json e .csv), também em celulares que mostram o arquivo como \".bin\".",
        ],
      },
      {
        title: "Importações", audience: ["super"],
        items: [
          "Itinerário importado de arquivos .ics e .csv, com revisão antes de salvar.",
          "Notas e destaques do backup do JW Library em uma lista separada.",
          "Backups, modelos, DOCX e JSON também aceitos quando o celular os marca como \".bin\".",
        ],
      },
      {
        title: "Estudo e Anotações", audience: ["super"],
        items: [
          "Leitura da Bíblia, Pesquisas e Anotações reunidas em uma tela.",
          "Na leitura, \"Ponto alto\" e \"Concluído\" ficam no topo, ao lado do capítulo.",
          "O destaque não abre mais por acidente ao rolar o texto.",
        ],
      },
      {
        title: "Tela e uso diário", audience: ["all"],
        items: [
          "Painel com margens menores e cabeçalho que se esconde ao rolar para baixo.",
          "Botões sempre longe da barra do celular.",
          "Tela cheia na leitura, no esboço e no editor: puxe do topo para ver a barra do celular. Desligue em Perfil, em \"Sobre este app\".",
        ],
      },
      {
        title: "Salvar e exportar", audience: ["super", "wife"],
        items: [
          "Ao salvar um esboço sem internet, aparece \"Salvo no aparelho\", e não mais \"Erro\".",
          "Arquivos grandes são exportados sem falhar.",
          "Avisos claros quando falta espaço no aparelho.",
        ],
      },
      {
        title: "Termos de Uso", audience: ["all"],
        items: [
          "Texto novo e mais claro, com aceite também para quem entra por código de convite.",
        ],
      },
    ],
  },
  {
    version: "5.0.4",
    sections: OLD_SECTIONS,
  },
];

/** Novidades da versão atual (mantido para o aviso de atualização e o endpoint). */
export const RELEASE_NOTES: ReleaseSection[] = RELEASE_HISTORY[0].sections;

export const AUDIENCE_LABEL: Record<ReleaseAudience, string> = {
  super: "SC",
  elder: "Anciãos",
  wife: "Esposa",
  all: "Todos",
};

export function sectionAudience(s: ReleaseSection): ReleaseAudience[] {
  return s.audience && s.audience.length ? s.audience : ["all"];
}

/** Separa as seções do perfil atual (primeiro) das de outros perfis. */
export function splitByAudience(
  sections: ReleaseSection[],
  viewer: ReleaseAudience | null,
): { mine: ReleaseSection[]; others: ReleaseSection[] } {
  if (!viewer || viewer === "all") return { mine: sections, others: [] };
  const mine: ReleaseSection[] = [];
  const others: ReleaseSection[] = [];
  for (const s of sections) {
    const a = sectionAudience(s);
    (a.includes("all") || a.includes(viewer) ? mine : others).push(s);
  }
  return { mine, others };
}
