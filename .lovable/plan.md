## Onda 7 — atualização e Subonda 1 (fluidez visual base)

### Vetos e regras permanentes (registradas)
- **7.5 (Bíblia embutida) REMOVIDO** definitivamente. Não empacotar nenhuma tradução pública. A única Bíblia do app continua sendo a **Tradução do Novo Mundo via parser EPUB privado** já existente (`src/lib/epub-bible-parser.ts`, `BibleManagerDialog`, `BibleVersePopover`). Salvar como constraint em `mem://` para sessões futuras nunca reproporem.
- Resto do plano da Onda 7 permanece aprovado, mas será entregue subonda por subonda, com aprovação entre elas.

---

### Subonda 1 — Fluidez visual base (escopo desta entrega)

Apenas três frentes, estritamente presentational, sem tocar em lógica de dados/auth/RLS/SW.

#### 1.1 Animações de rota
- `bun add framer-motion`.
- Em `src/routes/_app.tsx`, envolver o `<Outlet/>` em:
  - `<LazyMotion features={domAnimation} strict>` (subset leve, ~5KB gz).
  - `<AnimatePresence mode="wait" initial={false}>` com um `<m.div key={pathname}>` chaveado pelo `useRouterState({ select: s => s.location.pathname })`.
- Transição: `opacity 0→1` + `translateY 4px→0`, duração **120ms**, easing `[0.2, 0.8, 0.2, 1]`.
- Respeito a `prefers-reduced-motion`: hook `useReducedMotion()` zera duração/translate quando ativo.
- Gate SSR: o wrapper de animação só monta após hidratação (`useEffect` flag) para evitar mismatch.

#### 1.2 Transições de abas (CSS-only, sem JS extra)
- Em `src/styles.css`, no bloco já existente de `main [role="tablist"]` / `[role="tab"]`:
  - Adicionar `transition: color var(--transition-fast), background-color var(--transition-fast)` nos triggers.
  - Indicador inferior do tab ativo via pseudo-elemento `::after` animado (`transform: scaleX`) com a `--section-color` herdada da Onda 6.8.
  - Novos tokens: `--transition-fast: 120ms cubic-bezier(.2,.8,.2,1)` e `--transition-base: 220ms cubic-bezier(.2,.8,.2,1)` em `:root` e `.dark`.
  - `@media (prefers-reduced-motion: reduce)` desativa as transitions.
- **Sem** alterar `src/components/ui/tabs.tsx` (componente Radix base).

#### 1.3 Skeletons fiéis
Substituir spinners full-screen por skeletons que espelham o layout real, usando o `<Skeleton/>` já existente. Escopo desta subonda (5 rotas de maior peso visual):
- `src/routes/_app.dashboard.tsx` — grid de `CollapsibleCard` skeletons (cabeçalho + 3 linhas).
- `src/routes/_app.cronograma.tsx` — lista de dias (7 blocos com borda lateral colorida + 2-3 eventos cada).
- `src/routes/_app.resumo-semana.tsx` — cards de seção.
- `src/routes/_app.refeicoes.tsx` — tabela com linhas skeleton.
- `src/routes/_app.reunioes-discursos.tsx` — abas + painéis.

Padrões:
- Cada rota exporta um pequeno componente local `RouteSkeleton` (ou inline) e o usa em `pendingComponent` da rota, **ou** como fallback enquanto `useQuery` retorna `isPending` na primeira carga (sem dados em cache).
- Skeletons herdam `.section-accent` para já mostrarem a cor do domínio.
- Sem mexer em queries, mutations ou loaders.

#### 1.4 Verificação obrigatória
- `bunx tsc --noEmit` limpo.
- Build limpo (harness automático).
- Smoke manual: navegar entre 4 rotas → confirmar fade+slide de 120ms; ativar `prefers-reduced-motion` no DevTools → confirmar transições instantâneas; abrir uma rota sem cache → confirmar skeleton fiel antes do conteúdo.

#### Arquivos tocados (Subonda 1)
- `package.json` (nova dep `framer-motion`).
- `src/routes/_app.tsx` (LazyMotion + AnimatePresence).
- `src/styles.css` (tokens `--transition-fast/base`, transitions em tabs, indicador `::after`, media query reduce-motion).
- 5 rotas listadas em 1.3 (apenas adição de skeleton fiel).
- `.lovable/plan.md` (registro da Subonda 1 concluída e do veto ao 7.5).
- `mem://index.md` + `mem://constraints/biblia-tnm-apenas.md` (constraint permanente).

#### Fora do escopo desta subonda (entrarão em subondas seguintes)
- Virtualização de listas (7.2).
- Warm-up offline e badges (7.3/7.4).
- Command Palette expandida (7.7).
- PDF local com `pdf-lib` (7.6).
- Editor de notas premium (7.8).
- Auditoria de acessibilidade ampla (7.9).

Cada uma dessas voltará como subonda própria, com plano e aprovação separados.
