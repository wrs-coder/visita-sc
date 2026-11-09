# Leitura da Bíblia › Reunião: três ajustes

Só a leitura **Reunião** muda. Pessoal e Família continuam iguais.

## O que encontrei

1. **Caixa "Ler/Continuar"**: na Reunião existe um único botão, que mostra só o próximo capítulo ("Ler · Gênesis 17"), com o nome inteiro do livro e sem versículos.
2. **Barra do livro** ("Jeremias 50/52"): hoje conta quantos capítulos do livro estão marcados como lidos, e não em qual capítulo você está. Por isso o número não acompanha a sequência.
3. **Leitura atrasada**: hoje o aviso está desligado de propósito na Reunião. Ele só existe para a meta "Dias" (Pessoal/Família). Por isso, quando o domingo terminou sem leitura, nada apareceu.

## Como vai ficar

```text
┌──────────────────────────────┐
│ Pessoal │ Família │ Reunião● │
├──────────────────────────────┤
│ Leitura da semana   Gên 17–19│
│ ⚠ Leitura atrasada · 2 cap.  │  ← vermelho, só se faltou
│ ┌──────────────────────────┐ │
│ │ ✓ Gên 17:1-27      Lido  │ │  ← capítulo já lido (apagado)
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ ▶ Continuar · Gên 18:1-33│ │  ← próximo (destaque)
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ ▶ Gên 19:1-38            │ │
│ └──────────────────────────┘ │
│  ✎ Ajustar esta semana       │
└──────────────────────────────┘

Dentro da leitura (topo):
┌──────────────────────────────┐
│ ‹  Gênesis 18                │
│ Gênesis ▓▓▓▓▓▓░░░░ 18/50 36% │
└──────────────────────────────┘
```

### 01 — Uma caixa por capítulo da semana
- Um botão para cada capítulo da semana, com o livro abreviado e o primeiro e o último versículo: "Gên 17:1-27".
- O primeiro capítulo ainda não lido fica destacado como "Continuar". Os capítulos já lidos ficam esmaecidos com ✓, mas continuam podendo ser tocados para reler.

### 02 — Barra do livro pela sequência
- Na Reunião, a barra mostra **o capítulo que você está lendo / total de capítulos do livro** e a porcentagem. Exemplo: Jeremias 51 → "51/52 98%".
- Os capítulos marcados em outras leituras deixam de contar.

### 03 — Aviso de atraso na Reunião
- A semana da reunião vai de segunda a domingo. Se uma semana terminar com capítulos não lidos, aparece "⚠ Leitura atrasada · N cap." em vermelho no topo do cartão, e a aba "Reunião" ganha o pontinho vermelho.
- O aviso some quando você marca esses capítulos como lidos. Um botão "Ler atrasados" abre o primeiro deles.
- Só conta as semanas a partir da data em que você configurou a leitura, para não acusar atraso em semanas antigas.

## Detalhes técnicos
- `BibleTrackExtras.tsx › MeetingWeekCard`: trocar o botão único por uma lista de `keys`. O rótulo usa `abbreviateBookAlways` mais `useChapterSpan`, num pequeno subcomponente por linha (porque é um hook).
- `BibleReadingTab.tsx`: quando `track === "meeting"`, `bookProgress = { done: capítulo atual, total: chaptersOf(livro) }`. Os outros tracks continuam iguais.
- `bible-tracks.ts`: nova função pura `meetingOverdue(mw, done, today)`, que junta os capítulos das semanas já encerradas desde `anchorMonday` que não foram lidos. Ela entra no aviso (`lateDays`) e no alerta das pílulas (`pendingTracks`).
- Não há mudança de dados nem de servidor. Novos testes ficam em `bible-tracks.test.ts`: atraso depois do domingo, nenhum atraso quando tudo foi lido e nenhum atraso antes de `anchorMonday`.
- A validação é feita com `bunx tsgo --noEmit` e `bunx vitest run`. Não há aumento de versão.
