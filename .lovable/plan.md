
## Objetivo

Substituir o botão atual "Ativar Modo Offline" por um **seletor visual** (verde = Online, amarelo = Offline) que o usuário pode alternar a qualquer momento. O modo escolhido governa **como o app lê e escreve dados**, e impede logout automático para que o app continue utilizável sem internet.

---

## Como cada modo se comporta

### Modo Offline (seletor amarelo)
- Toda leitura vem **só do cache local** (TanStack Query persistido + snapshots em localStorage). Nenhuma chamada de rede ao Supabase, mesmo se a internet estiver disponível.
- Toda escrita (criar/editar/excluir) é **enfileirada** em `offline-queue` — nada vai ao servidor.
- O app **não tenta validar sessão** com o Supabase; se a sessão estiver no `localStorage`, o usuário entra direto. Sem auto-logout em caso de token expirado.
- Toast de aviso: "Modo Offline ativo — alterações ficam guardadas até você sincronizar."

### Modo Online (seletor verde)
- Leituras: **cache primeiro** (sem refetch automático), servidor só quando o usuário clica em **Sincronizar**.
- Escritas: vão **direto ao servidor** quando a rede está disponível; se a rede falhar, caem na fila offline (igual ao comportamento atual de `offline-supabase.ts`).
- Clicar em **Sincronizar** dispara: (a) `flushQueue` (envia fila pendente) + (b) `prefetchAllForOffline` silencioso (atualiza cache local com dados frescos do servidor) + (c) `queryClient.invalidateQueries`.

### Alternância
- Trocar Online → Offline: aborta refetches em andamento, marca flag. Nenhum dado é perdido.
- Trocar Offline → Online: dispara automaticamente um Sincronizar (após confirmação rápida do usuário) para empurrar a fila acumulada.

---

## Mudanças no código

### 1. Novo estado global `connection-mode`
**Novo arquivo `src/lib/connection-mode.ts`**
- Tipo: `"online" | "offline"`.
- Persiste em `localStorage` (`visita-sc:connection-mode`), default `"online"`.
- API: `getMode()`, `setMode(m)`, `subscribe(cb)`, hook `useConnectionMode()`.
- Função `isOfflineMode()` — usada por toda a camada de dados para curto-circuitar chamadas.

### 2. Camada de dados respeita o modo
**Editar `src/lib/offline-supabase.ts`**
- `isOffline()` passa a retornar `true` se `navigator.onLine === false` **OU** `getMode() === "offline"`.
- Resultado: todos `offlineInsert/Update/Delete/Upsert` enfileiram automaticamente em Modo Offline.

**Editar `src/router.tsx` (QueryClient)**
- Em Modo Offline, mudar `networkMode` para `"always"` ainda quebra; usar `defaultOptions.queries.queryFn` wrapper não é viável.
- Solução simples: aumentar `staleTime` para `Infinity` em Offline e expor um helper `pauseRefetches()` que define `queryClient.setDefaultOptions({ queries: { enabled: false }})` enquanto Offline. Reverte ao voltar pra Online.

**Editar `src/hooks/use-auth.tsx`**
- Em Modo Offline: **não chamar** `supabase.auth.getSession()` nem registrar listener que limpa state em `SIGNED_OUT`. Reconstrói `user/session/profile` a partir do `localStorage` (snapshot já gravado no último login online + cache de perfil).
- `signOut()` continua funcionando mas exige confirmação extra em Modo Offline (avisa que vai perder dados pendentes na fila).
- Remover qualquer redirect-to-login em erro de rede; apenas redireciona em `SIGNED_OUT` explícito.

### 3. UI do seletor
**Novo `src/components/ConnectionModeToggle.tsx`** — substitui `OfflineModeButton`:
- Switch visual com 2 estados:
  - **Online (verde)**: ícone `Wifi`, fundo `bg-emerald-500/15`, borda esmeralda, label "Online".
  - **Offline (amarelo)**: ícone `WifiOff`, fundo `bg-amber-500/15`, borda âmbar, label "Offline".
- Exibe há quanto tempo foi a última sincronização (reaproveita `getOfflineReadyAt()`).
- Clique abre dialog de confirmação:
  - Indo pra **Offline**: explica comportamento + oferece "Baixar dados agora" (roda `prefetchAllForOffline` antes de trocar — garante que terá dados pra ler offline).
  - Indo pra **Online**: explica que vai sincronizar pendências; mostra contagem da fila; botão "Trocar e Sincronizar".

**Editar `src/routes/_app.tsx`** — trocar `<OfflineModeButton />` por `<ConnectionModeToggle />` na sidebar.

**Editar `src/components/SyncButton.tsx`**:
- Em Modo Offline o botão fica desabilitado com tooltip "Você está em Modo Offline — alterne para Online para sincronizar".
- Em Modo Online, ao sincronizar, também roda `prefetchAllForOffline` em background (cache fresco).

### 4. Login funcional offline
**Editar `src/components/auth/LoginForm.tsx`**:
- Se `getMode() === "offline"` E há sessão salva em `localStorage` (`sb-*-auth-token`), pular tela de login e ir direto pro app (hook `use-auth` já reconstrói).
- Se Offline e não há sessão salva: mostra mensagem "Conecte-se à internet pelo menos uma vez para fazer o primeiro login" — não tenta ir ao Supabase.

**Editar `src/routes/__root.tsx`** (listener `onAuthStateChange`):
- Em Modo Offline, **ignorar** eventos `TOKEN_REFRESHED` falhos e `SIGNED_OUT` causados por refresh-token vencido. Apenas `SIGNED_OUT` originado de clique no botão sai de fato.

### 5. Service Worker (já em v3)
- Nenhuma mudança estrutural necessária — a navegação em Modo Offline cai naturalmente no fallback `caches.match`.
- Adicionar header `X-Connection-Mode` em `fetch` interceptados? **Não** — manter SW agnóstico.

### 6. i18n
**Editar `src/i18n/locales/{pt,en,es}.json`** — novas chaves:
- `connection.modeOnline`, `connection.modeOffline`
- `connection.switchToOnline`, `connection.switchToOffline`
- `connection.offlineActiveBanner`, `connection.confirmGoOnline`, `connection.confirmGoOffline`
- `connection.firstLoginNeedsInternet`

---

## Por que não quebra APK / PWA

- APK é um wrapper sobre `https://visita-sc.lovable.app` — herda tudo automaticamente após publicar.
- Service Worker v3 já lida com navegação offline; o seletor só adiciona uma camada de decisão **antes** das chamadas, não mexe na rede em si.
- `supabase-js` já persiste sessão em `localStorage` por padrão (`persistSession: true`); ignorar o auto-refresh em Modo Offline é seguro porque os JWTs ficam válidos por ~1h e as escritas são enfileiradas com `enrich()` (usa contexto local, não exige token válido).
- Nenhuma migração SQL é necessária.

---

## Arquivos a criar / editar

**Criar**
- `src/lib/connection-mode.ts`
- `src/components/ConnectionModeToggle.tsx`

**Editar**
- `src/lib/offline-supabase.ts` (respeitar modo)
- `src/hooks/use-auth.tsx` (sem auto-logout offline, reconstruir do cache)
- `src/components/auth/LoginForm.tsx` (login offline via sessão salva)
- `src/routes/__root.tsx` (filtro de eventos auth em Offline)
- `src/routes/_app.tsx` (trocar botão pelo toggle)
- `src/components/SyncButton.tsx` (desabilitado em Offline, prefetch ao sincronizar)
- `src/router.tsx` (pausar refetches em Offline)
- `src/i18n/locales/{pt,en,es}.json` (novas strings)

**Sem migração de banco. Sem novas dependências.**
