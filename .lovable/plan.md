# Plano — Missão 06.1: Sticky Timer + Tema de Acessibilidade

Escopo: dois ajustes UI/persistência sobre o `OutlineTimer` existente, sem
mexer em lógica de tempo, drift, BroadcastChannel ou Supabase.

## 1. Sticky no topo durante o scroll (apenas visualização normal)

Onde: linha que envolve `<OutlineTimer variant="toolbar"/>` em
`src/routes/_app.consideracoes-campo.tsx` (~linha 1997, dentro do `NoteEditor`),
e o mesmo padrão na toolbar do `RichNoteEditor` quando recebe `outlineId`.

Mudança:
- O contêiner do label "Conteúdo" + chip do timer recebe
  `sticky top-0 z-[40] -mx-3 px-3 sm:-mx-0 sm:px-0 bg-background/95
  backdrop-blur supports-[backdrop-filter]:bg-background/70`.
- Mantém o layout `flex-col sm:flex-row` já implementado, então no mobile
  o chip continua em linha própria; o sticky cola toda a faixa
  (label + chip) ao topo do scroller.
- Variante `fullscreen` não muda — já é `fixed top-0`.
- `RichNoteEditor.tsx`: a barra de ferramentas que hoje hospeda o
  `<OutlineTimer variant="toolbar"/>` ganha as mesmas classes sticky
  para o modo edição.

Observação: o scroller efetivo é o `<main>` da rota, que rola normalmente
em mobile; `sticky` cola ao primeiro ancestral com overflow, então
funciona sem ajustes adicionais.

## 2. Tema de cor / Acessibilidade do timer

Modelo de dados (novo módulo `src/lib/timer-theme.ts`):

```ts
export type TimerThemeId =
  | "auto"           // semafórico (verde→âmbar→vermelho) — default
  | "yellow-on-black"
  | "black-on-yellow"
  | "red-vivid"
  | "white-on-black"
  | "green-neon";

export interface TimerThemePreset {
  id: TimerThemeId;
  label: string;          // i18n key resolvida no componente
  chipBg: string;         // classes Tailwind
  chipText: string;
  iconColor: string;      // classes para os botões Play/Pause/Reset/TimerIcon
}
```

Storage: chave única global `visita-sc:outline-timer-theme` (string).
Hook `useTimerTheme()` retorna `{ themeId, setThemeId, preset }` com
sincronização via evento `storage` para refletir entre abas/superfícies.

Aplicação no `OutlineTimer.tsx`:
- Quando `themeId === "auto"`: comportamento atual (verde/âmbar/vermelho
  por `alertLevel`).
- Caso contrário: aplica `preset.chipBg`/`preset.chipText` ao wrapper e
  ao display (sobrescrevendo `alertColorClass`); ícones usam
  `preset.iconColor`. Sem qualquer hex inline — só classes utilitárias
  Tailwind (ex.: `bg-black`, `text-yellow-300`, `text-red-500`,
  `bg-yellow-300`, `text-emerald-400`).

Popover (já tem presets de minutos + custom): após o input de custom,
adiciona um `Separator` e a seção:

```
[Acessibilidade]
( ) Cores automáticas (semafórico)
( ) Amarelo neon sobre preto
( ) Preto sobre amarelo
( ) Vermelho vivo
( ) Branco sobre preto
( ) Verde neon
```

Implementado como grade `grid-cols-2 gap-1.5` de botões de preview
mostrando "MM" no estilo do tema (mini swatch + label). Tap aplica
imediatamente e fecha o popover só se for um preset.

Persistência: `localStorage.setItem` no `setThemeId`; leitura inicial
no hook (SSR-safe, `typeof window !== "undefined"`); broadcast via
evento `storage` nativo já cobre múltiplas abas.

## 3. i18n

Adicionar em `personalOutlines.timer` (pt/en/es):
- `accessibility` = "Acessibilidade / Cores" / "Accessibility / Colors" /
  "Accesibilidad / Colores"
- `themeAuto` = "Cores automáticas" / "Automatic colors" /
  "Colores automáticos"
- `themeYellowOnBlack` = "Amarelo neon sobre preto" / "Neon yellow on
  black" / "Amarillo neón sobre negro"
- `themeBlackOnYellow` = "Preto sobre amarelo" / "Black on yellow" /
  "Negro sobre amarillo"
- `themeRedVivid` = "Vermelho vivo" / "Vivid red" / "Rojo vivo"
- `themeWhiteOnBlack` = "Branco sobre preto" / "White on black" /
  "Blanco sobre negro"
- `themeGreenNeon` = "Verde neon" / "Neon green" / "Verde neón"

## Arquivos editados / criados

- (novo) `src/lib/timer-theme.ts`
- `src/components/notes/OutlineTimer.tsx`
- `src/components/notes/RichNoteToolbar.tsx`
- `src/routes/_app.consideracoes-campo.tsx`
- `src/i18n/locales/pt.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `.lovable/plan.md`

## Garantias

- Zero alteração no `useOutlineTimer` (lógica de tempo intacta).
- Zero chamadas Supabase. Tudo localStorage.
- Sem hex inline; só classes utilitárias Tailwind v4 (compatíveis com
  os tokens da Onda 6.8 — as cores neon usadas para o tema custom são
  classes padrão Tailwind, não tokens semânticos do tema, o que é
  aceitável pois são opção explícita de "alto contraste" do usuário).
- `bunx tsc --noEmit` deve fechar 100% limpo.
