# Painel: aba "Agenda", Sincronizar na tela cheia e fim do falso "Sessão expirada"

## 1. Aba "Hoje" vira "Agenda" (com pílulas de dias)
- Renomear a aba para "Agenda" (PT/EN/ES: Agenda / Agenda / Agenda).
- No topo da aba, a mesma faixa de pílulas usada no "Resumo do dia" da esposa/anciãos: um dia por pílula, dia escolhido sempre centralizado, hoje com borda colorida, sem selo "Hoje", botão "Voltar para hoje" quando outro dia estiver escolhido.
- O cronograma da aba passa a mostrar o dia escolhido na pílula (hoje continua sendo o padrão ao abrir).
- Os outros cartões da aba (Recados, avisos) ficam como estão.
- A aba "Amanhã" é retirada: o painel passa de 5 para 4 telas (Agenda / Esboços / Visita / Pastoreio).
- Recados continuam sendo carregados para o dia escolhido (hoje é sempre lido).

## 2. Botão "Sincronizar" na tela cheia do painel
- A tela cheia aberta pelo painel passa a mostrar "Sincronizar" no balão de detalhes, para Consideração de Campo e Esboços da Semana, usando a mesma sincronização que a aba "Esboços Pessoais" já usa (nada novo no servidor).
- Durante a sincronização o botão gira e fica desativado; o resultado aparece na tela sem fechar a janela.

## 3. Fim do falso "Sessão expirada"
O aviso só aparece quando é preciso mesmo:
- se houver alterações esperando para enviar;
- se a pessoa entrou com conta (não por código de esposa/ancião);
- se há internet e uma segunda tentativa, 3 segundos depois, também falhar.
A proteção contra saída acidental da conta continua igual.

## Sugestão para o card "Recados da esposa" (para você decidir depois, não entra agora)
Transformar em "Recados" com resposta rápida: mostrar só os não lidos na Agenda, com um toque para "Lido" e um botão "Responder" que abre o recado na tela "Comunicação do casal". Recados antigos saem do painel e ficam só nessa tela.

## Fora desta rodada
- Botão voltar do celular: falta instalar o complemento do Android (`@capacitor/app` não está no projeto). Fica para uma rodada própria porque exige novo APK.

## Detalhes técnicos
- `src/routes/_app.dashboard.tsx`: extrair `DayPillsStrip` de `visitante.painel.tsx` para `src/components/visit-summary/DayPillsStrip.tsx` (reuso nos dois lugares, sem mudar comportamento); estado `agendaIso` na aba; `renderTimeline(agendaIso, ...)`; remover página `amanha`; consulta de recados usa `[todayIso, agendaIso]`.
- `DashboardPager`/memória do layout: atualizar memória "5 telas" para 4 telas.
- `FieldNoteFullscreenDialog.tsx`: reutilizar a mesma função de sync da tela de esboços (`handleSyncFromField` / `talkSync.sync`), extraída para um hook compartilhado se necessário, passando `onSync`/`syncing` ao `FieldNoteInfoButton`.
- `src/routes/__root.tsx` (`runFlushWithSession`): condicionar o toast a `queueSize() > 0`, sessão de usuário existente (não guest), `navigator.onLine`, e nova tentativa após 3s; registrar motivo com `console.warn`.
- i18n PT/EN/ES para "Agenda" e "Voltar para hoje".
- Validação: `bunx tsgo --noEmit` e `bunx vitest run`; teste novo para a regra do aviso (fila vazia/guest → sem aviso).
