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
└───────────────────────────────┘
```

Ao escolher outra meta (ex.: "1 ano"), as pílulas dos dias somem e aparece o conteúdo normal daquela meta. Voltando a "Dias", a configuração de livros por dia continua lá, intacta.

## O que muda
- Remove o botão tracejado "Ler por dias da semana" e a seção separada "Dias da semana".
- Meta de leitura ganha a 5ª opção "Dias"; o resumo do cabeçalho recolhido mostra "Dias · Salmos 23".
- O conteúdo dos dias (pílulas, editar livros) aparece dentro da própria caixa Meta de leitura.
- Vale para Pessoal, Família e Reunião, cada uma com sua própria configuração.

## O que NÃO muda
- Progresso, pontos altos, anotações, filtros, modo comentário e cartão da reunião.
- Dados salvos: quem já usa "dias da semana" continua com a mesma configuração (selecionado automaticamente como "Dias").
- Nenhuma mudança no servidor.

## Detalhes técnicos
- `BibleReadingTab.tsx`: grid de 4 → layout em 2 linhas (grid-cols-3 + grid-cols-2 / ou grid-cols-6 com spans). Seleção "Dias" = `setReadingState({ weekday: {...(rdata.weekday ?? newWeekday()), enabled: true} })`; outras metas = `enabled: false` + `setPlan(id)`. Valor exibido = `rdata.weekday?.enabled ? "weekday" : plan`.
- `WeekdayCard` renderizado dentro do CollapsibleSection `${track}.goal`; remover a seção `${track}.weekday` e o botão.
- Sem mudança em `bible-tracks.ts` nem no formato do workspace. Teste: alternar metas preserva `weekday.books`. Validar com tsgo e vitest.
