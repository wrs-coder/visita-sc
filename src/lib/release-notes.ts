// Novidades separadas por versão. A primeira é a atual; as demais formam o histórico.
// A cada release: acrescentar uma nova entrada no topo e atualizar RELEASE_NOTES_VERSION.
export type ReleaseSection = { title: string; items: string[] };
export type ReleaseEntry = { version: string; sections: ReleaseSection[] };

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

export const RELEASE_NOTES_VERSION = "5.0.6";

export const RELEASE_HISTORY: ReleaseEntry[] = [
  {
    version: "5.0.6",
    sections: [
      {
        title: "Grandes Eventos: importar programa",
        items: [
          "O arquivo .etim agora pode ser escolhido no Android.",
          "Importe também o programa do Circuito Manager (.json ou .csv).",
          "Pelo .csv, os oradores já designados entram com o nome preenchido.",
        ],
      },
      {
        title: "Botões sempre visíveis",
        items: [
          "Na leitura do capítulo, \"Ponto alto\" e \"Concluído\" não ficam mais escondidos atrás da barra do celular.",
        ],
      },
      {
        title: "Termos de Uso atualizados",
        items: [
          "Novos termos: quem desenvolve o app, ferramenta não oficial e conteúdos de terceiros.",
          "O acesso por código também pede o aceite dos termos.",
        ],
      },
    ],
  },
  {
    version: "5.0.5",
    sections: [
      {
        title: "Grandes Eventos do Circuito",
        items: [
          "Importe programas de assembleias e reuniões especiais (.etim).",
          "Edite partes: tema, tipo, tempo, e horários recalculados automaticamente.",
          "Escolha por evento: link único com PIN ou link pessoal para cada orador.",
          "Congregação do orador preenchida sozinha e convites exportados em Word.",
        ],
      },
      {
        title: "Importar itinerário (.ics e .csv)",
        items: [
          "Importe o arquivo do Circuit Assistant ou uma planilha, com revisão antes de salvar.",
          "Visitas vão para Visitas; os demais eventos viram Semanas sem visita.",
          "Aviso de datas em conflito e sugestão da congregação certa.",
        ],
      },
      {
        title: "Notas do JW Library",
        items: [
          "Nova pílula JW Library na Leitura da Bíblia (superintendente e esposa).",
          "Importação do backup feita só no celular, sem enviar para a nuvem.",
          "Busca por texto, referência e etiqueta; copie notas para Pontos altos.",
        ],
      },
      {
        title: "Estudo e Anotações",
        items: [
          "Nova tela no menu com Leitura da Bíblia, Pesquisas e Anotações.",
          "Toque num capítulo para \"Começar a ler\" ou \"Marcar como lido\".",
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
