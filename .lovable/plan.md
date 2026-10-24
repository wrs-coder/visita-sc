# Lembretes de eventos e aceite dos Termos no cadastro

## 1. Lembretes dos eventos da semana (app Android instalado)
- Os eventos são os mesmos que aparecem em "Hoje" (superintendente e anciãos) e no "Resumo do dia" (esposa): reuniões, saídas de campo, refeições, transporte e eventos do cronograma.
- O celular avisa mesmo sem internet e com o app fechado. Os avisos ficam guardados no próprio aparelho.
- Os avisos são refeitos sozinhos sempre que a semana é carregada ou atualizada. Se um evento muda ou é removido, o aviso antigo é cancelado.
- Em "Meu perfil", no app da esposa e no espaço dela, um cartão "Lembretes" com:
  - um interruptor geral (começa desligado; ao ligar, o Android pede permissão);
  - antecedência: 15, 30, 60 min ou 1 dia antes;
  - quais tipos avisar, com opções diferentes por perfil:
    - Superintendente: tudo (campo, reuniões, refeições, transporte, cronograma).
    - Ancião: reuniões e campo da sua congregação.
    - Esposa: refeições, transporte, campo e eventos que o superintendente deixou visíveis para ela.
  - um botão "Testar lembrete".
- Texto do aviso: tipo e horário, por exemplo "Almoço às 12:30 — Família Silva".
- No site pelo navegador, o cartão explica que os lembretes funcionam só no app instalado.
- É preciso gerar um novo APK/AAB. Os aparelhos que não atualizarem continuam funcionando como antes.

## 2. Aceite dos Termos de Uso e da Política de Privacidade
- Nas telas de cadastro de ancião e de superintendente: caixinha "Li e aceito os Termos de Uso e a Política de Privacidade", com links que abrem as páginas. Sem marcar, o botão de criar conta fica desativado.
- Nova página "Termos de Uso", curta e no mesmo estilo da Política de Privacidade, também com link no rodapé do login. O texto será um rascunho para você revisar.
- Quem já tem conta não precisa aceitar de novo. O login não muda e o banco não muda.

## Detalhes técnicos
- Adicionar `@capacitor/local-notifications`, rodar `npx cap sync` no build local e declarar `POST_NOTIFICATIONS`/`SCHEDULE_EXACT_ALARM` no manifesto, com aviso inexato como alternativa.
- `src/lib/event-reminders.ts`: transformar os itens de `buildDayTimeline` (painel) e os dados do snapshot do visitante em `{id, at, title, body, kind}`. O id estável vem de um hash de origem+id+data. Agendar só eventos futuros com horário, no máximo 60. Cancelar todos os pendentes do app antes de reagendar (idempotente).
- Preferências no localStorage por usuário (`reminders.<userId|guestHash>`). No web, nada é agendado (guarda `Capacitor.isNativePlatform()`).
- Hook `useEventReminders(items, role)` chamado onde o painel e o painel da esposa já têm os dados. Sem consultas novas.
- Cadastro: `accepted` local no formulário, validado no cliente antes do envio. Nova rota `src/routes/termos-uso.tsx` com head().
- Testes vitest: mapeamento de eventos para horário do aviso (antecedência), filtro por perfil e ignorar eventos passados ou sem horário.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
