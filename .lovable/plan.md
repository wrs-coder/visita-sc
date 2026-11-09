# Leitura da Bíblia: três ajustes

Itens 01 e 02: só na leitura **Reunião**. Item 03: só em **Família** e **Pessoal**.

## O que encontrei

1. **Caixa "Ler/Continuar" (Reunião)**: hoje há um único botão, que mostra só o próximo capítulo ("Ler · Gênesis 17"), com o nome inteiro do livro e sem versículos.
2. **Barra do livro (Reunião)** ("Jeremias 50/52"): conta quantos capítulos do livro estão marcados como lidos, e não em qual capítulo você está.
3. **Leitura atrasada (Família e Pessoal)**: o app guarda o dia da sua última leitura **só no aparelho onde você marcou**. O celular não tem esse registro e, sem registro, o app não conta atraso. No site o registro existe, por isso lá o aviso aparece.

## Como vai ficar

```text
Reunião
┌──────────────────────────────┐
│ Pessoal │ Família │ Reunião● │
├──────────────────────────────┤
│ Leitura da semana   Gên 17–19│
│ ┌──────────────────────────┐ │
│ │ ✓ Gên 17:1-27      Lido  │ │  ← já lido (esmaecido)
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
│ Gênesis ▓▓▓▓░░░░░░ 18/50 36% │
└──────────────────────────────┘

Família / Pessoal no celular (igual ao site):
┌──────────────────────────────┐
│ ⚠ Leitura atrasada · 1 dia   │  ← vermelho
└──────────────────────────────┘
```

### 01 — Uma caixa por capítulo da semana (Reunião)
- Um botão para cada capítulo da semana, com o livro abreviado e o primeiro e o último versículo: "Gên 17:1-27".
- O primeiro capítulo ainda não lido aparece como "Continuar". Os capítulos já lidos ficam com ✓ e continuam podendo ser tocados.

### 02 — Barra do livro pela sequência (Reunião)
- A barra mostra o capítulo que você está lendo, o total de capítulos do livro e a porcentagem. Exemplo: Jeremias 51 de 52 → "51/52 98%".
- Os capítulos lidos em outras leituras deixam de contar.

### 03 — Aviso de atraso no celular (Família e Pessoal)
- A Reunião continua sem aviso de atraso.
- Quando o aparelho não tiver o registro do dia, o app olha seus capítulos marcados. Cada dia com leitura programada nos últimos 7 dias (meta "Dias", sem contar hoje) que não tem os capítulos marcados como lidos conta como atrasado.
- Exemplo: o domingo tinha leitura e você não marcou → "⚠ Leitura atrasada · 1 dia" aparece também no celular.
- Quando o aparelho já tem o registro, nada muda. O visual também não muda.

## Detalhes técnicos
- `BibleTrackExtras.tsx › MeetingWeekCard`: trocar o botão único por uma lista de `keys`. Cada linha vira um subcomponente que usa `abbreviateBookAlways` + `useChapterSpan`.
- `BibleReadingTab.tsx`: quando `track === "meeting"`, `bookProgress = { done: capítulo atual, total: chaptersOf(livro) }`.
- `reading-day-log.ts › overdueDays`: novo parâmetro opcional `read`. Quando `last` estiver vazio, conta os dias programados dos últimos 7 dias em que `weekdaySeq(plan, dia)` não foi todo lido, sem contar hoje. A chamada em `BibleReadingTab.tsx` passa `done`.
- Não há mudança de dados nem de servidor. Novos testes ficam em `reading-overdue.test.ts`: sem registro e domingo não lido → 1; sem registro e tudo lido → 0.
- A validação é feita com `bunx tsgo --noEmit` e `bunx vitest run`. Não há aumento de versão.
