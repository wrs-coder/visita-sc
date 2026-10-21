# Três itens que ficaram de fora: tema preto, cantos padronizados e cores do cronômetro

Tem razão: esses três itens do plano de melhorias ainda não foram feitos. Só muda a aparência. Os dados, o login, a Bíblia e a sincronização não são tocados.

## 1. Tema escuro com preto puro (opcional)
- Em Configurações, ao lado do botão de modo escuro, entra a opção **"Preto puro (economiza bateria)"**. Ela só aparece com o modo escuro ligado.
- Quando ligada, o fundo fica preto de verdade e os cartões e menus ficam em cinza bem escuro, para que os blocos continuem se distinguindo. As cores de destaque (azul, verde e vermelho) não mudam.
- A escolha fica salva no aparelho e já vale na próxima abertura, sem piscar.
- A barra do sistema no celular acompanha o tema (azul no claro, escuro ou preto no modo escuro).

## 2. Espaçamentos e cantos padronizados
- Hoje o app usa cinco tamanhos de canto diferentes, misturados. Vamos usar uma escala única:
  - **pequeno:** campos, botões e etiquetas
  - **médio:** cartões e caixas de diálogo
  - **grande:** telas cheias e balões grandes
- Os espaços internos dos cartões (topo, laterais e entre os itens) seguem um único padrão.
- Os ajustes são feitos tela por tela, sem mudar nada de lugar. O painel continua com o mesmo layout e as mesmas cinco abas.

## 3. Cronômetro, ícone e tela de abertura na paleta do app
- O modo **"Automático"** (verde → âmbar → vermelho) e o aviso de **"Término"** passam a usar as cores oficiais do app, em vez de cores fixas fora do padrão. Assim ficam corretos também no modo escuro e no preto puro.
- Os temas de alto contraste que você escolhe (amarelo no preto, vermelho vivo etc.) ficam como estão, porque essas cores são de propósito, para leitura de longe.
- A cor da tela de abertura, da barra do navegador e do aplicativo instalado passa a usar o mesmo azul do app.
- **O desenho do ícone não muda.** Ele já foi aprovado na Play Store e mudá-lo exigiria nova revisão.

## 4. Ícones do cronômetro alinhados com fonte grande (celular)
- Hoje, ao aumentar a fonte, os botões (iniciar, pausar, zerar, cores e tamanho) caem para a linha de baixo de forma torta.
- Novo arranjo: o tempo fica sempre numa linha própria, centralizado. Logo abaixo vem uma única fileira de botões, alinhada e com espaçamento igual.
- Com fonte pequena, tudo continua numa linha só, como hoje.
- Os botões continuam com tamanho fácil de tocar e o tempo nunca é cortado.
- **Recolher e expandir a fileira de botões:** uma pequena seta ao lado do tempo esconde ou mostra iniciar, pausar, zerar, cores e tamanho. Recolhida, sobra só o tempo, mais limpo. O app lembra a escolha.
- Vale igual nos três lugares: no modo esboço, na tela cheia dos Esboços pessoais e na tela cheia do painel.
- O cronômetro continua correndo ao recolher, e os avisos de tempo continuam aparecendo.

## O que não muda
- Os dados salvos, o login, o PIN, a biometria, a Bíblia, a sincronização e o layout das telas.

## Detalhes técnicos
- Pure black: class `.oled` on `<html>` together with `.dark`, applied by `src/lib/theme.ts` (new key `visita-sc:theme-oled:v1`). It overrides only `--background`, `--card`, `--popover`, `--sidebar` and `--muted` in `src/styles.css`, and adds a toggle in `ThemeToggle` and in the settings screen. The `theme-color` meta is updated at runtime.
- Radii: map `rounded-sm/md` to controls, `rounded-lg` to cards and dialogs, and `rounded-xl/2xl` to overlays only. Adjust the 16 `rounded-xl` and 4 `rounded-2xl` uses where they fall outside that scale. Card padding goes through the shadcn `Card` defaults.
- Timer: replace `text-emerald-*/amber-*/red-*` in `OutlineTimer.tsx` and the `auto` swatch in `timer-theme.ts` with tokens (`--timer-ok`, `--timer-warn`, `--timer-over`) defined in `styles.css` for light and dark.
- Android: `colors.xml` `appWindowBackground` gets a `values-night` variant. The manifest and `theme-color` stay on the current brand blue. Android changes only reach users with the next Play Store version.
- Validation: `bunx tsgo --noEmit`, `bunx vitest run`, and a Playwright screenshot of the dashboard and timer at 393px in light, dark and pure black.
- Timer layout: in `OutlineTimer.tsx`, replace the container's `flex-wrap` (line 203) with a grid. The display goes in its own centered row, and the controls go in one `flex justify-center` row with `shrink-0` icons. Check at 360px and 393px with the largest size.
- Collapsible controls: `controlsCollapsed` in `OutlineTimer`, persisted in localStorage (device-local presentation state, the same pattern as collapsible-blocks). Controls are hidden, not unmounted, and a chevron with `aria-expanded` toggles them. Both fullscreens (personal outline and `FieldNoteFullscreenDialog`) use the same `OutlineTimer`, so the change applies to all three places.
