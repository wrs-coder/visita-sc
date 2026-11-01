# Textos bíblicos em azul (faltantes) + folga em Pontos altos

## O que muda

### 01 · Aba JW Library — referência do título vira link
Hoje o "João 3:16" no topo de cada nota é só texto azul. Passa a ser um link que abre a Bíblia em janela. O título da nota (quando cita textos) também fica linkado.

```text
┌──────────────────────────────┐
│ JW Library          🔍        │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ João 3:16  ← toque=Bíblia │ │
│ │ Amor de Deus              │ │
│ │ Ver também Rom 5:8 ← link │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

### 02 · "Para comentar" e "Modo comentário"
A referência e os textos citados na nota ficam azuis e tocáveis. No Modo comentário (tela cheia), a janela da Bíblia abre por cima, e ao fechar você volta ao mesmo comentário. O deslizar para o lado continua mudando de comentário; tocar no link não troca de página.

```text
┌──────────────────────────────┐
│ ✕                    2 de 5   │
│                              │
│ SALMO 23:1  ← toque=Bíblia    │
│                              │
│ Jeová cuida de mim como      │
│ pastor (veja Isa 40:11)      │
│                 └─ link      │
│                              │
│ [‹ anterior ] [ próximo › ]   │
└──────────────────────────────┘
```

### 03 · Folga no fim de "Pontos altos"
A janela que sobe de baixo para cima passa a rolar além do último item, para que nada fique sob a barra do Android. Mesma regra já usada nas outras telas.

```text
│ ...último ponto alto          │
│                              │
│   (espaço extra)             │
╞══════ barra do Android ══════╡
```

## O que não muda
- Nada salvo é alterado: os links são criados só na hora de mostrar.
- Estrela, editar, apagar, pesquisa e deslizar seguem iguais.

## Detalhes técnicos
- `JwLibraryPanel.tsx`: trocar o `<p>{ref(n)}</p>` por `BibleRefText text={ref(n)}` e o título por `BibleRefText`.
- `BibleTrackExtras.tsx` `CommentCard`: `h.ref` e `h.text` via `BibleRefText` (mantendo `line-clamp-2`); envolver links com `stopPropagation` não necessário (li não é clicável). `CommentMode`: ref e texto via `BibleRefText`; ignorar swipe quando o toque começa num link (checar `closest('button,a')` no `onTouchStart`). Popover já usa z-[110] > z-[80] do modo.
- `HighlightsDrawer.tsx`: lista rolável recebe `safe-bottom-content` no lugar de `pb-6`.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
