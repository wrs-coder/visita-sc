# "Dias da semana" dentro da Meta de leitura

## Recomendação
O melhor e mais intuitivo é **unificar**: "Dias" vira uma opção da Meta de leitura. Hoje a tela tem um botão tracejado solto ("Ler por dias da semana") que, ao ser ligado, **esconde** a Meta de leitura inteira — o usuário perde a referência de onde estava e precisa descobrir como voltar. No padrão iOS / One UI, escolhas mutuamente exclusivas ficam num único controle segmentado.

Um controle de 5 segmentos lado a lado fica apertado em 393 px; por isso a proposta usa **2 linhas** (padrão One UI para muitas opções), mantendo toques de 36 px+.

```text
┌───────────────────────────────┐
│ [Pessoal] [Família] [Reunião] │
│ ███████████░░░░░  62%         │
│ ▾ Meta de leitura      Dias   │
│ ┌───────────────────────────┐ │
│ │ [Ordem] [Cronológica]     │ │
│ │ [1 ano] [Dias] [Pers.]    │ │
│ └───────────────────────────┘ │
│  Seg Ter Qua Qui Sex Sáb Dom  │
│  (●)  ○   ○   ○   ○   ○   ○   │
│  Hoje: Salmos 23    [Ler ›]   │
│  Livros de segunda   [Editar] │
│  [✓ Marcar capítulos lidos]   │
└───────────────────────────────┘
```

Ao escolher outra meta (ex.: "1 ano"), as pílulas dos dias somem e aparece o conteúdo normal daquela meta. Voltando a "Dias", a configuração de livros por dia continua lá, intacta.

## Marcar capítulos já lidos (novo)
Em cada dia, o botão "Marcar capítulos lidos" abre uma folha inferior (padrão iOS/One UI) com os livros daquele dia e a grade de capítulos:

```text
┌───────────────────────────────┐
│ ─────                         │
│ Segunda · capítulos lidos     │
│ Salmos              23 de 150 │
│ (1)(2)(3)…(22)(23) 24  25  26 │
│  27  28 …                     │
│ Provérbios           0 de 31  │
│  1   2   3 …                  │
│ [Marcar até aqui] [Limpar]    │
│              [Concluir]       │
└───────────────────────────────┘
```

- Toque num capítulo marca/desmarca; "Marcar até aqui" marca todos anteriores ao último tocado (rápido para quem já leu muito).
- A programação atualiza na hora: "Hoje" passa a ser o **primeiro capítulo não lido** daquele dia.
- Marcar um capítulo aqui também conta no progresso geral da aba (Pessoal/Família/Reunião), igual a ler pelo botão "Ler".
- Quando todos os capítulos do dia forem lidos, o dia mostra "Concluído ✓" com opção "Recomeçar".

## O que muda
- Remove o botão tracejado "Ler por dias da semana" e a seção separada "Dias da semana".
- Meta de leitura ganha a 5ª opção "Dias"; o resumo do cabeçalho recolhido mostra "Dias · Salmos 23".
- O conteúdo dos dias (pílulas, editar livros, marcar lidos) aparece dentro da própria caixa Meta de leitura.
- Vale para Pessoal, Família e Reunião, cada uma com sua própria configuração.

## O que NÃO muda
- Progresso, pontos altos, anotações, filtros, modo comentário e cartão da reunião.
- Dados salvos: quem já usa "dias da semana" continua com a mesma configuração (selecionado automaticamente como "Dias").
- Nenhuma mudança no servidor.

## Detalhes técnicos
- `BibleReadingTab.tsx`: grid de 4 → layout em 2 linhas. Seleção "Dias" = `setReadingState({ weekday: {...(rdata.weekday ?? newWeekday()), enabled: true} })`; outras metas = `enabled: false` + `setPlan(id)`. Valor exibido = `rdata.weekday?.enabled ? "weekday" : plan`.
- `WeekdayCard` renderizado dentro do CollapsibleSection `${track}.goal`; remover a seção `${track}.weekday` e o botão.
- Capítulos lidos: reutilizar o conjunto de capítulos lidos já existente da trilha (`WsReading`), sem campo novo. Nova função pura em `bible-tracks.ts`: `weekdayNextUnread(plan, day, readSet)` = primeiro capítulo da sequência do dia fora do conjunto (fallback para `pos`). `weekdayCurrent` passa a usá-la quando houver conjunto. Folha com `Drawer` existente.
- Testes: alternar metas preserva `weekday.days`; marcar capítulos move "Hoje" para o primeiro não lido; dia todo lido = concluído. Validar com tsgo e vitest.
