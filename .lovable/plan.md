## Missão 06 — Timer de Esboço (escopo revisado)

Cronômetro nativo, 100% local, por nota. Aplicado em **toda** superfície de leitura/edição de esboço:

| Superfície | Inline (toolbar) | Banner fullscreen |
|---|---|---|
| `/consideracoes-campo` · subaba **Consideração de Campo** | ✅ | ✅ |
| `/consideracoes-campo` · subaba **Esboço** | ✅ | ✅ |
| `/consideracoes-campo` · subaba **Anotações** | ❌ (regra Missão 02) | ❌ |
| `/dashboard` · `FieldNoteFullscreenDialog` (Consideração + Esboço da Semana) | — | ✅ |

Mesmo `outlineId` em todas as superfícies → estado de tempo, modo e wakelock seguem a nota onde quer que ela seja aberta.

---

### 1. Hook — `src/hooks/use-outline-timer.ts`

`useOutlineTimer(outlineId: string | null)` retorna:

```ts
{
  mode: "countdown" | "countup",
  targetSec: number,        // default 30*60; presets 5/10/15/30/45 min ou custom 1–120 min
  elapsedSec: number,
  remainingSec: number,     // max(targetSec - elapsedSec, 0)
  isRunning: boolean,
  progressPct: number,      // (elapsed / target) * 100
  alertLevel: "green" | "amber" | "red",
  start(): void;
  pause(): void;
  toggle(): void;
  reset(): void;            // pausa + elapsed = 0
  toggleMode(): void;
  setTarget(seconds: number): void;
}
```

- **Persistência**: chave `visita-sc:outline-timer:<outlineId>` com
  `{ mode, targetSec, elapsedSec, isRunning, lastTickAt }`. Grava a cada
  tick (1 s) enquanto rodando + em toda mutação.
- **Drift recovery**: ao montar, se `isRunning` no storage, soma
  `Date.now() - lastTickAt` (clampado em ≥ 0) a `elapsedSec` antes de
  retomar — sobrevive a reload, troca de aba, navegação Dashboard ↔ Esboços.
- **Tick**: `setInterval(1000)` apenas quando `isRunning`. Em
  `countdown`, ao atingir `elapsedSec >= targetSec` o timer pausa
  automaticamente e mantém `alertLevel: "red"` (sem som).
- **Alertas**: `< 80%` → green, `80–95%` → amber, `≥ 95%` → red.
- **Compartilhamento entre superfícies**: o hook escuta o evento
  `storage` (multi-aba) **e** um `BroadcastChannel("outline-timer")` (mesma
  aba, várias instâncias — ex.: inline + banner do dashboard abertos juntos).
  Toda mutação publica `{ outlineId, snapshot }`; receptores com o mesmo
  `outlineId` atualizam o estado sem disparar novo tick redundante.
- **Sem outlineId**: retorna um stub no-op (componentes podem montar sem
  quebrar quando ainda não há nota selecionada).

### 2. Wake Lock — `src/lib/wake-lock.ts`

Wrapper isolado em torno de `navigator.wakeLock.request("screen")`:

- `acquireScreenWakeLock()` / `releaseScreenWakeLock()` idempotentes,
  com contagem de referências (cobre dois timers ativos ao mesmo tempo).
- Reatacha automaticamente no `visibilitychange` quando a aba volta
  visível (a API libera o sentinel ao esconder).
- Guarda `typeof navigator !== "undefined" && "wakeLock" in navigator`.
  Funciona dentro do WebView do Capacitor sem exigir plugin nativo novo.
  Falhas silenciosas (try/catch) — timer continua funcionando se o
  navegador não suportar.

### 3. Componente — `src/components/notes/OutlineTimer.tsx`

Props: `{ outlineId: string; variant: "toolbar" | "fullscreen"; className?: string }`.

UI compartilhada:
- Mostrador `MM:SS` com `tabular-nums`, cor por `alertLevel`
  (`text-emerald-600` / `text-amber-500` / `text-destructive` — tokens).
- **Tap rápido no mostrador** → `toggleMode()` (countdown ↔ countup).
- Botão Play/Pause (Lucide `Play`/`Pause`) → `toggle()`.
- Botão Reset (Lucide `RotateCcw`) → `reset()`.
- Botão Timer (Lucide `Timer`) abre Popover com presets
  5/10/15/30/45 min + input numérico custom (1–120). Padrão 30 min.

Variantes:
- `toolbar`: linha de altura `h-7`, ícones `h-3.5 w-3.5`, mostrador `text-xs`.
- `fullscreen`: `fixed top-0 inset-x-0 z-[105] border-b
  bg-background/85 backdrop-blur py-1.5 px-3 flex items-center
  justify-center gap-3`, mostrador `text-lg`. Popover bíblico (Missão 03)
  segue acima (`z-[110]`).

Apenas tokens semânticos — zero hex inline.

### 4. Integração

**`src/components/notes/RichNoteToolbar.tsx`**
- Nova prop opcional `outlineId?: string`. Quando presente, renderiza
  `<OutlineTimer variant="toolbar" outlineId={outlineId} />` no canto
  direito, separado por divisor vertical. Sem `outlineId` → não renderiza
  (compatibilidade preservada).

**`src/components/notes/RichNoteEditor.tsx`**
- Nova prop opcional `outlineId?: string`, repassada ao toolbar.

**`src/routes/_app.consideracoes-campo.tsx`**
- Ao montar `<RichNoteEditor>`, passa `outlineId={draft.id}` **somente
  quando** `activeType !== "talk_notes"` (cobre `field_consideration` e
  `outline`).
- `FullscreenOutline`: monta `<OutlineTimer variant="fullscreen"
  outlineId={note.id} />` no topo. Aplica padding-top dinâmico ao
  container de leitura via `ref` + `ResizeObserver` medindo a altura do
  banner; fallback `pt-12` se observer indisponível. Não renderiza para
  `talk_notes`.

**`src/components/dashboard/FieldNoteFullscreenDialog.tsx`**
- Renderiza `<OutlineTimer variant="fullscreen" outlineId={noteId} />`
  ancorado ao topo do `DialogContent` (ou via portal ao `document.body`
  se o dialog não permitir banner sticky no topo limpo; decisão final na
  implementação após inspecionar a estrutura do dialog).
- Aplica padding-top dinâmico ao container de conteúdo da mesma forma.
- Atende automaticamente os atalhos **Consideração de Campo** e **Esboço
  da Semana** do dashboard, porque ambos usam esse dialog com o `noteId`
  correto. Sincronização cross-surface garantida pelo `BroadcastChannel`
  do hook.

### 5. i18n — `personalOutlines.timer.*` (pt/en/es)

`play`, `pause`, `reset`, `setTarget`, `presetMin`, `custom`, `minutes`,
`countdown`, `countup`, `tooltipToggleMode`.

### 6. Restrições

- Zero chamadas a Supabase / serverFn — apenas `localStorage` + eventos
  in-browser.
- Não toca em `talk_notes`.
- Build `bunx tsc --noEmit` 100% limpo antes de fechar a onda.
- Apenas tokens semânticos de cor (Onda 6.8).

### 7. Arquivos

Novos:
- `src/lib/wake-lock.ts`
- `src/hooks/use-outline-timer.ts`
- `src/components/notes/OutlineTimer.tsx`

Alterados:
- `src/components/notes/RichNoteToolbar.tsx` (prop nova)
- `src/components/notes/RichNoteEditor.tsx` (prop nova, repassa)
- `src/routes/_app.consideracoes-campo.tsx` (passa `outlineId`,
  monta banner no `FullscreenOutline`)
- `src/components/dashboard/FieldNoteFullscreenDialog.tsx` (banner +
  padding dinâmico)
- `src/i18n/locales/{pt,en,es}.json`
- `.lovable/plan.md`
