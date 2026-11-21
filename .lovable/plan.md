# Plano — Atalho do esboço, cronômetro com tópicos e botão Enviar

## (01) "Abrir no modo esboço" pelo Início

Causa provável (encontrada no código): o Início manda o esboço para a tela de Considerações de campo. Quando o esboço é do tipo "Esboço de discurso", ele é repassado para "Estudo e Anotações", mas nesse repasse o pedido "modo esboço" se perde — e essa tela força "modo edição". Se o esboço ainda não carregou, o pedido também é descartado e só a lista aparece.

Correção:
- O Início já abre direto na tela certa conforme o tipo do esboço, levando junto "modo esboço".
- O repasse entre telas passa a carregar o modo pedido (esboço ou edição).
- Se o esboço ainda estiver carregando, a tela espera por ele em vez de cair na lista.
- Primeiro passo: reproduzir no navegador para confirmar a causa antes de mexer.

## (02) Tempo por tópico acoplado ao cronômetro do topo (opcional)

A pílula flutuante deixa de existir. O tempo por tópico vira uma linha extra presa ao cronômetro do topo, ligada/desligada pelo superintendente. O cronômetro atual não muda.

```text
┌──────────────────────────────┐
│ ✕   ⏱ 12:34   ▶ ❚❚   ⋯       │  ← cronômetro atual
│ ───────────────────────────  │
│ 3. Pastoreio   faltam 04:10  │  ← nova linha (opcional)
│ Próximo: Ata             ›   │
└──────────────────────────────┘

Menu ⋯ do cronômetro:
┌──────────────────────────────┐
│ Tempo por tópico      [ ●○ ] │
└──────────────────────────────┘
```

- Vale para a pauta (tela cheia e leitura) — mesmo relógio de sempre.
- Tocar na linha leva ao tópico; "›" pula para o próximo.
- A escolha fica guardada no aparelho; começa desligada.

## (03) Botão "Enviar pauta para os anciãos" logo abaixo das pílulas

```text
┌──────────────────────────────┐
│ ( Leitura | Preparar | Montar)  [≡] │
│ Pauta pronta. Use o lápis…   │
│ ┌──────────────────────────┐ │
│ │ ➤ Enviar pauta p/ anciãos│ │
│ └──────────────────────────┘ │
│   Último envio: 21/11 às 10:30│
│ ● Alterações não enviadas    │
└──────────────────────────────┘
│ Pauta – Reunião com Anciãos  │
│ …                            │
```

- Mesmo botão, mesma confirmação e mesmo "Último envio" — só muda de lugar (some no Preparar, como hoje).
- Sem internet continua cinza com "Conecte-se para enviar".

## O que não muda
Dados da pauta, envio, respostas dos anciãos, offline, PDFs, cronômetro atual e versão da Play Store.

## Detalhes técnicos
- `_app.dashboard.tsx`: Link escolhe rota pelo `note.type` (talk_notes → `/estudo-pessoal` com `mode`).
- `_app.estudo-pessoal.tsx`: aceitar `mode` no search e repassar (hoje fixo `"edit"`); `onForeignNote` em consideracoes-campo envia `mode`.
- `OutlinesWorkspace`: só chamar `onSearchConsumed` depois de achar a nota (ou após carga completa).
- Remover `AgendaTopicPill` flutuante; nova `AgendaTopicRow` dentro de `OutlineTimer` (prop opcional `topics`) + preferência em localStorage `agendaTopicRow.on`; usar timer `agenda-<visitId>`. Atualizar AGENTS.md da pauta.
- `ElderAgendaView.tsx`: mover bloco do Enviar para o Card das pílulas.
- Teste: Playwright do atalho do Início; testes existentes da pauta.
