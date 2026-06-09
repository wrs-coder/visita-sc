
# Melhorias propostas para o Visita SC

Foco: ganhos perceptíveis de usabilidade, fluidez e desempenho **sem aumentar o tamanho do app nem o custo de banco**. Tudo respeita as diretrizes do `instructions.md` (modelos neutros, RLS do Superintendente, offline-first, i18n nas três línguas, snapshots da visita, etc.).

Antes de implementar, gostaria de confirmar quais blocos abaixo entram no escopo — posso entregar em ondas pequenas para evitar regressões.

---

## 1. Fluidez percebida (frontend, custo zero no banco)

- **Skeletons + Suspense nas abas pesadas** (Semana da Visita, Dashboard, Programa Anciãos): substituir spinners por skeletons já no formato dos cards. Sensação de carregamento cai pela metade.
- **Transições otimistas** (`useMutation` com `onMutate`) nas edições do Superintendente que já são triviais (observações, horários, tempos). O usuário vê o valor mudar instantaneamente; rollback só em caso de erro.
- **Debounce + autosave silencioso** nos textareas de observações (já há padrão de rascunho — estender para os novos campos do `visit_template_overrides`). Remove cliques em "Salvar".
- **Virtualização** das listas longas (Bíblia, Notas, Itinerário anual) usando `@tanstack/react-virtual` — drástica queda de DOM (regra de performance) sem novo asset pesado.
- **Memoização cirúrgica** dos painéis de reunião (`React.memo` + chaves estáveis) — hoje re-renderizam em cascata quando um campo muda.

## 2. Navegação e descoberta

- **Command Palette (⌘K / botão flutuante)** com busca global: visitas, congregações, notas, versículos, modelos. Uma única tela acessa tudo — reduz cliques no menu lateral.
- **Breadcrumbs contextuais** no topo das telas internas (Itinerário → Congregação → Visita → Aba) — hoje é fácil "se perder" entre abas.
- **Atalhos de teclado** nas abas da Semana da Visita (1–7 troca de aba, `E` alterna modo edição, `Esc` sai). Custo: zero.
- **Botão "Próxima visita"** persistente no dashboard, levando direto ao Resumo do Dia.

## 3. Eficiência de banco (menos round-trips, mesmo schema)

- **Consolidar leituras da Semana da Visita** em uma única RPC (`get_visit_week_bundle`) que devolve modelos + overrides + linhas em um JSON. Hoje são ~6–8 selects por aba aberta.
- **`ensureQueryData` no loader** das rotas autenticadas (regra 9) para tudo que ainda usa `useEffect + fetch` — elimina o "flash" e reaproveita cache entre navegações.
- **`staleTime` agressivo** (5–10 min) para modelos e bíblia (mudam raramente). Reduz refetch em foco de janela.
- **Invalidations cirúrgicas** com `queryKey` por `visit_id` em vez de invalidar a árvore inteira após salvar override.
- **Prefetch ao passar o mouse** nos cards do Itinerário (`Link preload="intent"`) — abre instantâneo.

## 4. Offline e backup (sem ampliar payload)

- **Pré-cache da próxima visita** (semana atual + próxima do itinerário) — usuário entra em casa sem internet e já tem tudo.
- **Indicador discreto de "salvo na nuvem / na fila"** por campo (ícone pequeno) — reduz ansiedade do offline.
- **Compressão do .zip de backup** com nível 9 só nos JSONs grandes (bíblias) e nível 6 no restante — arquivo final menor, sem mais leituras.

## 5. Acessibilidade e mobile

- **Áreas de toque ≥ 44 px** em todos os botões de ação das abas (vários hoje têm 32 px).
- **Foco visível** consistente (atalho de Tab funciona, mas o anel some em alguns componentes).
- **Modo compacto** opcional para listas longas (toggle em Configurações) — útil em tablets.
- **Safe-area-inset** no rodapé das telas com FAB (já há para teclado virtual; faltam áreas com bottom nav).

## 6. Microinterações e polimento (sem framer pesado)

- Animações **CSS-only** de 150 ms ao alternar "Modo edição" da Semana da Visita.
- **Toast unificado** com ação "Desfazer" nas exclusões (esboços, notas, eventos de transporte) — reduz medo de errar.
- **Empty states ilustrados leves** (SVG inline, <2 kb) substituindo os "Nada por aqui" atuais.

## 7. Confiabilidade

- **Boundary de erro por aba** da Semana da Visita — uma aba quebrada não derruba a tela inteira.
- **Captura silenciosa** de falhas de sync offline com retry exponencial (já há fila; falta o retry).
- **Smoke tests** rápidos (Vitest) das funções `visit-summary` e `visit-template-extras` para travar regressões dos snapshots.

---

## Sugestão de ondas (para aprovar uma por vez)

1. **Onda 1 — Ganho imediato e barato**: skeletons, otimismo nas edições, atalhos de teclado, prefetch nos links do itinerário, `staleTime` em modelos/bíblia. (Sem migration, sem novo pacote pesado.)
2. **Onda 2 — Navegação**: Command Palette + breadcrumbs + boundary por aba.
3. **Onda 3 — Banco**: ✅ invalidations cirúrgicas (removido `invalidateQueries()` global no flush do rascunho; só as chaves tocadas + `visit-template-extras` quando há override). ⏸️ RPC `get_visit_week_bundle` e `ensureQueryData` nas rotas: requerem migrar os painéis (hoje usam supabase direto sem react-query) — recomendado tratar em onda própria para evitar regressão ampla.
4. **Onda 4 — Offline/backup**: ✅ retry exponencial da fila offline (backoff 5s→15s→1min→5min→15min, auto-flush ao voltar online + timer agendado para o próximo item maduro). ✅ compressão diferenciada do `.zip` de backup (nível 9 nos JSONs de bíblia, nível 6 no restante). ⏸️ pré-cache automático da próxima visita já é coberto pelo "Modo offline" existente (que pré-carrega todas as visitas); um warmup automático seria redundante até a Onda 3 migrar os painéis para React Query. ⏸️ indicador por campo ("salvo/na fila"): exigiria tocar dezenas de inputs — o `SyncButton` global já mostra pendências; deixar para onda de polimento.
5. **Onda 5 — Acessibilidade e polimento**: tamanhos de toque, foco, microinterações, empty states.

---

## Detalhes técnicos (resumo para referência)

- Sem novas tabelas. Apenas 1 RPC opcional (`get_visit_week_bundle`) na Onda 3, SECURITY DEFINER, lendo de tabelas já permitidas pelo RLS — sem custo adicional de armazenamento.
- Pacotes novos no máximo: `@tanstack/react-virtual` (~6 kb gz) e `cmdk` para o Command Palette (~10 kb gz). Nada de framer-motion adicional.
- i18n: cada string nova entra em `pt/en/es` (regra 10).
- Todas as edições do Superintendente continuam respeitando o `useMeetingsEditMode` recém-criado.

Me diga quais ondas (ou itens específicos) quer que eu implemente primeiro.
