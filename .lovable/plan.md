# Missão 06.2 — Zoom do visor + Reset seguro no OutlineTimer

Escopo 100% cliente. Sem Supabase. Sem hex inline. Build `bunx tsc --noEmit` limpo.

## 1. Zoom do visor (Normal / Grande / Gigante)

**Novo módulo:** `src/lib/timer-size.ts`
- Tipo `TimerSizeId = "normal" | "large" | "huge"`.
- Hook `useTimerSize()` análogo a `useTimerTheme`: estado + `localStorage` (`visita-sc:outline-timer-size`) + sincronização via `StorageEvent` sintético.
- Preset por tamanho expõe classes Tailwind para as duas variantes:
  - `toolbar`: `text-xs` (normal) · `text-sm` (large) · `text-base` (huge), com `px` proporcional.
  - `fullscreen`: `text-lg` (normal) · `text-2xl` (large) · `text-4xl` (huge), com `py` proporcional para o banner respirar.
- Ciclos: helpers `nextSize(id)` / `prevSize(id)` para os botões +/−.

**`src/components/notes/OutlineTimer.tsx`:**
- Consumir `useTimerSize()`; remover `text-lg`/`text-xs` hard-coded de `displayClass` e usar a classe do preset (ambas as variantes).
- Adicionar dois `Button` ghost ao lado do reset, usando `ZoomIn` / `ZoomOut` do `lucide-react`:
  - `onClick` chama `setSize(next/prev)`.
  - `disabled` no extremo (já no maior/menor).
  - `aria-label` + `title` traduzíveis (`personalOutlines.timer.zoomIn` / `zoomOut`).
  - Mesma `iconBtnClass`/`iconBtnSize` dos demais para coerência visual e tema.
- Ordem na barra: `[timer-alvo] [MM:SS] [play/pause] [reset] [zoom-out] [zoom-in]`.

## 2. Reset com confirmação (AlertDialog)

**`src/components/notes/OutlineTimer.tsx`:**
- Importar `AlertDialog*` de `@/components/ui/alert-dialog` (já existe).
- Estado local `resetOpen: boolean`.
- Botão reset deixa de chamar `timer.reset()` direto: apenas abre `setResetOpen(true)`.
- `<AlertDialog>` renderizado dentro do componente com:
  - Title: `personalOutlines.timer.resetConfirmTitle` ("Deseja reiniciar o cronômetro?")
  - Description: `personalOutlines.timer.resetConfirmDesc` ("O tempo decorrido voltará a 00:00.")
  - Cancel: `common.cancel` (fallback "Cancelar") — fecha sem efeito.
  - Action: `personalOutlines.timer.resetConfirm` ("Confirmar") — chama `timer.reset()` e fecha.
- O estado de execução (`isRunning`) **não** é tocado pelo cancelamento — a lógica atual de `reset()` já preserva pausa; só roda quando confirmado.
- `z-index` do conteúdo do dialog mantém o padrão shadcn (acima do banner fullscreen `z-[105]`); se necessário, `className="z-[150]"` no `AlertDialogContent` para garantir sobreposição em fullscreen.

## 3. i18n

Adicionar em `src/i18n/locales/{pt,en,es}.json` sob `personalOutlines.timer`:
- `zoomIn`, `zoomOut`
- `resetConfirmTitle`, `resetConfirmDesc`, `resetConfirm`

(Reaproveitar `common.cancel` se já existir; caso contrário, adicionar.)

## 4. Validação

- `bunx tsc --noEmit` limpo.
- Smoke manual no preview: alternar tamanho na toolbar reflete imediatamente no banner fullscreen; reload mantém preferência; clicar reset abre dialog; "Cancelar" preserva contagem; "Confirmar" zera.

## Arquivos tocados

- **novo:** `src/lib/timer-size.ts`
- editado: `src/components/notes/OutlineTimer.tsx`
- editado: `src/i18n/locales/pt.json`, `en.json`, `es.json`
- editado: `.lovable/plan.md` (registro da subonda)
