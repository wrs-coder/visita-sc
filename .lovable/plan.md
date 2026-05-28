## Mudanças (apenas CSS / classes Tailwind)

Aplicar hardening de largura nos componentes de "Esboço" em `src/routes/_app.consideracoes-campo.tsx`. Todas as alterações são em `className` — nada de lógica ou estado.

### 1. Container raiz da aba (linha 426)

Atual:
```
<div className="space-y-4 overflow-x-hidden overflow-y-auto">
```
Novo:
```
<div className="space-y-4 w-full max-w-full overflow-x-hidden overflow-y-auto box-border">
```

### 2. Card do editor (linha 562-563)

- `<Card>` → `<Card className="w-full max-w-full overflow-hidden">`
- `<CardContent className="p-5 space-y-4">` → adicionar `w-full max-w-full overflow-x-hidden box-border min-w-0`
  - `min-w-0` é o que impede flex/grid children de empurrarem o container.

### 3. Container raiz do `NoteEditor` (linha 630 — Fragment)

Trocar o `<>` por um `<div className="w-full max-w-full overflow-x-hidden box-border min-w-0 space-y-4">` para servir de âncora de largura.

### 4. Toolbar (linha 631)

`flex flex-wrap items-center justify-between gap-2` → adicionar `w-full max-w-full min-w-0` (o `flex-wrap` já está, garantimos a largura).

### 5. Grid de campos / inputs (linha 668 em diante)

- `<div className="grid gap-3">` → adicionar `w-full max-w-full min-w-0`.
- Cada `<Input ... />` recebe `className="w-full max-w-full min-w-0"` (Título, Oração, Território, Designados, Descrição — linhas 671, 684, 693, 703, 714).

### 6. Bloco "Versículos detectados" (linha 724) e grid de chips (734)

- Card: adicionar `w-full max-w-full overflow-hidden break-words`.
- Grid de chips (`flex flex-wrap gap-1.5`): adicionar `min-w-0 max-w-full`.

### 7. Cards de notas criadas (lista de pastas/notas — varrer o JSX entre linhas 420 e 560)

Cada `<Card>` de listagem de notas e cada elemento de texto (título da nota, descrição) recebe:
- Card: `w-full max-w-full overflow-hidden`
- Texto: `break-words` (= `overflow-wrap: break-word`) e `min-w-0` no container flex pai.

### 8. Fullscreen outline (linha 816)

Já tem `w-screen max-w-full overflow-x-hidden`. Adicionar `box-border` e garantir que o conteúdo interno (linha 843) também tenha `min-w-0 break-words` no wrapper de texto.

### 9. (Opcional, leve) `src/styles.css`

Adicionar uma classe utilitária `.esboco-safe` agrupando:
```css
.esboco-safe { max-width: 100vw; box-sizing: border-box; overflow-wrap: break-word; word-wrap: break-word; min-width: 0; }
```
e aplicar nos containers principais (raiz da aba, NoteEditor, Card de listagem). Opcional — as classes Tailwind acima já cobrem o caso; só faria isso se quisermos centralizar.

## Verificação

- Abrir `/consideracoes-campo` em 390×845 (viewport atual do usuário) e em 320×568.
- Colar um texto longo sem espaços (ex: `aaaaaaaaaa...`) no Título e na Descrição — não deve haver scroll horizontal.
- Conferir a lista de notas com títulos longos — deve quebrar linha.

## Fora de escopo

- Nenhuma mudança no parser EPUB.
- Nenhuma mudança de lógica de salvamento, navegação, ou estado.
- Não tocar em outras rotas.