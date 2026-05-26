
## Missão 1 — Modo Offline Manual (pré-cache de dados)

**Objetivo:** botão que baixa proativamente todos os dados do usuário ativo (perfil, congregação, visitas, modelos, eventos, refeições, etc.) e os deixa armazenados via TanStack Query + IndexedDB persister (já existe `query-persister.ts`), além de proteger a navegação contra falhas de chunk dinâmico.

### Novos arquivos
- `src/lib/offline-prefetch.ts` — função `prefetchAllForOffline(opts)` que recebe `{ queryClient, userId, congregationId, role, onProgress }`. Internamente faz chamadas Supabase em sequência paginada com passos nomeados (`profile`, `congregations`, `visits`, `schedule_events`, `meals`, `field_assignments`, `field_meetings`, `transport_schedule`, `checklist_items`, `midweek/weekend/pioneer/elders`, `circuit_schedule_events`, todos os `*_templates` e `*_template_items`, `private_notes` se super). Cada passo grava no `queryClient` via `setQueryData(['offline', table, scope], data)` para entrar no persister (já dehidrata `success`). `onProgress({ step, current, total, label })` reporta progresso. Tudo `try/catch` por passo — uma falha individual incrementa contador de erros mas não aborta o fluxo.
- `src/components/OfflineModeDialog.tsx` — `Dialog` (shadcn) com `Progress`, label do passo atual ("Sincronizando: 45% — Refeições…"), botão Cancelar (AbortController) e estado final (sucesso / parcial). Marca `localStorage["visita-sc:offline-ready"] = ISO` quando termina.
- `src/components/OfflineModeButton.tsx` — botão `CloudDownload` reutilizável que abre o `OfflineModeDialog`. Mostra badge "Atualizado há Xh" quando já existe a flag.
- `src/components/ChunkErrorBoundary.tsx` — `class` ErrorBoundary que captura erros com `/failed to fetch dynamically imported module|Loading chunk|ChunkLoadError/i`, mostra card amigável "Sem conexão para carregar esta tela — toque para tentar novamente" + botão que faz `location.reload()`. Não engole outros erros (rethrow).

### Edições
- `src/routes/_app.tsx`
  - Importar `OfflineModeButton` e renderizar logo abaixo do `SidebarHeader` (acima da `<Nav />`), tanto no Sheet mobile quanto na aside desktop.
  - Envolver `<Outlet />` em `<ChunkErrorBoundary>`.
- `src/router.tsx` — reduzir `staleTime` não muda; já está OK. Sem alterações.
- `src/i18n/locales/{pt,en,es}.json` — chaves `offline.modeTitle`, `offline.modeDesc`, `offline.start`, `offline.cancel`, `offline.step.*`, `offline.done`, `offline.partial`, `offline.lastSync`, `offline.chunkError`, `offline.retry`.

### Notas de segurança
- Operação é **somente leitura**: usa `supabase.from(...).select(...)` com filtros já permitidos por RLS (mesmas queries que as telas usam). Nenhuma escrita, nenhum trigger, nenhum SQL novo.
- Reaproveita o persister IndexedDB existente (`query-persister.ts`) — nada de novo store.
- `networkMode: "offlineFirst"` já configurado garante priorização do cache em telas seguintes.

---

## Missão 2 — Excluir evento do cronograma

**Objetivo:** ação destrutiva no `EventCard` com confirmação e fluxo offline-first.

### Edições
- `src/routes/_app.cronograma.tsx`
  - No `EventCard` (apenas quando `canEdit`), adicionar botão `Trash2` (variante `ghost` destrutivo) ao lado do `Pencil`.
  - Usar `AlertDialog` (shadcn) para confirmação "Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita." com botões Cancelar / Excluir.
  - Handler `onDelete(id)` chama `offlineDelete("circuit_schedule_events", { id })` — já enfileira quando offline (vide `offline-supabase.ts` + `offline-queue.ts`). Toast: `t("schedule.deletedToast")` ou `t("common.savedOffline")` se `queued`.
- `src/i18n/locales/{pt,en,es}.json` — chaves `schedule.delete`, `schedule.confirmDeleteTitle`, `schedule.confirmDeleteDesc`, `schedule.deletedToast`.

### Notas de segurança
- Nenhuma mudança em RLS (a política `super manages own circuit events` já cobre DELETE para o próprio superintendente).
- Não toca em outras tabelas. Reutiliza o caminho `offline-supabase` existente.

---

## Missão 3 — Aba "Resumo da Semana" para o Superintendente

**Objetivo:** réplica funcional da visualização do painel do convidado (Acesso Corpo de Anciãos), exibida dentro do app autenticado do superintendente, como primeira entrada da seção "Semana da Visita" no sidebar.

### Estratégia (reuso máximo, zero duplicação de RLS)
- Extrair o conteúdo de renderização puro de `src/routes/visitante.painel.tsx` (tabs, cards, exportação PDF/PNG) para um componente apresentacional: `src/components/visit-summary/VisitSummaryView.tsx` que recebe `{ snap: Snapshot, mode: "guest" | "super" }`. Em `mode === "super"` esconde botões de "Sair" do convidado e mantém os botões de exportar (PDF/PNG já corrigidos com `saveBlob`).
- Refatorar `visitante.painel.tsx` para apenas: carregar snapshot via `getGuestSnapshot` (inalterado) e renderizar `<VisitSummaryView snap={snap} mode="guest" />`. **Sem mudanças de lógica nem de exportação.**

### Nova rota
- `src/routes/_app.resumo-semana.tsx` — `createFileRoute("/_app/resumo-semana")`. Em vez de chamar `getGuestSnapshot` (que exige `invite_code`), criar um pequeno wrapper que reaproveita o mesmo *snapshot shape* via novo server fn:
  - `src/lib/visit-summary.functions.ts` → `getSuperVisitSummary` (`createServerFn POST` + `requireSupabaseAuth`) que recebe `{ congregationId }`, valida que o caller é superintendente daquela congregação (via `is_superintendent_of` ou checagem direta em `congregations.superintendent_id = userId`), e roda **as mesmas queries** do `getGuestSnapshot` usando `supabase` autenticado (RLS já permite o super ler tudo da sua congregação). Retorna exatamente o mesmo `Snapshot` (sem `wifeMode`).
- A nova rota usa `useActiveCongregation()` para obter `congregationId` e renderiza `<VisitSummaryView snap={snap} mode="super" />`. Se não houver congregação ativa, mostra empty state pedindo para selecionar.

### Sidebar
- `src/routes/_app.tsx` — na `NavSection` `"visita"`, inserir **como primeiro item**: `{ to: "/resumo-semana", label: t("sidebar.weekSummary"), icon: ClipboardList }`.
- `i18n` — `sidebar.weekSummary` em PT/EN/ES.

### Notas de segurança / RLS
- **Nada de SQL novo.** A função usa o cliente Supabase autenticado; as policies vigentes (`members read schedule`, `members read meals`, etc., baseadas em `get_user_congregation` / `is_superintendent_of`) já permitem ao super da congregação ler tudo. Comportamento idêntico ao painel do convidado, mas sem precisar do `invite_code` nem do bypass `supabaseAdmin`.
- Read-only puro. Sem `updated_at`, sem fila offline, sem triggers.

---

## Diretrizes gerais aplicadas
- **Estabilidade nativa:** os botões de exportação dentro de `VisitSummaryView` continuam usando `saveBlob`/`shareViaCapacitor` exatamente como hoje — sem regressão.
- **Modularização:** `share.ts`, `offline-supabase.ts`, `offline-queue.ts`, `query-persister.ts` e o `VisitSummaryView` extraído são reutilizados; nenhuma duplicação.
- **Sem mudanças de schema/RLS** em nenhuma das três missões.
- **ErrorBoundary** específico para chunks evita que falhas de import dinâmico (comum no APK offline) derrubem toda a navegação.

### Resumo de arquivos
- **Criar:** `src/lib/offline-prefetch.ts`, `src/components/OfflineModeButton.tsx`, `src/components/OfflineModeDialog.tsx`, `src/components/ChunkErrorBoundary.tsx`, `src/components/visit-summary/VisitSummaryView.tsx`, `src/lib/visit-summary.functions.ts`, `src/routes/_app.resumo-semana.tsx`.
- **Editar:** `src/routes/_app.tsx` (sidebar + boundary), `src/routes/_app.cronograma.tsx` (botão excluir + AlertDialog), `src/routes/visitante.painel.tsx` (refatorar para usar `VisitSummaryView`), `src/i18n/locales/{pt,en,es}.json` (chaves novas).
