# Ajustes: Leitura, Ajuda, Lembretes e dados de exemplo

## 1. Leitura Reunião — seletor de capítulo
Causa encontrada: o campo de capítulo corrige o valor a cada tecla (campo vazio vira "1" na hora), então no celular não dá para apagar e digitar "12".
Correção: o campo aceita digitação livre (teclado numérico), e só ajusta para o limite do livro ao sair do campo ou tocar "Salvar". O seletor de livro ganha altura de toque de 44px (padrão iOS/One UI).

```text
┌───────────────────────────────┐
│ Leitura da reunião        ⌃   │
│ Livro            Capítulo     │
│ [ Isaías     ▾ ] [  12   ]    │
│ Ritmo: [ 3 ] capítulos/semana │
│            [ Salvar ]         │
└───────────────────────────────┘
```

## 2. Botão de Ajuda no topo
O "?" flutuante sai do rodapé (ficava sob a barra do Android) e passa para o cabeçalho, ao lado dos outros ícones. Sugestão: manter também o atalho de busca dentro da própria tela de Ajuda (como já existe). Nas telas de foco (cabeçalho escondido) o botão não aparece, como os demais ícones.

```text
┌───────────────────────────────┐
│ ☰  Visita SC     ?  🔔  ↻  👤 │
├───────────────────────────────┤
│  ...conteúdo...               │
│                               │
└───────────────────────────────┘
   (rodapé livre, sem botão)
```

## 3. Aviso de leitura pendente (meta "Dias")
Em Pessoal e Família, com meta "Dias": se a leitura de hoje não foi marcada, o botão "Continuar" ganha um anel vermelho e um pontinho vermelho na pílula da leitura. Some quando o capítulo do dia é marcado ou o dia fica "Concluído ✓".

```text
 [ Pessoal• ] [ Família ] [ Reunião ]
┌───────────────────────────────┐
│ Hoje (seg): Gênesis 4         │
│   ╭───────────────────╮       │
│   │    Continuar ▸    │ ← anel│
│   ╰───────────────────╯  vermelho
└───────────────────────────────┘
```

## 4. Lembretes
(a) Antecedência livre: número digitável + unidade (minutos, horas, dias, semanas), no padrão geral e por tipo de compromisso. As opções rápidas atuais continuam como atalhos.
(b) Novos lembretes "Leitura pessoal" e "Leitura em família": liga/desliga, horário escolhido (ex.: 06:30) e dias da semana. Aviso diário no horário, mesmo sem internet. Não avisa se a leitura do dia já foi marcada (quando o app for aberto antes).

```text
┌───────────────────────────────┐
│ Lembretes                     │
│ Antecedência                  │
│ [ 30 ] [ minutos ▾ ]          │
│ 15min  30min  1h  1 dia       │
│ ───────────────────────────── │
│ Leitura pessoal        [ ● ]  │
│   Horário [ 06:30 ]           │
│   S T Q Q S S D               │
│ Leitura em família     [ ● ]  │
│   Horário [ 20:00 ]           │
└───────────────────────────────┘
```

## 5. Visita TEST (23–28 fev 2027)
Preencher com dados inventados: recomendações (ex.: servo ministerial, pioneiro regular), assuntos locais (2–3 itens) e o checklist da congregação marcado parcialmente. Primeiro confiro o que já existe para não duplicar, depois abro o Painel como "Wao" para confirmar que aparecem.

## Detalhes técnicos
- `BibleTrackExtras.tsx` (MeetingWeekCard): estado de rascunho em string, `inputMode="numeric"`, clamp no blur/salvar.
- `CommandPalette.tsx`: remover botão fixo `bottom-4`; novo botão `HelpCircle` no cabeçalho do layout `_app` navegando para `/ajuda`; listener `OPEN_PALETTE_EVENT` mantido.
- Meta Dias: usar `weekdayNextUnread`/`weekdayDayDone` existentes para o estado pendente; anel via token `ring-destructive`.
- `event-reminders.ts`: `lead` passa a aceitar minutos livres (`leadMin`), com conversão dos valores antigos; novo `reading: { personal, family: { on, time, days } }` agendado como notificação local repetida; prefs continuam só em localStorage. Testes para conversão de unidades e agendamento de leitura.
- Item 5 apenas dados (inserts), sem mudança de estrutura.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`. Nenhum plugin Capacitor novo.
