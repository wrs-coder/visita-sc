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
  icon: "lock" | "calendar" | "week" | "book" | "event" | "report" | "faq" | "profile" | "dashboard" | "templates" | "outline";
  /** Tela real aberta pelo botão "Abrir esta tela". */
  route: string;
  /** Miniatura desenhada com as peças reais do app. */
  preview?: "circuit-pills" | "pin-card" | "visit-pills" | "reading-pills" | "event-pills" | "backup-card" | "profile-pills" | "dashboard-pills" | "templates-pills" | "outline-pills" | "notes-tabs";
  steps: HelpStep[];
  /** Palavras extras para a busca. */
  keywords?: string[];
};

const RAW_TOPICS: HelpTopic[] = [
  {
    id: "private-notes",
    title: "Notas Privadas",
    icon: "lock",
    route: "/notas",
    preview: "notes-tabs",
    keywords: ["notas", "privadas", "confidencial", "pastoreio", "s-303", "oradores", "recomendados", "peticoes"],
    steps: [
      { before: "No menu lateral, toque em ", labelKey: "sidebar.privateNotes", after: "." },
      { before: "Elas são ", labelKey: "notes.subtitle", after: "." },
      { before: "Em ", labelKey: "notes.congregationLabel", after: ", escolha a congregação das notas." },
      { before: "As notas ficam em 6 abas: ", labelKey: "notes.categories.free.label", after: ", “Pastoreio”, “S-303”, “Oradores”, “Recomendados” e “Petições”." },
      { before: "Em cada aba, toque no botão de nova nota, por exemplo ", labelKey: "notes.categories.free.add", after: ", “Nova visita de pastoreio” ou “Novo registro S-303”." },
      { before: "Em “Pastoreio”, preencha ", labelKey: "notes.pastoral.dateLabel", after: ", “Acompanhante”, “Nome dos envolvidos” e “Informações adicionais”." },
      { before: "Em “S-303”, registre ", labelKey: "notes.structured.s303.positivos", after: ", “Pontos para encorajar (Atos 11:23)” e “Pontos preocupantes (Tito 1:5)”." },
      { before: "Use ", labelKey: "notes.filters.search", after: " e as datas “De” e “Até” para filtrar." },
      { before: "Para exportar, marque as notas (ou “Selecionar desta aba”) e toque em ", labelKey: "notes.export.pdf", after: " ou “WhatsApp”. O PDF sai como “Notas Privadas — Confidencial”." },
      { before: "Sem internet, a nota é criada no aparelho e enviada depois. Ao encerrar uma visita, as Notas Privadas são preservadas." },
    ],
  },

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
    id: "dashboard",
    title: "Painel inicial",
    icon: "dashboard",
    route: "/dashboard",
    preview: "dashboard-pills",
    keywords: ["painel", "inicio", "agenda", "hoje", "pastoreio", "recados", "cartoes"],
    steps: [
      { before: "O Painel abre ao entrar no aplicativo. No menu lateral ele se chama ", labelKey: "sidebar.home", after: "." },
      { before: "Ele tem 4 telas: ", labelKey: "dashboard.pager.tabAgenda", after: ", “Esboços”, “Visita” e “Pastoreio”. Deslize para o lado ou toque no nome da tela." },
      { before: "Em ", labelKey: "dashboard.pager.tabAgenda", after: ", as pílulas dos dias mostram os compromissos de cada dia. “Voltar para hoje” volta ao dia atual." },
      { before: "Em ", labelKey: "dashboard.pager.tabOutlines", after: ", ficam as notas de “Considerações da Semana” e “Esboços da Semana”, prontas para abrir." },
      { before: "Em ", labelKey: "dashboard.pager.tabVisit", after: ", aparecem as reuniões, refeições e transporte da semana da visita ativa." },
      { before: "Em ", labelKey: "dashboard.pager.tabPastoral", after: ", ficam os pastoreios e encorajamento agendados, as recomendações, assuntos locais e o checklist da congregação." },
      { before: "O ícone de ", labelKey: "dashboard.couple.title", after: " no topo mostra as mensagens da sua esposa." },
      { before: "Visita com a semana já passada mostra “Finalizar agora”. Ao confirmar o fim, ela sai do Painel na hora, mesmo sem internet." },
      { before: "Os cartões podem ser recolhidos e expandidos. Se algo ficou guardado sem internet, toque em ↻ no topo para enviar." },
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
      { before: "Para trazer o itinerário de outro aplicativo, toque em “+ Nova visita” → “Importar de arquivo” e escolha um arquivo .ics ou .csv. Você revisa tudo antes de salvar." },
      { before: "Na pílula “Circuito” ficam as congregações, os anciãos do circuito e os Grandes Eventos." },
      { before: "Em Congregações, o botão “+ Nova” oferece “Criar nova” ou “Importar de arquivo” (lista do JW.org .csv, Word .docx ou Excel .xlsx). Você confere a lista, desmarca o que não é congregação e pode trocar o código de 5 números antes de criar. Nomes muito parecidos com uma congregação sua (ex.: “Jd. Alvorada” e “Jardim Alvorada”) aparecem como “Parecida com uma sua”: escolha Substituir nome, Manter como está ou Criar como nova. Substituir troca só o nome — o código de acesso não muda." },
      { before: "No Itinerário, o botão “Exportar” exporta as visitas e as semanas sem visita, na ordem, em PDF (lista ou calendário com os 6 meses numa folha), Word ou Excel, escolhendo 1º Semestre (set–fev), 2º Semestre (mar–ago), ano de serviço, tudo ou um período personalizado, para enviar aos anciãos. As observações das semanas sem visita aparecem junto (ex.: “Semana de pioneiro - Assembleia”). Quando a mesma semana tem visita e eventos, todos aparecem empilhados no calendário. Visitas do tipo “Visita SCS” saem com a marca “· SCS” ao lado da congregação. Para corrigir uma semana sem visita, toque no lápis do cartão. Em “Visita SCS”, o telefone do substituto aceita qualquer formato (também de outros países) e há um campo opcional para o e-mail do JW Hub; os anciãos veem esses contatos no painel com o pedido de falar com ele sobre a programação. Códigos de acesso e telefones não entram no arquivo." },
      { before: "O número da congregação, entre parênteses, pode ser mantido no nome ou retirado com a chave “Manter número da congregação”." },
      { before: "Toque em “Exportar” para gerar um Word com todas as congregações e seus códigos de acesso." },
      { before: "O ícone de calendário, ao lado do nome do circuito, abre o mês inteiro." },
    ],
  },
  {
    id: "visit-templates",
    title: "Modelos de visita",
    icon: "templates",
    route: "/modelos",
    preview: "templates-pills",
    keywords: ["modelo", "programacao", "estudos", "refeicoes", "transporte", "pacote", "checklist", "duplicar", "exportar"],
    steps: [
      { before: "No menu lateral, abra ", labelKey: "sidebar.visitTemplates", after: ": é a sua programação pessoal, usada para preencher cada visita." },
      { before: "Escolha um modelo numerado no topo ou toque em ", labelKey: "templates.newTemplate", after: ". Você pode renomear, duplicar e exportar." },
      { before: "Preencha as partes ", labelKey: "templates.program.studiesTitle", after: ", “Refeições” e “Transporte”, dia por dia." },
      { before: "Toque em ", labelKey: "templates.program.saveTemplate", after: " para guardar." },
      { before: "Em ", labelKey: "sidebar.baseTemplates", after: " ficam os outros modelos: checklist, reuniões de campo e reunião e discurso." },
      { before: "Os pacotes de visita juntam vários modelos para preencher uma visita nova de uma vez." },
      { before: "Ao cadastrar uma visita, escolha os modelos. Se uma visita ficar sem modelos, o aplicativo avisa uma vez por dia." },
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
    id: "outlines",
    title: "Esboços",
    icon: "outline",
    route: "/consideracoes-campo",
    preview: "outline-pills",
    keywords: ["esboco", "discurso", "consideracao", "campo", "pasta", "topico", "tempo", "cronometro", "word", "docx", "anexo", "foto", "video", "nuvem", "editar detalhes", "alca", "recentes", "limpar", "distracoes"],
    steps: [
      { before: "No menu lateral, abra ", labelKey: "sidebar.personalOutlines", after: "." },
      { before: "No topo, escolha o tipo: ", labelKey: "personalOutlines.typePicker.field", after: " ou “Esboço”." },
      { before: "Ao editar, a tela fica limpa, sem distrações: título, explicação e “Esboços recentes” somem. O Tema e os demais campos ficam em “Editar detalhes”, que abre numa janela." },
      { before: "No modo edição, o botão “⬅ Esboços” volta direto para a escolha do tipo de criação, com todas as pastas." },
      { before: "Abaixo do texto há uma alça: arraste para aumentar a área de escrita, sem limite e sem atrapalhar a rolagem. Dois toques voltam ao tamanho normal." },
      { before: "Em “Esboços recentes”, o botão ", labelKey: "personalOutlines.recentClear", after: " apaga o histórico de uma vez (os esboços continuam guardados)." },
      { before: "Organize tudo em pastas com ", labelKey: "personalOutlines.folders.new", after: ". As pastas “Considerações da Semana” e “Esboços da Semana” são fixas e aparecem no Painel." },
      { before: "Para mudar uma nota de lugar, use ", labelKey: "personalOutlines.folders.cut", after: " e depois “Colar aqui” na pasta de destino." },
      { before: "No editor, o botão “Tópico” cria uma parte do esboço que pode ser recolhida e expandida. Use ", labelKey: "personalOutlines.topics.collapseAll", after: " para ver só os títulos." },
      { before: "Cada tópico pode ter seus minutos. Durante o discurso, a pílula de tempo mostra o horário previsto e você marca os tópicos concluídos." },
      { before: "Em ", labelKey: "personalOutlines.topicTime.settings", after: " você muda tamanho, opacidade e posição da pílula." },
      { before: "O ", labelKey: "personalOutlines.timer.label", after: " conta o tempo do discurso, em contagem crescente ou regressiva." },
      { before: "“Modo foco” e ", labelKey: "personalOutlines.fullscreen.enter", after: " deixam só o texto na tela, com fonte maior ou menor." },
      { before: "Textos bíblicos escritos no esboço viram atalhos que abrem a sua Bíblia importada. Em “Provérbios 22:11; 23:1”, o 23:1 também abre Provérbios." },
      { before: "No balão do texto bíblico: arraste pelo topo para mover; “Aa” mostra uma régua (para cima aumenta a letra, para baixo diminui); os três pontinhos trazem Copiar, Inserir no esboço, Destacar seleção, Aparência, Limpar destaques e “Mais opções” (capítulo inteiro e navegação). Dois toques no título fecham o balão." },
      { before: "Para destacar, selecione uma palavra ou trecho: aparecem bolinhas coloridas logo abaixo. Toque num trecho já destacado para trocar a cor ou apagar. Ao rolar o texto, as bolinhas somem." },
      { before: "Em “Anexos do esboço”, junte fotos e vídeos. Eles ficam só neste aparelho. Se o Tema estiver vazio, ele recebe o nome do arquivo." },
      { before: "Ao colar do Word, os recuos são mantidos. Você também pode importar e exportar em Word, uma nota ou a pasta inteira. Ao importar um Word, a primeira linha com texto vira o Tema." },
      { before: "O botão “Salvar” grava no aparelho na hora. Com internet, o esboço vai para a ", labelKey: "personalOutlines.cloud.button", after: "." },
      { before: "Para usar o mesmo esboço em outro aparelho: nos três pontinhos do esboço ou da pasta, toque em “Enviar para a nuvem” no primeiro aparelho e em “Receber da nuvem” no outro. Receber da pasta também traz esboços e subpastas que ainda não existem no aparelho. No celular, arraste o esboço para a esquerda (enviar) ou para a direita (receber)." },
    ],
  },
  {
    id: "bible",
    title: "Bíblia e anotações",
    icon: "book",
    route: "/estudo-pessoal",
    preview: "reading-pills",
    keywords: ["esboco", "discurso", "biblia", "leitura", "pontos altos", "anotacoes", "familia", "reuniao", "dias", "word", "docx"],
    steps: [
      { before: "No menu lateral, abra ", labelKey: "sidebar.studyNotes", after: "." },
      { before: "Na aba ", labelKey: "studyPersonal.bible", after: ", escolha a leitura: “Pessoal”, “Família” ou “Reunião”. Cada uma tem seu próprio progresso." },
      { before: "Em “Meta de leitura”, a opção “Dias” define livros para cada dia da semana. Use “Marcar capítulos lidos” para atualizar a programação." },
      { before: "Toque em “Continuar” para abrir o próximo capítulo não lido." },
      { before: "No topo do leitor ficam “✎ Ponto alto”, “Aa” (letra, cor, brilho e áudio) e “Lido”: com círculo vazio o capítulo ainda não foi marcado; verde com ✓ significa já lido (toque de novo para desmarcar). O topo mostra o livro, o capítulo e os versículos (ex.: Gên. 1:1-31). Ao selecionar um trecho, palavra ou versículo aparece uma pílula logo ao lado com as cores, ⭐ (Ponto alto) e 📝 (Anotar); tocar de novo na mesma cor remove o destaque. Se a pílula não aparecer, use a barra de baixo, que também tem o botão de apagar." },
      { before: "Marque pontos altos “Para comentar” e abra o “Modo comentário” na reunião." },
      { before: "Use o filtro dos pontos altos e das anotações para ver uma leitura só ou todas juntas." },
      { before: "Você pode trazer as anotações do JW Library escolhendo o arquivo de backup (.jwlibrary). Elas ficam separadas dos seus pontos altos." },
      { before: "A Bíblia usada é só a que você importou (EPUB). Sem ela, a leitura não mostra o texto." },
    ],
  },
  {
    id: "big-events",
    title: "Grandes Eventos",
    icon: "event",
    route: "/congregacoes",
    preview: "event-pills",
    keywords: ["assembleia", "congresso", "orador", "convite", "carta", "pdf", "word", "link", "pin", "rtf", "importar oradores", "excel", "xlsx", "csv", "programa oficial", "negrito", "fonte", "margem", "layout", "pagina"],
    steps: [
      { before: "Abra a área do circuito, toque na pílula ", labelKey: "circuit.pillCircuit", after: " e desça até " },
      { before: "Seção ", labelKey: "circuit.sectionEvents", after: ": use “Novo evento” ou “Importar programa” (arquivo .rtf, .etim, .json ou .csv)." },
      { before: "Cada orador recebe um link curto (podendo ter um PIN) para confirmar a designação, e a confirmação aparece na hora para o superintendente." },
      { before: "Na pílula “Modelos de carta” você prepara o papel timbrado; cada evento escolhe o seu modelo." },
      { before: "Toque em “Exportar”: o Word traz a lista das designações para conferir; o PDF gera uma carta por designação, com link ativo." },
      { before: "Se a carta não couber em uma página, o app reduz espaços e fonte e avisa quando não for possível." },
      { before: "No modelo de carta, cada caixa de texto tem uma barra de ferramentas: negrito, itálico, marcador, destaque, tamanho da letra e espaçamento." },
      { before: "Em “Layout da carta”, escolha “Automático” (o app ajusta para caber em 1 página) ou “Manual” (você define letra, margens e espaçamento). O contador mostra quantas páginas a carta terá." },
      { before: "Para preencher os oradores de uma vez, toque no “...” do evento e em “Importar oradores”. Aceita o PDF do programa oficial, Word, Excel ou CSV: o app liga cada orador e congregação ao discurso pelo número do esboço." },
      { before: "Antes de aplicar, revise a lista: desmarque o que não quiser. Partes já confirmadas não são trocadas, e as do SC ou do Rep. da filial são ignoradas." },
      { before: "Ao trocar o orador de uma designação que já tinha convite, o app gera um novo link ou PIN e a confirmação volta para “aguardando”, porque o convite antigo era do orador anterior." },
      { before: "Se uma parte importada ficou sem tempo, digite os minutos direto no cartão, no lugar do aviso “Falta inserir o tempo”." },
      { before: "No “...” de cada designação ficam Editar, Novo link, PIN do convite, Novo PIN e “Informar próximo orador” (já marcado no Simpósio e na Série de discursos, menos no último orador)." },
      { before: "Ao importar .rtf, cada orador recebe 1 minuto a menos que o intervalo. No horário automático, tempos terminados em 4 ou 9 ganham 1 minuto de transição." },
    ],
  },
  {
    id: "event-timer",
    title: "Controle de tempo do evento",
    icon: "event",
    route: "/congregacoes",
    keywords: ["cronometro", "temporizador", "regressivo", "tempo", "atrasado", "adiantado", "sino", "relatorio", "espelhar", "tablet", "tv", "qr code", "wifi", "tribuna", "mini tempo", "flutuar", "janelinha", "picture"],
    steps: [
      { before: "Abra o evento em Grandes Eventos e toque em “Controle de tempo”. Funciona sem internet." },
      { before: "Toque no relógio grande de uma parte para iniciar ou parar. Você pode escolher qualquer parte, fora de ordem." },
      { before: "Dois toques no relógio perguntam se deseja zerar o tempo daquela parte." },
      { before: "O sino mostra se a parte começou no horário (verde) ou atrasada (vermelho), pela hora do celular. No topo aparece se o programa está atrasado ou adiantado." },
      { before: "No “...” do topo escolha Regressivo ou Cronômetro, veja ou exporte o relatório em PDF. No “...” de cada parte: Editar, Reiniciar e Alterar tempo." },
      { before: "No fim da lista, toque em “Concluir evento”. No Android, o tempo continua visível sobre outros apps." },
      { before: "Para mostrar só o relógio num tablet ou TV, toque no “...” do topo e em ", labelKey: "timerMirror.menu", after: ". Em “Internet”, o tablet lê o QR Code; em “Rede local” (só no app Android), os dois aparelhos usam o mesmo Wi‑Fi do salão, mesmo sem internet." },
      { before: "No aparelho da tribuna aparece a parte que você iniciar: verde, amarelo faltando 2 min, vermelho faltando 1 min e “Seu tempo terminou” quando passar, com a previsão de término e, no simpósio, o próximo orador." },
      { before: "O relógio da tribuna abre em tela cheia (se o navegador pedir, toque uma vez na tela). Ele conta sozinho: se o sinal cair, continua contando e mostra “Sem sinal”." },
      { before: "Ao lado do nome de cada orador há o botão ", labelKey: "timerMirror.mini", after: ": envie o QR Code ou o link só para aquele orador. Ele vê apenas o tempo do próprio discurso, que começa junto com o seu cronômetro." },
      { before: "Na tela do orador, o botão ", labelKey: "timerMirror.float", after: " deixa uma janelinha com o tempo sobre o aplicativo do esboço. Em “Tamanho da janelinha” escolha Pequena, Média ou Grande." },
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
    id: "profile",
    title: "Meu Perfil",
    icon: "profile",
    route: "/perfil",
    preview: "profile-pills",
    keywords: ["perfil", "esposa", "convite", "senha", "usuario", "email", "idioma", "lembretes", "tela cheia", "imersivo", "sincronizacao", "apoie"],
    steps: [
      { before: "Abra o menu lateral e toque em ", labelKey: "sidebar.myProfile", after: ". No alto ficam três abas; o app lembra a última que você abriu." },
      { before: "Aba ", labelKey: "profile.tabPersonal", after: ":" },
      { before: "Em ", labelKey: "profile.circuit", after: ", digite o circuito que você serve. O circuito fica ligado à sua conta, e o nome do circuito permite entrar na conta." },
      { before: "Em ", labelKey: "profile.wifeAccess.title", after: ", gere o código de convite e envie para sua esposa. Com ele, ela entra no aplicativo e usa o próprio espaço de estudo e anotações, separado do seu." },
      { before: "Em ", labelKey: "profile.personalData", after: ", confira e atualize seu nome e telefone." },
      { before: "Em ", labelKey: "profile.usernameSection.title", after: ", escolha o nome que você pode usar para entrar." },
      { before: "Em ", labelKey: "profile.email", after: ", veja o e-mail da sua conta." },
      { before: "Em ", labelKey: "profile.changePassword", after: ", digite a nova senha e confirme." },
      { before: "Aba ", labelKey: "profile.tabFeatures", after: ":" },
      { before: "Em ", labelKey: "bibleManager.manage", after: ", importe ou troque o arquivo EPUB da Tradução do Novo Mundo. A Bíblia fica no aparelho e funciona sem internet. Baixe a Bíblia no site jw.org." },
      { before: "Se algum versículo aparecer com palavras coladas (comum em poesia, como Salmos e Provérbios), importe de novo o mesmo arquivo EPUB: a nova leitura separa as linhas corretamente." },
      { before: "Em ", labelKey: "offlinePin.manageTitle", after: ", configure o PIN e a biometria para entrar sem internet." },
      { before: "Em ", labelKey: "sync.title", after: ", veja se seus dados já foram enviados para a nuvem." },
      { before: "Aba ", labelKey: "profile.tabSettings", after: ":" },
      { before: "Em “Lembretes de eventos”, ligue os avisos da agenda e escolha a antecedência, um segundo aviso, a antecedência por tipo, o resumo do dia e o horário de silêncio." },
      { before: "Em ", labelKey: "profile.language", after: ", escolha o idioma do aplicativo. Se você não escolher, ele segue o idioma do celular." },
      { before: "Em ", labelKey: "profile.immersiveTitle", after: ", ative “Tela cheia na leitura e no esboço” para esconder a barra de hora e bateria. Para vê-la de novo, puxe do topo." },
      { before: "Em ", labelKey: "profile.backupSection", after: ", toque em “Gerar arquivo de backup” para salvar uma cópia dos seus dados, ou em “Restaurar backup” para recuperar uma cópia salva." },
      { before: "No fim da tela, ", labelKey: "support.title", after: " mostra como ajudar a manter o aplicativo." },
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

export const HELP_ORDER = ["profile", "visit-templates", "circuit", "dashboard", "outlines", "big-events", "bible", "private-notes", "visit-week", "reports-backup", "security", "faq"];

export const HELP_TOPICS: HelpTopic[] = HELP_ORDER.map((id) => RAW_TOPICS.find((t) => t.id === id)!).filter(Boolean);

/** Temas do Corpo de Anciãos: só telas que o ancião acessa. */
export const ELDER_HELP_TOPICS: HelpTopic[] = [
  {
    id: "elder-dashboard",
    title: "Painel inicial",
    icon: "dashboard",
    route: "/dashboard",
    keywords: ["painel", "agenda", "hoje", "semana", "visita"],
    steps: [
      { before: "O Painel abre ao entrar e mostra a semana da visita do superintendente à sua congregação." },
      { before: "Em ", labelKey: "dashboard.pager.tabAgenda", after: ", toque nos dias para ver cada compromisso. “Mais detalhes” mostra oração, território e temas." },
      { before: "Deslize para o lado para ver as outras telas do painel." },
    ],
  },
  {
    id: "elder-program",
    title: "Programa da visita",
    icon: "week",
    route: "/programa-visita",
    keywords: ["refeicoes", "transporte", "campo", "reunioes", "programa"],
    steps: [
      { before: "No menu lateral, abra o programa da visita." },
      { before: "Use as pílulas do topo para preencher refeições, saídas de campo, transporte e reuniões." },
      { before: "Os quadros podem ser recolhidos e expandidos; o que você digitou não se perde." },
      { before: "Sem internet, tudo fica salvo no aparelho e é enviado depois." },
    ],
  },
  {
    id: "elder-pastoral",
    title: "Perguntas e pastoreio",
    icon: "event",
    route: "/programa-visita",
    keywords: ["perguntas", "pastoreio", "encorajamento", "recomendacoes", "assuntos locais"],
    steps: [
      { before: "Na pílula “Anciãos” ficam Perguntas do SC, Pastoreio, Encorajamento, Recomendações e Assuntos locais." },
      { before: "Responda as perguntas e indique as famílias para pastoreio antes da semana da visita." },
      { before: "Recomendações e assuntos locais são vistos só pelo superintendente e pelo corpo de anciãos." },
    ],
  },
  {
    id: "elder-summary",
    title: "Resumo e PDF",
    icon: "report",
    route: "/resumo-semana",
    keywords: ["resumo", "pdf", "imprimir", "compartilhar"],
    steps: [
      { before: "No menu lateral, ", labelKey: "sidebar.weekSummary", after: " mostra a semana inteira em uma tela." },
      { before: "Gere o PDF para imprimir ou enviar aos irmãos." },
    ],
  },
  {
    id: "elder-security",
    title: "Entrada e segurança",
    icon: "lock",
    route: "/perfil",
    keywords: ["pin", "digital", "biometria", "offline", "sem internet"],
    steps: [
      { before: "Abra o menu lateral e toque em ", labelKey: "sidebar.myProfile", after: "." },
      { before: "No cartão ", labelKey: "offlinePin.manageTitle", after: ", crie um PIN (com internet na primeira vez)." },
      { before: "Sem internet, entre com o PIN ou a digital, por exemplo no Salão do Reino." },
    ],
  },
  {
    id: "elder-faq",
    title: "Perguntas frequentes",
    icon: "faq",
    route: "/dashboard",
    keywords: ["duvida", "offline", "internet"],
    steps: [
      { before: "Funciona sem internet? Sim. O que você salvar é enviado quando a conexão voltar." },
      { before: "Vejo outras congregações? Não. O acesso mostra só a visita da sua congregação." },
    ],
  },
];

/** Temas exibidos na Ajuda conforme o perfil. */
export function helpTopicsFor(role: string | null | undefined): HelpTopic[] {
  return role === "elder" ? ELDER_HELP_TOPICS : HELP_TOPICS;
}


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
