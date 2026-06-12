# Onda 7.12 — Missão 06 ✅ entregue

## Timer de Esboço (cronômetro nativo)

### Novos arquivos
- `src/lib/wake-lock.ts` — wrapper do Web Wake Lock API com contagem
  de referências, reanexa no `visibilitychange`. Funciona no WebView
  do Capacitor; falhas silenciosas.
- `src/hooks/use-outline-timer.ts` — `useOutlineTimer(outlineId)`:
  - Estado por nota em `localStorage` (`visita-sc:outline-timer:<id>`).
  - **Drift recovery**: ao montar, se `isRunning`, soma
    `Date.now() - lastTickAt` ao `elapsedSec` — sobrevive a reload,
    fechamento acidental, navegação dashboard ↔ esboço.
  - Tick 1 s só quando rodando. Countdown pausa sozinho ao bater no alvo.
  - **Sync cross-surface**: `BroadcastChannel("visita-sc:outline-timer")`
    + listener `storage` (multi-aba). Inline, fullscreen e dashboard
    espelham o mesmo timer da mesma nota.
  - Wakelock acoplado a `isRunning` (acquire/release com refcount).
  - Alertas: < 80 % verde, 80–95 % âmbar, ≥ 95 % vermelho.
- `src/components/notes/OutlineTimer.tsx` — variantes `toolbar`
  (embutido na barra) e `fullscreen` (banner `fixed top-0 z-[105]
  backdrop-blur`). Mostrador `MM:SS` com `tabular-nums`, tap alterna
  countdown/countup, Play/Pause, Reset, popover com presets
  5/10/15/30/45 min + custom 1–120 min. Tokens semânticos.

### Integrações
- `src/components/notes/RichNoteToolbar.tsx` — prop nova `outlineId?`;
  quando presente, renderiza `<OutlineTimer variant="toolbar" />` no fim
  da barra com divisor.
- `src/components/notes/RichNoteEditor.tsx` — prop nova `outlineId?`,
  repassa ao toolbar.
- `src/routes/_app.consideracoes-campo.tsx`:
  - Passa `outlineId={draft.id}` ao editor **exceto** quando
    `isTalk` (subaba Anotações fica intocada, conforme Missão 02).
  - `FullscreenOutline` monta o banner do timer no topo + `pt-12` no
    cabeçalho para evitar sobreposição. Cobre Consideração de Campo e
    Esboço.
- `src/components/dashboard/FieldNoteFullscreenDialog.tsx` — banner
  do timer no topo do dialog + `pt-12` no cabeçalho. Atende
  automaticamente os atalhos do Dashboard (Consideração de Campo e
  Esboço da Semana) — ambos usam este dialog com o `noteId` correto.

### Cobertura
| Superfície | Inline | Banner fullscreen |
|---|---|---|
| `/consideracoes-campo` · Consideração de Campo | ✅ | ✅ |
| `/consideracoes-campo` · Esboço | ✅ | ✅ |
| `/consideracoes-campo` · Anotações | ❌ | ❌ |
| Dashboard · Consideração de Campo (FieldNoteFullscreenDialog) | — | ✅ |
| Dashboard · Esboço da Semana (FieldNoteFullscreenDialog) | — | ✅ |

### Restrições atendidas
- Zero chamadas a Supabase / serverFn — somente `localStorage` e
  eventos in-browser.
- Apenas tokens semânticos de cor (Onda 6.8).
- Popover bíblico (Missão 03, `z-[110]`) continua acima do banner
  (`z-[105]`).

### Verificação
- `bunx tsc --noEmit` 100 % limpo.

## Próximas missões
- Nenhuma pendente.
