## Objetivo

Cobrir o cronômetro com testes/logs de regressão, validar o novo fluxo de anexos nos dois modos "tela cheia", garantir round-trip correto no Supabase e restaurar o sensor de "esqueceu de iniciar" caso tenha sido afetado.

## 1) Regressão do cronômetro (não acelerar com múltiplas instâncias)

- Novo arquivo `src/hooks/use-outline-timer.test.ts` (Vitest + `@testing-library/react`, já usado no projeto).
- Cenário: `renderHook` monta **três** instâncias do `useOutlineTimer("test-id")` simultaneamente (simula toolbar + banner fullscreen + sensor). Chama `.start()` em uma, avança `vi.useFakeTimers()` em 10s, e verifica que `elapsedSec === 10` em todas — não 30. Trava o bug: montar N vezes acelerava N×.
- Cenário complementar: pause/resume mantém o `elapsedSec` estável; reset zera.
- `bunx vitest run src/hooks/use-outline-timer.test.ts` deve passar.

## 2) Instrumentação de logs/métricas do `use-outline-timer`

- Adicionar utilitário interno `logTimerEvent(event, payload)` no próprio hook (dev only) — usa `import.meta.env.DEV` para não poluir produção.
- Sinaliza: `mount`, `start`, `pause`, `reset`, `tick-drift` (quando `deltaSec > 2`, útil para detectar aba em background), `broadcast-in`, `broadcast-out`.
- Em produção mantém um contador em `window.__outlineTimerMetrics` (opt-in) com `{ ticks, driftEvents, maxDelta }` para diagnóstico via console. Zero overhead se ninguém ler.
- Sem quebra de API pública.

## 3) Validar anexos + lightbox nos dois "tela cheia"

- Confirmar via Playwright headless (`/tmp/browser/attachments/`) num roteiro:
  1. Abrir `/consideracoes-campo` → criar/abrir esboço com 1 foto + 1 link → tela cheia da aba → clicar na miniatura da foto (lightbox abre) → clicar no fundo/X (fecha) → **duplo toque no conteúdo** deve manter o dialog aberto (regra herdada da correção anterior).
  2. Abrir dashboard → tela cheia da nota → confirmar barra de anexos visível em `readOnly` (sem X), clique na foto abre lightbox, clique no X do lightbox fecha, popup pai continua aberto.
- Se algum handler no lightbox propagar o click e fechar o `FieldNoteFullscreenDialog`, ajusto `AttachmentLightbox` para `e.stopPropagation()` no wrapper `role="dialog"` e no `onKeyDown` (Escape só fecha o lightbox, não o dialog pai). Já está com `stopPropagation` no `<img>` e no botão, mas o backdrop `onClick={onClose}` sobe para o dialog pai — vou envolver com `stopPropagation` também.

## 4) Vídeos/publicações consistentes na tela cheia

- Hoje `OutlineAttachmentsBar` chama `openExternalUrl(a.url)` — funciona nos dois modos porque o componente é o mesmo. Vou apenas:
  - Garantir que `toDisplaySrc` **não** é aplicado para vídeo/publicação (é só para `photo`) — já está correto, mas adicionar teste unitário curto em `src/lib/outline-attachments.test.ts` cobrindo:
    - `toDisplaySrc("file:///a.jpg")` no ambiente sem Capacitor devolve a mesma string;
    - `toDisplaySrc("https://x/y")` passa direto;
    - `isLikelyValidUrl("jwlibrary://...")` → true; `"foo"` → false.
  - Deep-link Android: `openExternalUrl` já cai em `window.open` silencioso — sem mudança.
  - Miniatura de vídeo/publicação exibe título truncado (já ok) e ícone (`PlayCircle` / `FileText`).

## 5) Serialização `content_json` (Supabase round-trip)

- Revisar `src/hooks/use-outlines-sync.ts` (linhas 57 e 194) e `src/lib/personal-outlines.functions.ts` (schema Zod linha 40):
  - Confirmar que fotos com `uri: "file://…"` gravadas no Filesystem **não** são enviadas ao Supabase se o dispositivo não deve replicá-las (regra: fotos são locais). A URI ainda é serializada — se o outro dispositivo receber, `toDisplaySrc` devolve string vazia e o card mostra fallback `FileText`. Isso é o comportamento desejado; documentar no schema comment.
  - Adicionar teste em `src/hooks/use-outlines-sync.test.ts` (novo) validando que um `attachments: [photo, video, publication]` sobrevive a `serialize → JSON.parse(JSON.stringify(...)) → deserialize` sem perder campos.
- Se o schema Zod estiver rejeitando algum `kind`, ampliar `attachmentSchema` para `z.enum(["photo","video","publication"])`.

## 6) Sensor "esqueceu de iniciar" (60s)

- Reler `OutlineInactivitySensor.tsx` — a lógica de owner + `INACTIVITY_MS = 60_000` está intacta e nada nos ajustes recentes tocou aí.
- Validação manual via Playwright: abrir esboço vazio, aguardar 60s (com `vi.useFakeTimers` no teste unitário e com `page.wait_for_timeout` no e2e), o banner âmbar aparece no topo. Clicar em `5min` inicia o cronômetro e some.
- Adicionar teste `src/components/notes/OutlineInactivitySensor.test.tsx` que:
  - Monta o sensor com `outlineId="x"`, avança `vi.advanceTimersByTime(60_000)` e espera `screen.getByRole("alert")` visível;
  - Ao iniciar o timer (via `useOutlineTimer("x").start()` de outra instância), o banner some.
- Se o teste falhar por regressão real (ex.: ownership travado depois de desmontar), corrijo o cleanup no `useEffect` de ownership para garantir decremento correto.

## Validação final

- `bunx vitest run` (novos testes verdes)
- `bunx tsgo --noEmit` limpo
- Playwright screenshots dos 2 fullscreens (esboço + dashboard) com anexos e do banner do sensor após 60s

## O que NÃO muda

- Nenhuma alteração no modelo de dados, nas RLS policies, nas rotas de auth, no dashboard ou nos relatórios.
- Nenhuma nova dependência npm.
