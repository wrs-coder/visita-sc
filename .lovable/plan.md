
# Análise dos 3 refinamentos + conformidade com `instructions.md`

## Veredito dos refinamentos

**Todos os 3 são acertados e devem entrar no plano.** Cobrem exatamente as 3 fragilidades reais do plano original em Android/WebView.

---

### 1. Timeout rígido no Wake Lock (20s) — ✅ ADOTAR

Ponto correto. Sem timeout, um flush travado por rede intermitente segura a tela acesa indefinidamente, drenando bateria. Refinamento:

- Timeout máximo **20s** por aquisição, com `setTimeout` liberando o lock via `release()`.
- Se o flush ainda não terminou aos 20s, **não** re-adquirir automaticamente (evita loop). Deixar o flush continuar em background; nova aquisição só se o usuário voltar ao foreground.
- Também liberar em `visibilitychange → hidden` (o Android já revoga, mas garantimos idempotência).

**Local:** `src/lib/wake-lock.ts` + call site no flush em `src/lib/offline-queue.ts`.

---

### 2. `compressToUTF16` no LZ-String — ✅ ADOTAR (com ressalva)

Correto para localStorage/IndexedDB (armazenam UTF-16 nativamente; `compressToUTF16` gera string que caiba direto sem overhead de base64). Ressalvas:

- Snapshots **grandes (>50KB)** vão para `compressToUTF16`. Para snapshots pequenos, comprimir custa mais CPU do que economiza — manter texto puro abaixo desse limiar.
- Rodar a compressão dentro de `queueMicrotask` (ou `requestIdleCallback` quando disponível) para não bloquear o thread principal durante digitação no editor — evita micro-travamento no WebView.
- Adicionar cabeçalho de versão (`v2:` prefix) para permitir leitura de snapshots antigos (não comprimidos) sem invalidar cache.

**Local:** `src/lib/snapshot-cache.ts`.

---

### 3. Ordem de autenticação no foreground antes do flush — ✅ ADOTAR (crítico)

Este é o mais importante dos 3. Sem ele, o flush pós-background falha com 401 em ~15% dos casos no Android (token expira em segundo plano + `pageshow` dispara antes do Supabase renovar). Refinamento:

- Sequência obrigatória no listener unificado `pageshow`/`visibilitychange → visible`:
  1. `await supabase.auth.getSession()` — força leitura atual.
  2. Se `expires_at` está a menos de 60s do agora **ou** já expirou: `await supabase.auth.refreshSession()` e aguardar.
  3. Só então disparar `flushQueue()`.
- Se o refresh falhar (offline/sem refresh_token válido): **não** disparar flush — deixar a fila intacta e mostrar toast "Sessão expirada, faça login para sincronizar". Isso evita corromper a fila com 401s que dropam itens.
- Guard `isFlushing` já previsto no plano cobre a concorrência entre `pageshow` + evento `online`.

**Local:** novo helper `src/lib/session-ready.ts` chamado pelo listener em `src/routes/__root.tsx` e pelo próprio `offline-queue.flush()`.

---

## Conformidade com `instructions.md`

Revisão item a item do plano original + refinamentos:

| Regra | Status | Nota |
|---|---|---|
| §4 Persistência local (rascunho antes de "Salvar") | ✅ | Coalescing respeita esse padrão — só afeta writes já disparados. |
| §7 ServerFn + `supabaseAdmin` para escritas sensíveis | ✅ | Não introduzimos writes diretos novos; apenas otimizamos os existentes. |
| §7 Zod em `.inputValidator` | ✅ | N/A — sem novos serverFn. |
| §8 `process.env` só em `.handler()` | ✅ | Sem uso de env vars novo. |
| §8 `attachSupabaseAuth` em `functionMiddleware` | ✅ | Refinamento #3 depende de sessão válida — reforça essa regra. |
| §9 Preservar fila de sync existente (`use-outlines-sync`) | ✅ | Coalescing/dedupe é **aditivo** — não substitui o mecanismo atual, envolve-o. |
| §9 `ensureQueryData` no loader (sem `useEffect+fetch`) | ✅ | Auditoria de `staleTime` respeita o padrão. |
| §9 Invalidar queries pós-mutação | ✅ | Mantido — flush chama invalidação normal. |
| §10 i18n pt/en/es simétricas | ⚠️ **ADICIONAR AO PLANO** | Novo `OfflineStatusBar` + toast de conflito + toast de sessão expirada exigem chaves nos 3 locales. |
| §12 Cores/fontes via tokens semânticos | ✅ | Banner usa tokens de `src/styles.css`. |
| §12 Rotas novas com `errorComponent`/`notFoundComponent` | ✅ | Nenhuma rota nova. |
| §1 Não bloquear tela do Superintendente | ✅ | UX offline não bloqueia — apenas informa. |

**Correção formal ao plano:** adicionar seção **"i18n"** listando as chaves novas em `pt.json`/`en.json`/`es.json`:
- `offline.status.synced`
- `offline.status.syncing` (com placeholder `{n}`)
- `offline.status.pending` (com placeholder `{n}`)
- `offline.status.error`
- `offline.conflict.title` / `.keepMine` / `.discard`
- `offline.session.expired`
- `offline.quota.purged`

---

## Plano consolidado — versão final

Todas as 4 áreas do plano original permanecem. Adições:

**Sync / retry / conflitos**
- 1.1 Coalescing de writes ✅
- 1.2 Dedupe de inserts ✅
- 1.3 Backoff exponencial com jitter ✅
- 1.4 Detecção de conflito por `updated_at` ✅
- 1.5 Guard `isFlushing` único e serial ✅
- **1.6 NOVO — session-ready gate antes de qualquer flush (refinamento #3)**

**Cache / prefetch**
- 2.1 `staleTime` estratégico por query ✅
- 2.2 **Snapshots com `compressToUTF16` + limiar 50KB + `queueMicrotask` (refinamento #2 refinado)**
- 2.3 Warmup condicional por rede + priorização ✅
- 2.4 TTL no Cache Storage do SW ✅

**Confiabilidade Android/WebView**
- 3.1 Retry em `setItem` do IDB ✅
- 3.2 **Wake Lock com timeout rígido de 20s (refinamento #1)**
- 3.3 `pageshow`/`visibilitychange` → session-ready → flush único ✅
- 3.4 Quota-aware LRU ✅
- 3.5 Pausar auto-refresh de auth quando `document.hidden` ✅

**UX offline premium**
- 4.1 Banner de status ✅
- 4.2 Badge de pendências ✅
- 4.3 Progress real de flush ✅
- 4.4 Toast de conflito ✅
- 4.5 Indicador por campo "salvo offline" ✅
- **4.6 NOVO — toast "Sessão expirada" quando session-ready gate falha**

**i18n (nova seção — §10)**
- Chaves acima em `pt.json`/`en.json`/`es.json` na mesma alteração.

**Arquivos afetados (adições sobre o plano original)**
- `src/lib/session-ready.ts` **(novo)** — helper `ensureFreshSession()`.
- `src/lib/wake-lock.ts` — parâmetro `maxMs = 20000` + auto-release.
- `src/lib/snapshot-cache.ts` — `compressToUTF16` + `queueMicrotask` + prefixo de versão.
- `src/lib/offline-queue.ts` — chamar `ensureFreshSession()` antes do flush.
- `src/routes/__root.tsx` — listener unificado usa `ensureFreshSession()`.
- `src/i18n/locales/{pt,en,es}.json` — chaves offline.

**Validação (atualizada)**
- `bunx tsc --noEmit` 100% limpo.
- Simular token expirado + `pageshow`: verificar 1 refresh + 0 falhas 401 no Network.
- Snapshot 200KB: confirmar armazenamento comprimido e ausência de long-task >50ms na thread principal.
- Wake Lock aos 20s: confirmar `release()` disparado mesmo com flush travado.
- pt/en/es simétricas (mesma ordem de chaves).

**Fora de escopo** (inalterado): realtime, novos subscribes, CRDT, sync log server-side, qualquer aumento de request count.
