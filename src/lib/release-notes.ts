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

export const RELEASE_NOTES_VERSION = "6.0.0";

/**
 * Aviso automático "O que há de novo" (5.7.0: ligado, só para superintendentes).
 * O texto continua em Configurações → Ver novidades e no aviso de atualização.
 * Troque para true para voltar a abrir sozinho na primeira abertura após atualizar.
 */
export const WHATS_NEW_AUTO_SHOW = true;

export const RELEASE_HISTORY: ReleaseEntry[] = [
  {
    version: "6.0.0",
    subtitle: "Controle de tempo da reunião, Quadro de anúncios e a nova Pauta da reunião com os anciãos.",
    sections: [
      {
        title: "Controle de tempo da reunião", audience: ["super"],
        items: [
          "Importe a apostila (.zip ou .rtf) e cronometre a reunião do meio de semana parte por parte.",
          "Conselho, oradores e a semana da visita já preenchidos; presidente e oração final entram sozinhos.",
          "Boia flutuante com o tempo e os botões iniciar, pausar, anterior e próxima, em três tamanhos.",
          "Exportar e importar programas, e minimizar sem perder a contagem.",
        ],
      },
      {
        title: "Quadro de anúncios em PDF", audience: ["super"],
        items: [
          "Dois modelos: Completo (com designados e pontilhados) e Simplificado (temas e cânticos).",
          "Sempre em uma folha, com horários de 24 h, leitura semanal da Bíblia e presidente no cabeçalho.",
          "Reuniões Especiais em tópico próprio e Serviço de campo com manhã/tarde, locais, territórios e orações.",
          "Frases de Isaías 54:13 e Lucas 2:10 opcionais; dados sempre iguais aos da Agenda.",
        ],
      },
      {
        title: "Pauta da reunião com os anciãos", audience: ["super"],
        items: [
          "Monte a pauta do seu jeito: tópicos numerados sozinhos e cartões à escolha, na ordem que quiser.",
          "Cartões: Informações do SC, Fontes de matéria, Informações dos anciãos, Resposta do SC, Recomendações e Assunto local.",
          "Título e textos bíblicos editáveis; orações de recomendação e Ata opcionais.",
          "Cada cartão define quem edita (Todos ou C.Serviço) e pode ficar oculto, só para você.",
          "Recomendações com comentário e decisão Designar/Não designar; \"Não designar\" vira nota em Recomendados.",
          "Botão para trazer a S-303 da semana, anexos de foto e PDF (envio opcional) e tela cheia com cronômetro.",
          "Prazo para os anciãos preencherem; modelos sincronizados entre seus aparelhos e exportáveis.",
          "PDF em três estilos; nas Fontes de matéria cada nome é o próprio link.",
        ],
      },
      {
        title: "Para os anciãos", audience: ["super", "elder"],
        items: [
          "A aba \"Pastoreio\" do Início agora se chama \"Anciãos\" e mostra a Pauta da reunião com os anciãos.",
          "A Pauta também está na pílula \"Pauta\" do Programa da visita, inclusive para quem entra pelo código do Corpo de anciãos.",
          "Preencha os cartões liberados pelo superintendente até o prazo; depois a pauta fica só para leitura e abre sem internet.",
          "Exporte a pauta em PDF no modelo escolhido pelo superintendente; toque no nome de uma publicação ou vídeo para abri-lo.",
        ],
      },
      {
        title: "Melhorias gerais",
        items: [
          "\"Para comentar\" recolhível e só com as notas marcadas com estrela.",
          "Pastoreio: agendar e salvar em notas sem sair da tela; cronômetro flutuante no Modo Esboço.",
          "Fotos e vídeos sempre em tela cheia; Grandes Eventos apagados não voltam mais.",
        ],
      },
    ],
  },
  {
    version: "5.8.0",
    subtitle: "Editor estilo Samsung Notes, telas mais limpas, itinerário completo no calendário e nuvem reforçada.",
    sections: [
      {
        title: "Editor de esboços e anotações", audience: ["super"],
        items: [
          "Barra de ferramentas no rodapé, colada ao teclado: o texto continua visível enquanto você digita.",
          "Topo limpo com ícones: voltar, modo esboço, editar detalhes, tela cheia, mais opções e salvar.",
          "Estilo (Aa), tamanho, cor da fonte e marca-texto abrem faixas próprias com dezenas de cores.",
          "Mais ferramentas (⋯) em páginas de duas linhas: arraste para o lado para ver o próximo grupo.",
          "Barra personalizada: escolha quais ferramentas ficam fixas.",
          "Localizar e Substituir, com aviso antes de alterar citações bíblicas.",
          "Contador de palavras e tempo estimado do discurso (130 palavras por minuto).",
          "Recuo de primeira linha e recuo deslocado preservados ao importar e exportar Word.",
          "Toque no espaço vazio abaixo do texto para continuar escrevendo no fim da nota.",
        ],
      },
      {
        title: "Telas mais limpas", audience: ["super"],
        items: [
          "Os títulos das telas foram para a barra do topo, liberando espaço útil.",
          "Resumo da semana e Comunicação do casal sem textos repetidos; partilha reunida no menu do cartão.",
          "Congregações mostra \"Circuito\" no topo e o Cronograma mostra o nome do seu circuito.",
        ],
      },
      {
        title: "Notas privadas", audience: ["super"],
        items: [
          "Toque no nome da categoria para abrir o painel lateral com as 6 categorias e seus totais.",
          "\"+ Novo\" mostra as 6 categorias para escolher o tipo de nota.",
        ],
      },
      {
        title: "Grandes Eventos e modelos de carta", audience: ["super"],
        items: [
          "\"Baixar da nuvem\" e \"Enviar todos\" para eventos e modelos de carta, sem perder o que está no aparelho.",
          "A versão mais recente de cada modelo de carta é sempre protegida.",
          "Importação de oradores preenche Presidente e Oração, com revisão e troca das designações antes de concluir.",
          "Partilha do evento sem internet, com ou sem as designações dos oradores.",
        ],
      },
      {
        title: "Calendário e próximas visitas", audience: ["super"],
        items: [
          "Calendário do mês e \"Próximas visitas\" mostram todas as semanas do itinerário, com o nome de cada evento.",
        ],
      },
      {
        title: "Bíblia e balão bíblico", audience: ["super"],
        items: [
          "Primeiros capítulos de cada livro corrigidos: o \"Conteúdo do livro\" não aparece mais como versículos.",
          "Quantidade exata de versículos por capítulo reconhecida ao importar a Bíblia.",
          "Balão bíblico mais preciso em intervalos entre capítulos e citações com \"e\", com botão para tentar de novo.",
          "Meta Dias com um só botão \"Continuar\".",
        ],
      },
    ],
  },
  {
    version: "5.7.0",
    subtitle: "Edição especial — relógio na tribuna, oradores importados e esboços sem distrações.",
    sections: [
      {
        title: "Grandes Eventos", audience: ["super"],
        items: [
          "Espelhar relógio: envie a contagem para um celular, tablet ou TV na tribuna pelo QR Code (internet ou Wi‑Fi local do salão).",
          "Mini tempo do orador: janelinha flutuante para o orador ver o tempo enquanto consulta o esboço.",
          "Importar oradores: nomes e congregações do PDF, Word, Excel ou CSV do programa oficial do evento.",
          "Modelos de carta: agora temos a formatação manual do layout de página e a barra de ferramentas de texto.",
          "Troca de orador: gera novo link ou PIN automaticamente, por segurança.",
        ],
      },
      {
        title: "Esboços Pessoais", audience: ["super"],
        items: [
          "Modo sem distrações: tela limpa ao editar, com os detalhes numa janela.",
          "Voltar fácil: o botão \"⬅ Esboços\" retorna direto à escolha do tipo de criação.",
          "Alça de altura: aumente livremente a área de escrita, sem atrapalhar a rolagem.",
          "Tema automático: preenchido pela primeira linha do Word ou pelo nome do anexo.",
          "Limpar recentes: apague o histórico com um só toque.",
        ],
      },
      {
        title: "Sistema e Sincronização", audience: ["super"],
        items: [
          "Sincronização inteligente: o botão do topo sincroniza só a tela aberta, poupando dados e bateria.",
          "Sincronização completa em Meu Perfil, com rotina automática diária de madrugada.",
        ],
      },
    ],
  },
  {
    version: "5.6.0",
    sections: [
      {
        title: "Controle de tempo dos Grandes Eventos", audience: ["super"],
        items: [
          "Tela de foco no estilo do programa, com relógio digital grande em cada parte.",
          "Escolha entre Regressivo (temporizador) e Cronômetro no menu \"…\".",
          "Sino de pontualidade: compara a hora do celular com o horário do programa.",
          "Topo mostra se o programa está adiantado, atrasado ou no horário.",
          "Série de discursos e Simpósio: os discursos contam dentro do tempo do título.",
          "Toque duplo no relógio para zerar; \"Concluir evento\" no fim da lista.",
          "Relatório executivo de pontualidade em PDF e bolinha flutuante no Android.",
        ],
      },
      {
        title: "Programa do evento e convites", audience: ["super"],
        items: [
          "Tela do evento mais limpa: detalhes e resumo recolhidos, Exportar no menu \"…\".",
          "Partes sem orador ficam agrupadas e recolhidas.",
          "Tempo que falta pode ser digitado direto no cartão da parte.",
          "Importação .rtf coloca 1 minuto a menos nos discursos.",
          "Horário automático soma 1 minuto de transição após tempos de 9, 14, 19 min.",
          "PIN e Novo link agora ficam no \"…\" de cada designação.",
          "Cartas e PDFs sem informações repetidas e sem participações em Presidente/Oração.",
        ],
      },
      {
        title: "Visitas e Ajuda", audience: ["super"],
        items: [
          "\"Finalizar agora\" não volta a aparecer depois de confirmar o fim da visita.",
          "Vídeos tutoriais no YouTube direto na Ajuda.",
          "Botão X para fechar a Ajuda.",
        ],
      },
    ],
  },
  {
    version: "5.5.0",
    sections: [
      {
        title: "Modelos e Programa da Visita", audience: ["super", "elder"],
        items: [
          "Bloco \"A ser preenchido pelos Anciãos\" abre sozinho enquanto houver campos vazios, com destaque em vermelho nos pendentes.",
          "Reunião de campo: escolha quais campos solicitar aos anciãos (território, localização, dirigentes auxiliares e oração final).",
          "Botão \"Copiar para…\" replica local e dirigentes para outros dias e turnos, com atalho \"Marcar só os vazios\".",
          "Barra do topo igual em todas as abas, com a congregação e o aviso de salvamento.",
          "Anciãos podem adicionar novos assuntos locais no botão \"+ Adicionar\".",
        ],
      },
      {
        title: "Bíblia independente por aba", audience: ["super"],
        items: [
          "Em Meu perfil › Bíblia, escolha uma versão para Esboços e anotações e outra para a Leitura da Bíblia, sem trocar toda vez.",
        ],
      },
      {
        title: "Leitura da Bíblia", audience: ["super", "wife"],
        items: [
          "Reunião semanal: um botão por capítulo com todos os versículos (ex.: Gên 17:1-27) e marca de lido.",
          "Barra do livro mostra o capítulo atual e a porcentagem real do livro.",
          "Leitura atrasada contada por dia da semana: cada dia tem seu próprio ciclo de 7 dias e o dia atrasado fica em vermelho.",
          "O histórico de leitura agora vai junto no backup, sem falsos avisos ao restaurar.",
        ],
      },
    ],
  },
  {
    version: "5.4.0",
    sections: [
      {
        title: "Balão bíblico nos esboços e considerações", audience: ["super"],
        items: [
          "Mini regulador de fonte [Aa] para aumentar ou diminuir o texto rapidamente.",
          "Menu [⋯] organizado com copiar, inserir no esboço e destaques.",
          "Títulos longos usam o nome do livro abreviado para não cortar a referência.",
        ],
      },
      {
        title: "Citações encadeadas", audience: ["super"],
        items: [
          "Citações com ponto e vírgula (ex.: ; 5:12) reconhecem o mesmo livro bíblico automaticamente nos esboços e notas.",
        ],
      },
      {
        title: "Leitura da Bíblia e Estudo pessoal", audience: ["super", "wife"],
        items: [
          "Barra flutuante sobre os versículos com as bolinhas de destaque, ⭐ (Ponto alto) e 📝 (Anotar).",
          "Toque na mesma cor já destacada para remover o destaque.",
          "Ao salvar uma anotação ou ponto alto, você volta direto ao capítulo e versículo onde estava lendo.",
        ],
      },
    ],
  },
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
