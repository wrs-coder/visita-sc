// Novidades da versão atual — embutidas no app (offline) e servidas pelo endpoint de versão.
// Atualizar a cada release, junto com RELEASE_NOTES_VERSION.
export const RELEASE_NOTES_VERSION = "5.0.2";

// Novidades exibidas no botão "Ver novidades" do aviso. Atualizar a cada release.
export const RELEASE_NOTES: { title: string; items: string[] }[] = [
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
