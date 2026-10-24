# Rodada enxuta: Sincronizar na tela cheia do painel, Cronograma da esposa e notificações

## 1. Botão "Sincronizar" na tela cheia aberta pelo painel
- No popup de detalhes da tela cheia aberta pelo painel inicial, mostrar o mesmo botão "Sincronizar" que já existe em Esboços Pessoais.
- Ele puxa data, período, oração, território, ajudantes e título da reunião de campo (ou da reunião/discurso, no caso dos Esboços da Semana) e salva no esboço.
- Fica desativado quando estiver sem internet. Nada muda no banco nem no formato dos dados.

## 2. Aba "Cronograma" da esposa
Concordo: hoje ela repete o "Resumo do dia". Proposta:
- Tirar a aba "Cronograma" da barra (fica uma aba a menos, a barra respira melhor no celular).
- No "Resumo do dia", colocar no topo uma faixa com os dias da semana (seg a dom). Hoje vem marcado; ao tocar outro dia, o resumo mostra a programação daquele dia. Assim, ver a semana inteira continua possível sem uma aba repetida.
- Nenhum dado é apagado: só muda como ele aparece.

## 3. Notificações dos eventos
Sim, é possível, mas só no app instalado (Android). No site do navegador não entra nesta rodada.
- Usar notificações locais do próprio celular: funcionam sem internet e sem servidor.
- Quando a semana da visita é baixada ou atualizada, o app agenda avisos, por exemplo 30 minutos antes de cada reunião, saída de campo, refeição e transporte.
- Em "Meu perfil", um interruptor "Lembretes de eventos" com a opção de antecedência (15, 30 ou 60 min). Começa desligado; ao ligar, o Android pede permissão.
- Precisa gerar um novo APK/AAB, porque é um recurso nativo. Proponho fazer isso numa rodada separada, depois de 1 e 2.

## Detalhes técnicos
- 1: em `FieldNoteFullscreenDialog.tsx`, passar `onSync`/`syncing` ao `FieldNoteInfoButton`, reutilizando a mesma função de sincronização de `_app.consideracoes-campo.tsx` (extraída para um módulo compartilhado se preciso) e salvando pelo fluxo de salvar já existente do diálogo.
- 2: em `visitante.painel.tsx`, remover o trigger/conteúdo `cron` e adicionar um seletor de dia ao conteúdo `hoje`, filtrando os itens já carregados. Sem consultas novas.
- 3 (rodada futura): `@capacitor/local-notifications`, reagendamento idempotente por id derivado do evento e cancelamento ao desligar ou trocar de semana; preferência no armazenamento local.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
