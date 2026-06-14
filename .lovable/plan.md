## AJUSTE 01 — Scroll interno constante no editor (Modo edição imersivo)

**Problema:** no modo imersivo (`metaCollapsed` em `_app.consideracoes-campo.tsx`), o editor é renderizado com `minHeight: "calc(100dvh - 14rem)"` e `maxHeight: "none"`. Como `min == max`, o container só cria scroll interno quando o conteúdo ultrapassa a viewport — antes disso o usuário precisa rolar a página inteira.

**Solução:** fixar uma altura "janela" para o editor: `minHeight = maxHeight = "calc(100dvh - 14rem)"`. Como o container já tem `overflow-y-auto` (linha 258 de `RichNoteEditor.tsx`), o scroll vertical interno passa a estar sempre disponível, independente da quantidade de texto. A área de digitação fica visível em ~2000 caracteres e o usuário pode rolar dentro da janela ou usar o scroll da página, exatamente como solicitado.

**Arquivo:**
- `src/routes/_app.consideracoes-campo.tsx` (linhas ~2033-2034): trocar `maxHeight={metaCollapsed ? "none" : "60vh"}` por `maxHeight={metaCollapsed ? "calc(100dvh - 14rem)" : "60vh"}`.

Nenhuma mudança em `RichNoteEditor` — o componente já trata `maxHeight` corretamente.

---

## AJUSTE 02 — Download 1×/dia também na Onda 7.4 "Offline super"

**Diagnóstico:** o gate "1×/dia" do `useOfflineWarmup` já está ativo. O delay restante ao reabrir o app vem de outro hook automático: **`useOutlinesSync`** (`src/hooks/use-outlines-sync.ts`, linhas 251-290). Ele dispara `syncNow()` em vários gatilhos sem nenhum gate diário:

- mount inicial (quando `user` fica disponível)
- evento `online`
- `visibilitychange` (voltar para a aba/app)
- `resume` (Capacitor / volta de segundo plano)
- `SIGNED_IN` / `TOKEN_REFRESHED` do Supabase

Cada `syncNow()` faz round-trip ao Supabase (list + replace), gerando exatamente o "delay ao retornar" que o usuário descreve. Em modo offline ativo, isso é desperdício total.

Além disso, `prefetchAllForOffline` (chamado manualmente em `OfflineModeDialog` e `ConnectionModeToggle`) hoje sempre baixa tudo, mesmo quando a pré-carga do dia já existe.

**Solução — aplicar o mesmo gate `localDayKey` em três pontos:**

### 1. `src/hooks/use-outlines-sync.ts`
- Extrair helper `syncedToday()` que lê `LAST_SYNC_KEY` do `localStorage` e compara com `localDayKey(Date.now())` (mesma função usada em `use-offline-warmup.ts`; mover para `src/lib/connection-mode.ts` ou um util compartilhado).
- No `useEffect`, antes de chamar `tryRun(...)` por `mount`, `visible`, `resume`, `online`, `TOKEN_REFRESHED`: pular se `syncedToday()` for verdadeiro **e** `isOfflineMode() === false` não exigir. Em modo offline, sempre pular sync automático (não há para onde sincronizar com utilidade no fluxo de leitura).
- Manter `SIGNED_IN` rodando sempre (login do dia = pode ser primeira vez).
- Manter `syncNow()` exportado disparável manualmente (botão "Sincronizar" e ativação do Modo Offline continuam funcionando).

### 2. `src/hooks/use-offline-warmup.ts`
- Mover `localDayKey` e `warmupFresh` para `src/lib/offline-prefetch.ts` (ou util novo), expondo `isOfflinePrefetchFreshToday(congId)`.
- Sem mudança funcional aqui — só refatoração para reuso.

### 3. `src/components/OfflineModeDialog.tsx` e `src/components/ConnectionModeToggle.tsx`
- Antes de chamar `prefetchAllForOffline`, checar `isOfflinePrefetchFreshToday(congId)`. Se verdadeiro:
  - Pular o download.
  - Mostrar toast "Dados já atualizados hoje" + marcar `setMode("offline")` direto (no toggle) ou fechar diálogo com sucesso (no dialog).
- Adicionar botão secundário "Forçar atualização" que ignora o gate (para o caso raro do usuário querer redownload manual).

### 4. `src/router.tsx`
- Subir `staleTime` de `12h` para `24h` para alinhar React Query ao gate diário. O `query-persister` já hidrata do `localStorage`, então telas abrem instantâneas e não disparam refetch até o dia seguinte.

---

## Detalhes técnicos

- Helper compartilhado:
  ```ts
  export function localDayKey(ts: number): string { /* YYYY-MM-DD local */ }
  export function isFreshToday(key: string, congId: string | null): boolean { /* checa localStorage[key].at == hoje && congId bate */ }
  ```
- `LAST_SYNC_KEY` (outlines) e `LAST_WARMUP_KEY` (prefetch) continuam separados — gates independentes por tipo de carga.
- `isOfflineMode()` continua bloqueando rede para queries no fluxo normal; o gate diário é a camada extra que evita sync mesmo em modo online quando o dado do dia já existe.
- Botão "Sincronizar" (`SyncButton`) e ativação manual do Modo Offline permanecem como override explícito do usuário.
- Verificação final: `bunx tsc --noEmit` limpo; smoke test mental do fluxo "abrir app duas vezes no mesmo dia → segunda vez não chama Supabase".

## Fora de escopo
- Não tocar em `auth-attacher`, `client.ts`, schemas, ou lógica de negócio.
- Não alterar UI/visual além do que descrito em AJUSTE 01.
