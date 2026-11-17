# Ajustes: Para comentar, Oradores, boia da Reunião e Quadro de anúncios

## (01) "Para comentar" recolhe e expande
Passa a usar o mesmo cartão recolhível dos outros cartões da tela Esboços, com ícone de mão levantada. Fica lembrado no aparelho se está aberto ou fechado. Conteúdo, estrelas e Modo comentário continuam iguais.

```text
┌─────────────────────────────┐
│ ✋ Para comentar   (3)    ⌄ │  ← toque recolhe/expande
├─────────────────────────────┤
│ ⭐ Gên 3:15  "A promessa…"  │
│ ⭐ Sal 23:1  "Jeová é…"     │
│ [ Modo comentário ]         │
└─────────────────────────────┘
recolhido:
┌─────────────────────────────┐
│ ✋ Para comentar   (3)    › │
└─────────────────────────────┘
```

## (02) Oradores sem rolagem para o lado
Prévia em lista vertical: tema da parte em cima (quebra de linha elegante), nome embaixo. Nada ultrapassa a largura da tela.

```text
┌─────────────────────────────┐
│ Oradores                  ✕ │
│ [ Importar arquivo ]        │
│ ┌─────────────────────────┐ │
│ │ Lucia Nunes e …         │ │
│ └─────────────────────────┘ │
│ Prévia                      │
│ 3. Iniciando conversas —    │
│    de casa em casa (3 min)  │
│    Lucia Nunes /            │
│    Fernanda Abreu           │
│ ─────────────────────────── │
│ 4. Cultivando o interesse   │
│    Marcos Silva             │
│            [ Aplicar ]      │
└─────────────────────────────┘
```

## (03) Boia da Reunião com tempo e controles
A boia mostra o tempo da parte atual e os botões: parte anterior, iniciar/pausar, próxima parte. Toque no tempo reabre a tela inteira. Tamanho: Compacta / Normal / Grande (escolha guardada no aparelho, pelo toque longo ou botão de tamanho).

```text
Compacta:   ┌──────────────┐
            │ ⏱ 03:12  ⏸ │
            └──────────────┘
Normal:     ┌──────────────────────┐
            │ 4. Cultivando o int… │
            │      03:12 / 4:00    │
            │  ⏮    ⏸    ⏭   ⤢  │
            └──────────────────────┘
Grande:     mesma da Normal, números e botões maiores
```
Tempo vermelho quando passar do limite, como na tela inteira. O relógio continua correndo minimizado (mesma contagem da tela inteira, nada reinicia).

## (04) Quadro de anúncios com os dados certos
- Horários sempre em 24h (ex.: 19:30, nunca 7:30 PM).
- Reunião do Fim de Semana: incluir o nome do presidente.
- Reuniões Especiais e Serviço de campo: usar as mesmas informações da Agenda do Início (sábado 10:30 sai 10:30; local do campo igual ao da Agenda).
- Topo sem o nome do superintendente.

```text
┌───────────── A4 ─────────────┐
│ SEMANA DA VISITA DO SC       │
│ Congregação X · 17–22 nov    │  ← sem nome do SC
│ MEIO DE SEMANA  Ter 19:30    │
│ FIM DE SEMANA   Dom 09:00    │
│  Presidência: João Souza     │
│ REUNIÕES ESPECIAIS           │
│  Sáb 10:30 Pioneiros  Salão  │
│ SERVIÇO DE CAMPO             │
│  Qua manhã 09:00 Casa Silva  │
└──────────────────────────────┘
```

## Detalhes técnicos
- (01) `ToCommentDashboardCard` envolto em `CollapsibleCard` (id `to-comment`, ícone `Hand` do lucide, accent notes); `CommentCard` fica dentro do conteúdo.
- (02) Diálogo de Oradores em `MeetingHub.tsx`: `max-w-[calc(100vw-2rem)]`, `overflow-x-hidden`, `min-w-0`, `break-words`/`[overflow-wrap:anywhere]` nas linhas; prévia em pilha (tema/nome), sem tabela/`whitespace-nowrap`.
- (03) Expor do cronômetro (`event-timer.ts` load/save por horário real) um pequeno hook para ler/controlar o estado salvo (start/pause/prev/next) usado por `MeetingTimerButton`; a boia `FloatingDock` renderiza tempo com tick de 1s e botões. Tamanho em localStorage (`meeting.dockSize`). Tela dos Grandes Eventos não muda.
- (04) `board-program-export.ts`: horários das reuniões especiais e do campo hoje vêm de `meeting_at` convertido pelo fuso do aparelho (`getHours`), causando a hora a mais; passar a ler pelos mesmos itens/formatação da Agenda do Início (horário de parede salvo) e o local do campo pelo mesmo campo que a Agenda exibe. Buscar `chairman` em `weekend_meetings`. Formatação 24h única (`HH:mm`). Remover nome do SC do cabeçalho em `board-program.ts`. Primeiro passo: conferir na visita real quais valores a Agenda mostra para confirmar a origem exata do erro de horário e local.
- Testes: atualizar `board-program.test.ts` (24h, presidente do fim de semana, sem nome do SC, sábado 10:30 permanece 10:30). Rodar testes e `bunx tsc --noEmit`.
