# Ajustes: bloco dos Anciãos, "Copiar para…" e Bíblia por aba

Sem mudança no banco, sem nova versão. Funcionamento sem internet continua igual.

## 01 — Bloco "A ser preenchido pelos Anciãos" (Programa da visita)

Hoje: no Programa da visita ele abre fechado para o superintendente e aberto para o ancião, e não marca o que falta.

Novo comportamento:
- Abre **sempre expandido** enquanto faltar algum campo.
- Só começa recolhido quando **todos** estiverem preenchidos (pode abrir com um toque).
- Campo vazio fica com **borda vermelha** e o contador fica vermelho ("1/3").
- Quando completa, o contador fica azul com ✓.
- Nos **Modelos** (tela do superintendente) nada muda: lá os campos ficam vazios de propósito.

```text
┌──────────────────────────────┐
│ Seg, 10 nov · Manhã          │
│ Local *  [Salão do Reino   ] │
│                [⧉ Copiar para…]│
│ ┌ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┐ │
│ ▾ A ser preenchido pelos     │
│   Anciãos           (🔴 1/3) │
│   Nº território              │
│   [ S-13 12              ]   │
│   Dirigentes auxiliares      │
│   [                     ]🔴  │  ← borda vermelha
│              [⧉ Copiar para…]│
│   Oração final               │
│   [ Irmão Paulo          ]   │
│ └ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┘ │
│                    [Salvar]  │
└──────────────────────────────┘

Tudo preenchido:
│ ▸ A ser preenchido pelos     │
│   Anciãos          (✓ 3/3)   │
```

## 02 — "Copiar para…" não aparece

Pela leitura do código, o botão **não depende de o modelo ser novo ou antigo**. Ele some em três casos:
1. A visita tem **só um dia/turno de campo ativo** (não há para onde copiar).
2. O campo está vazio: aí o botão aparece apagado (fica cinza e difícil de ver).
3. No celular, só aparece quando você instalar a **versão nova** do app. No site já deveria estar.

Primeiro passo: conferir a visita real onde você testou (quantos dias de campo estão ativos) e abrir a tela no site para confirmar qual dos casos é. Depois:
- Mostrar o botão sempre que houver outro dia, mesmo com o campo vazio, com o aviso "Escreva algo para copiar".
- Deixar o botão mais visível (texto azul, estilo iOS).
- Se a causa for outra, explico antes de mudar.

## 03 — Bíblia diferente para cada aba

Hoje existe uma única "Bíblia em uso", escolhida no Perfil, valendo para tudo.

Novo: duas escolhas, guardadas só no celular:
- **Esboços e anotações** (balão bíblico): ex. Português de Portugal.
- **Leitura da Bíblia**: ex. Português do Brasil.
- Se nada for escolhido, as duas usam a Bíblia em uso de hoje (nada muda para quem não mexer).

Onde escolher (sem ir ao Perfil):

```text
Leitura da Bíblia            Perfil › Bíblia
┌──────────────────────┐     ┌──────────────────────────┐
│ ‹  Jer. 51:1-64  [PT-BR▾]│  │ Bíblias importadas        │
│ ▓▓▓▓▓▓▓░ 50/52        │     │ ● TNM Português Brasil   │
│                       │     │ ○ TNM Português Portugal │
│ 1 Assim diz Jeová...  │     │──────────────────────────│
└──────────────────────┘     │ Usar em:                 │
 toque no selo → lista       │ Esboços      [Portugal ▾]│
 das Bíblias importadas      │ Leitura      [Brasil   ▾]│
                             └──────────────────────────┘
Balão bíblico › ⋯ › "Bíblia: Portugal ▸"
```

Destaques, pontos altos e anotações não mudam: continuam ligados ao livro/capítulo/versículo, valendo nas duas versões.

## Detalhes técnicos
- `EldersFillSection`: nova prop `autoOpen` (abre se `filled < total`, sem desmontar conteúdo) e `highlightMissing`; usada só em `FieldMeetingsPanel` (e demais painéis do Programa que usam o bloco). Inputs vazios exigidos recebem `border-destructive` via token.
- `CopyToDays`: render com `targets.length > 0` independente do valor; diagnóstico via consulta de leitura dos `field_meetings` da visita testada.
- `bible-notes-store.ts`: novas chaves localStorage `bible.library.outlines` e `bible.library.reading`; `getActiveLibrary(scope?)` cai para a chave global atual quando a do escopo não existe ou foi removida. CleanReader/use-chapter-span usam `reading`; BibleVersePopover/BibleRefText/OutlinesWorkspace usam `outlines`. Registrar regra no AGENTS.md.
- Testes: abertura automática do bloco, fallback do escopo de Bíblia; `tsgo --noEmit` e `vitest run`.
