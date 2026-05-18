
# Offline-First — Visita SC

Objetivo: reduzir chamadas ao Supabase (plano grátis) e fazer o app abrir e funcionar sem rede, tanto no PWA quanto no APK Capacitor.

## 1. Cache persistente do TanStack Query (leitura instantânea)

- Adicionar dependências: `@tanstack/query-sync-storage-persister`, `@tanstack/react-query-persist-client`, `idb-keyval`.
- Em `src/router.tsx`:
  - Manter `staleTime: 5min` como padrão geral.
  - Criar `persistQueryClient` usando IndexedDB (via `idb-keyval`) com fallback para `localStorage`. `maxAge: 24h`, `buster` = versão do app.
- Em `src/routes/__root.tsx`: trocar `QueryClientProvider` por `PersistQueryClientProvider` (mantendo o `client` que vem do contexto do router).
- Resultado: qualquer `useQuery`/`useSuspenseQuery` ganha hidratação automática do disco → telas abrem instantaneamente sem rede.

## 2. Hooks de dados principais migrados para useQuery com cache longo

Converter os hooks/fetches mais usados em `useQuery` com `queryKey` estável e `staleTime: 12h`:

- `use-active-congregation` → `["congregations", userId]`
- `use-active-visit` → `["visits", congregationId]` (mantém realtime, mas invalida via `queryClient.invalidateQueries`)
- Leituras de `congregations`, `circuits` (se houver), relatórios em `_app.dashboard.tsx`, `_app.cronograma.tsx`, `_app.escala.tsx`, `_app.refeicoes.tsx`, `_app.reunioes-de-campo.tsx`, `_app.transporte.tsx`, `_app.checklist.tsx`.

Cada uma passa a usar uma `queryKey` consistente para participar do cache persistido.

## 3. Botão "Sincronizar" no topo

- Novo componente `src/components/SyncButton.tsx`:
  - Ícone `RefreshCw` discreto no header do layout `_app.tsx`.
  - `onClick` → `queryClient.invalidateQueries()` + flush da fila offline.
  - Mostra estado: ocioso / sincronizando / última sync (timestamp salvo em localStorage).
  - Indicador visual de online/offline (`navigator.onLine`).

## 4. Fila offline de escritas (mutations)

Novo módulo `src/lib/offline-queue.ts`:

```ts
type QueuedMutation = {
  id: string;
  table: string;
  op: "insert" | "update" | "upsert" | "delete";
  payload: unknown;
  match?: Record<string, unknown>; // p/ update/delete
  createdAt: string;
};
```

- Persistência em `localStorage` (chave `visita-sc:offline-queue`).
- API: `enqueue()`, `flush()`, `size()`, `subscribe()`.
- `flush()` envia em lote (uma chamada por tabela quando possível) usando `supabase.from(table).insert/update/...`. Em sucesso → remove da fila. Em falha de rede → mantém.

Novo hook `src/hooks/use-offline-mutation.ts`:
- Wrapper sobre `useMutation` que:
  - Aplica update otimista no cache do React Query.
  - Se `navigator.onLine === false` → `enqueue()` e retorna sucesso local.
  - Se online → tenta direto; em erro de rede também enfileira.
- Refatorar as escritas de relatório/visita mais críticas (checklist toggle, refeições, escala) para usá-lo. Cadastros pesados (criação de congregação, perfil) continuam direto online.

Auto-flush:
- Listener global em `__root.tsx`: `window.addEventListener("online", flush)` e flush no mount se online.
- Para Capacitor, também ouvir `document.addEventListener("resume", flush)`.

## 5. Service Worker reforçado para shell offline

Atualizar `public/sw.js`:
- Bump `VERSION` para `v2`.
- No `install`, pré-cachear o app shell: `/`, `/manifest.webmanifest`, ícones, e também os principais assets JS/CSS via `addAll` (best-effort) — opcional, já que `StaleWhileRevalidate` já cobre depois da 1ª visita.
- Manter estratégia atual (NetworkFirst HTML, NetworkFirst Supabase REST, SWR estáticos) — já está alinhada com offline-first; a persistência do React Query é que dá a UX instantânea.

## 6. Compatibilidade Capacitor

- IndexedDB e localStorage funcionam dentro do WebView Android → nada a ajustar no `capacitor.config.ts`.
- `npm run build` + `npx cap copy android` continuam funcionando: nenhuma dependência nativa nova.

## Arquivos a criar/editar

Criar:
- `src/lib/offline-queue.ts`
- `src/hooks/use-offline-mutation.ts`
- `src/components/SyncButton.tsx`

Editar:
- `src/router.tsx` — configurar persister
- `src/routes/__root.tsx` — `PersistQueryClientProvider` + listener `online`
- `src/routes/_app.tsx` — montar `<SyncButton />` no header
- `src/hooks/use-active-congregation.ts` — `useQuery` com cache 12h
- `src/hooks/use-active-visit.ts` — `useQuery` com cache 12h (mantém realtime)
- `src/hooks/use-auto-backup.ts` — sem mudança funcional
- `public/sw.js` — bump versão e shell expandido
- `package.json` — novas dependências

## Detalhes técnicos

- Persister: `experimental_createPersister` ou `createAsyncStoragePersister` apontando para `idb-keyval`. `maxAge: 1000*60*60*24` (24h), `buster` = `import.meta.env.VITE_APP_VERSION ?? "v1"`.
- `dehydrateOptions`: só persistir queries com `queryKey[0] !== "auth"` e que tenham dados (`state.status === "success"`).
- Realtime continua disparando `queryClient.invalidateQueries` para manter o cache fresco quando há rede.
- Fila offline NÃO inclui auth/login/signup (sempre online).

## Riscos conhecidos

- Cache persistido pode mostrar dados antigos após login com outro usuário → invalidar tudo no `onAuthStateChange("SIGNED_OUT" | "SIGNED_IN")` (já parcialmente coberto no root).
- Conflitos de escrita offline (mesmo registro editado em 2 dispositivos): última escrita vence — sem CRDT.

Após sua aprovação implemento tudo de uma vez.
