## Onda 6.8 — Sistema de cores premium em todas as telas

Estender os indicadores visuais da 6.7 para o app inteiro: cards, abas, subabas e blocos de evento devem ter diferenciação cromática **sutil e premium** — sem virar arco-íris. Tudo via tokens em `src/styles.css` (zero hex inline, AA garantido em claro/escuro).

### 1. Novos tokens semânticos (`src/styles.css`)

**Superfícies em camadas** (substituem o `bg-card` único):
- `--surface-1` (fundo base de seção, ~96% do background)
- `--surface-2` (card padrão, atual `--card`)
- `--surface-3` (card aninhado / destaque, +2% luminosidade no claro, +3% no escuro)
- `--surface-elevated` (modais/popovers, atual `--popover`)

**Accents por domínio** (borda lateral 3px + ícone tonal), reaproveitando paleta da 6.7:
- `--accent-visit` (navy) — Semana da Visita, Cronograma
- `--accent-meetings` (violet) — Reuniões & Discursos, Reuniões de Campo
- `--accent-couple` (rose) — Comunicação do Casal
- `--accent-checklist` (emerald) — Checklist, Transporte
- `--accent-meals` (amber) — Refeições
- `--accent-elder` (teal) — Programa de Anciãos
- `--accent-notes` (sky) — Notas, Esboços
- `--accent-admin` (muted) — Configurações, Lixeira, Modelos

Cada accent expõe `--accent-{x}-bg` (color-mix 8% no claro, 14% no escuro com `--card`) para hover/header sutil.

**Abas/subabas**:
- `--tab-bg` (igual `--surface-1`)
- `--tab-active-bg` (`--card` + sombra suave)
- `--subtab-bg` (color-mix 50% entre `--muted` e `--card`)
- `--subtab-active-bg` (`--accent-{contexto}-bg`)

### 2. Utilitários CSS (`src/styles.css`)

- `.section-accent` — `border-left: 3px solid var(--section-color, var(--border))` (variável setada por wrapper de rota)
- `.card-nested` — usa `--surface-3` + borda mais clara, para cards dentro de cards (ex.: itens dentro de `CollapsibleCard`)
- `.tabs-premium` — estilo unificado para `TabsList` (fundo `--tab-bg`, trigger ativo com sombra `--shadow-card` + cor de accent contextual)
- `.subtabs-premium` — variante mais densa para subabas internas

### 3. Mapeamento por rota (`src/lib/route-accent.ts` — novo, ~25 linhas)

Função `useRouteAccent()` que lê o pathname e retorna `{ color, bg, label }` do accent correspondente. Aplicado em `_app.tsx` via `style={{ "--section-color": ... }}` no `<main>`, propagando para cards/abas filhos.

### 4. Aplicação por tela (apenas presentational, zero lógica)

- **Cronograma** já tem accent por dia (6.7) — manter.
- **Dashboard** (`_app.dashboard.tsx`): `CollapsibleCard` ganha `.section-accent` com cor do domínio do card (Reuniões=violet, Refeições=amber, etc.).
- **Semana da Visita** (`_app.reunioes-discursos.tsx`, `_app.refeicoes.tsx`, `_app.transporte.tsx`, `_app.checklist.tsx`, `_app.comunicacao-casal.tsx`, `_app.reunioes-de-campo.tsx`, `_app.consideracoes-campo.tsx`): cada rota seta seu accent; `TabsList` recebe `.tabs-premium`.
- **Programa de Anciãos** (`_app.programa-ancioes.tsx`): accent teal.
- **Notas / Esboços** (`_app.notas.tsx`): accent sky.
- **Configurações / Lixeira / Modelos**: accent admin (neutro).
- **Resumo da Semana**, **Relatório**, **Escala**, **Congregações**: accent visit (continuam contexto da visita).

Cards aninhados (ex.: itens de lista dentro de `CollapsibleCard`) recebem `.card-nested` para criar a 3ª camada visual.

### 5. Contraste & validação

- Cada par bg/fg validado manualmente para ≥ 4.5:1 (texto) e ≥ 3:1 (borda decorativa) nos dois temas.
- `color-mix` sempre com `--card`/`--background` para herdar tema.
- Nada de cores raw em componentes — só classes utilitárias e tokens.
- `bunx tsc --noEmit` deve continuar limpo.

### Arquivos a tocar

- `src/styles.css` (tokens + utilitários `.section-accent`, `.card-nested`, `.tabs-premium`, `.subtabs-premium`)
- `src/lib/route-accent.ts` (novo)
- `src/routes/_app.tsx` (aplica `--section-color` no `<main>` via hook)
- `src/components/dashboard/CollapsibleCard.tsx` (aceita prop `accent?: AccentKey`)
- Rotas listadas acima: adicionar `className="tabs-premium"` no `TabsList` e usar `CollapsibleCard accent="..."` onde aplicável
- `.lovable/plan.md` (registrar 6.8)

Sem dependências novas. Sem mudança de regra de negócio. Build limpo.