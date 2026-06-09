## Onda 6.7 — Indicadores visuais por cores (cronograma + listas)

Aplicar pistas visuais sutis no Cronograma e em listas longas para reconhecimento instantâneo, respeitando o contraste auditado nos modos claro/escuro.

### 1) Tokens semânticos (src/styles.css)

Adicionar tokens em `:root` e `.dark` — todos via `oklch`, com saturação contida para parecerem "suaves" e mantendo ≥ 4.5:1 do texto sobre o fundo do badge.

- **Cores por dia da semana** (apenas para a borda lateral, 3 px):
  - `--weekday-mon` ... `--weekday-sun` — paleta navy/teal/violet/amber/rose/emerald/sky calibrada (mais clara no `.dark` para visibilidade sobre fundo escuro).
- **Status soft** (badge = fundo + texto):
  - `--status-confirmed-bg` / `--status-confirmed-fg` (verde suave, derivado de `--success`).
  - `--status-pending-bg`   / `--status-pending-fg`   (âmbar suave, derivado de `--warning`).
  - `--status-attention-bg` / `--status-attention-fg` (rosa/destrutivo suave, derivado de `--destructive`).
  - No `.dark`, usar `color-mix(in oklab, var(--success) 25%, var(--background))` para fundo e a cor base para foreground, garantindo contraste AA.

### 2) Utilitários CSS (src/styles.css)

```css
.day-accent { border-left: 3px solid var(--day-color, var(--border)); }
.status-badge {
  display:inline-flex; align-items:center; gap:0.25rem;
  padding:0.125rem 0.5rem; border-radius:9999px;
  font-size:0.72rem; font-weight:600; line-height:1.2;
  background: var(--badge-bg); color: var(--badge-fg);
  border:1px solid color-mix(in oklab, var(--badge-fg) 25%, transparent);
}
.status-badge[data-tone="confirmed"] { --badge-bg:var(--status-confirmed-bg); --badge-fg:var(--status-confirmed-fg); }
.status-badge[data-tone="pending"]   { --badge-bg:var(--status-pending-bg);   --badge-fg:var(--status-pending-fg); }
.status-badge[data-tone="attention"] { --badge-bg:var(--status-attention-bg); --badge-fg:var(--status-attention-fg); }
```

Helper para mapear dia → variável: `dayAccentStyle(date)` em `src/lib/day-accent.ts` retornando `{ ['--day-color' as any]: 'var(--weekday-mon)' }` conforme `getDay()`.

### 3) Cronograma (src/routes/_app.cronograma.tsx)

- Aplicar `className="... day-accent"` + `style={dayAccentStyle(parseISO(e.event_date))}` no `<Card>` do `EventCard` (linha 606). A borda esquerda fica colorida pelo dia da semana — instantâneo ao escanear a lista.
- Render do badge de status no card, baseado em `e.status`:
  - `status === "postponed"` → `pending` ("Adiado")
  - `status === "completed"` → não entra na UI (já filtrado)
  - default → `confirmed` ("Confirmado")
- Strings i18n novas em `pt/en/es`: `schedule.status.confirmed`, `schedule.status.pending`.

### 4) Listas longas — badges de status

Aplicar `.status-badge` nos pontos onde já existe um estado textual hoje (sem mudar regras de negócio):

- **Lixeira** (`src/routes/_app.lixeira.tsx`) — itens excluídos recebem badge `attention` ("Na lixeira"); restauráveis recebem `pending`.
- **Resumo da Semana** (`src/routes/_app.resumo-semana.tsx`) — eventos confirmados/adiados ganham o mesmo par `confirmed`/`pending` usado no cronograma.

(Sem novos campos no banco; deriva-se do `status` existente.)

### 5) Contraste e dark mode

- Validar manualmente cada par bg/fg dos badges em ambos temas com `color-mix` apoiado nos tokens `--success/--warning/--destructive` já auditados na Onda 6.6.
- Bordas de dia: cor com luminosidade ≥ 0.55 no `.dark` para destacar do `--card` escuro.
- Nenhuma cor crua (hex/rgb) nos componentes — só tokens.

### 6) Plano e build

- Atualizar `.lovable/plan.md` marcando 6.7.
- Sem novas dependências. Apenas CSS + JSX.

### Arquivos a tocar
- `src/styles.css` (tokens + utilitários)
- `src/lib/day-accent.ts` (novo, ~15 linhas)
- `src/routes/_app.cronograma.tsx` (EventCard: classe + style + badge)
- `src/routes/_app.lixeira.tsx` (badges nos itens)
- `src/routes/_app.resumo-semana.tsx` (badges de status)
- `src/i18n/locales/{pt,en,es}.json` (chaves `schedule.status.*`, `common.status.*`)
- `.lovable/plan.md`

### Critérios de aceite
- Borda esquerda colorida por dia visível no Cronograma, sem alterar layout/altura dos cards.
- Badges arredondados com tom suave, legíveis em claro e escuro (AA).
- Build limpo, sem novos pacotes, sem regressão de a11y (focus ring intacto).