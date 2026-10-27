// Novidades da versão atual — embutidas no app (offline) e servidas pelo endpoint de versão.
// Atualizar a cada release, junto com RELEASE_NOTES_VERSION.
export const RELEASE_NOTES_VERSION = "5.0.4";

// Novidades exibidas no botão "Ver novidades" do aviso. Atualizar a cada release.
export const RELEASE_NOTES: { title: string; items: string[] }[] = [
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
