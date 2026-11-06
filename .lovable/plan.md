# Barra flutuante de destaque no Leitor da Bíblia

## O que muda para você
Ao selecionar uma palavra, um trecho ou um versículo no Leitor da Bíblia, aparece uma pílula pequena logo abaixo da seleção (ou acima, se não houver espaço):

```text
┌───────────────────────────────┐
│ ‹  Gên. 1:1-31          Aa  ✓ │
├───────────────────────────────┤
│ 1 No princípio Deus criou os  │
│ [céus e a terra]              │
│ ┌───────────────────────────┐ │
│ │ 🟡 🟢 🔵 🟣 🟠 🔴 │ ⭐ │ 📝 │ │
│ └───────────────────────────┘ │
│ 2 Ora, a terra estava sem...  │
├───────────────────────────────┤
│ Gên 1:1 · trecho              │
│ 🟡🟢🔵🟣🟠🔴 ⌫ [Ponto alto][Anotar]│
└───────────────────────────────┘
```

- Bolinha: pinta o trecho selecionado (ou o versículo inteiro se nada foi selecionado).
- Tocar de novo na mesma cor já aplicada naquele trecho: remove esse destaque.
- ⭐ abre direto o Ponto alto; 📝 abre direto Anotar (com o texto selecionado).
- Sem ⌫ na pílula: apagar continua só na barra inferior.
- A barra inferior atual fica igual, como garantia caso a pílula não apareça.
- A pílula some ao rolar a tela, ao tocar fora ou depois de usar uma opção.

## Garantias
- Pontos altos, destaques salvos e o texto da Bíblia não mudam.
- Balão bíblico dos esboços não é alterado.
- Cores usam os tokens do tema (claro, escuro e preto).
- Ajuda atualizada com a nova pílula.

## Detalhes técnicos
- Arquivo: `src/components/guest-workspace/CleanReader.tsx` apenas (mais `help-content.ts` e i18n se faltar rótulo).
- Reaproveitar o `selectionchange` e `range` já existentes; guardar o retângulo da seleção (`getBoundingClientRect`) para posicionar a pílula (`position: fixed`, limitada à largura da tela, z acima do texto).
- Botões da pílula usam `onPointerDown` + `preventDefault` para não cancelar a seleção nativa no celular (mesma técnica do balão bíblico).
- "Mesma cor remove": função pura nova em `bible-reader-settings.ts` (`findSameColorHighlight`) que detecta destaque com mesma cor sobrepondo o intervalo; se achar, `removeHighlightAt`, senão `addHighlight`. Teste unitário para os dois casos.
- ⭐ chama `onHighlight(ref)`; 📝 chama `onNote(ref, textoSelecionado)`.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`; sem mudança de banco, login ou versão.
