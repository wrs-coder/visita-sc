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

## 4. "Recados da esposa" vira ícone no topo
- O cartão sai da Agenda. No topo do painel, ao lado do ícone de calendário de "Próximas visitas", aparece um ícone discreto de casal (coração).
- Com recado novo, o ícone ganha um pontinho com o número de não lidos.
- Tocar abre um popup com os recados: cada um com "Lido" (um toque) e "Responder", que abre a tela "Comunicação do casal".
- Sem recados, o ícone continua visível, sem pontinho, e o popup diz "Nenhum recado novo".

## 5. Botão voltar do celular
- Você instalou o complemento no seu computador, mas ele ainda não aparece na lista do projeto aqui. Vou registrá-lo no projeto para que entre no APK.
- O botão voltar passa a usar o complemento direto do Android, com fallback seguro no site. Exige novo APK.

## Detalhes técnicos
- `src/routes/_app.dashboard.tsx`: extrair `DayPillsStrip` de `visitante.painel.tsx` para `src/components/visit-summary/DayPillsStrip.tsx` (reuso nos dois lugares, sem mudar comportamento); estado `agendaIso` na aba; `renderTimeline(agendaIso, ...)`; remover página `amanha`; consulta de recados usa `[todayIso, agendaIso]`.
- `DashboardPager`/memória do layout: atualizar memória "5 telas" para 4 telas.
- `FieldNoteFullscreenDialog.tsx`: reutilizar a mesma função de sync da tela de esboços (`handleSyncFromField` / `talkSync.sync`), extraída para um hook compartilhado se necessário, passando `onSync`/`syncing` ao `FieldNoteInfoButton`.
- `src/routes/__root.tsx` (`runFlushWithSession`): condicionar o toast a `queueSize() > 0`, sessão de usuário existente (não guest), `navigator.onLine`, e nova tentativa após 3s; registrar motivo com `console.warn`.
- Recados: novo `CoupleMessagesButton` junto ao `UpcomingVisitsButton`, reutilizando a consulta e a marcação de lido já existentes no dashboard (sem mudar servidor/banco); remover o cartão da página Agenda.
- Botão voltar: `bun add @capacitor/app` (versão alinhada ao `@capacitor/core`); `native-back-button.ts` busca `window.Capacitor.Plugins.App` primeiro e só depois o import, com `console.warn` em falha.
- i18n PT/EN/ES para "Agenda", "Voltar para hoje", "Recados", "Lido", "Responder", "Nenhum recado novo".
- Validação: `bunx tsgo --noEmit` e `bunx vitest run`; teste novo para a regra do aviso (fila vazia/guest → sem aviso).
