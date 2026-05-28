# Plano

## 1. Mover gerenciamento da Bíblia para "Meu Perfil"

Hoje o card "Bíblia ativa + botão Gerenciar" e o `<BibleManagerDialog>` ficam em `src/routes/_app.consideracoes-campo.tsx` (linhas 438–454), ocupando espaço útil. Mover **sem alterar comportamento**:

- Remover o card e o `<BibleManagerDialog>` de `_app.consideracoes-campo.tsx`. O hook `useActiveBible` (que devolve `activeBible` e `refreshActiveBible`) continua na página, pois é consumido pelo editor para detectar citações.
- Em `src/routes/_app.perfil.tsx`, adicionar o mesmo bloco **logo acima** da seção de Backup (antes do card de `profile.backupSection`, linha ~202): card com badge da Bíblia ativa + botão "Gerenciar Bíblias" abrindo `BibleManagerDialog`. Usar `useActiveBible` lá também; quando a Bíblia muda, basta atualizar o estado local — `useActiveBible` em outras rotas vai reler ao remontar (e o popover já lê via `getActiveBibleLibrary`).
- Nenhuma mudança em `BibleManagerDialog`, no parser EPUB nem no store. Sem regressão em popover, detecção de citações ou na importação.

## 2. Botão de minimizar no card de gerenciamento de pastas

Em `_app.consideracoes-campo.tsx` (Card da sidebar de pastas, linhas 497–560):

- Adicionar header compacto no topo do `CardContent` com título "Pastas" + botão fantasma com `ChevronUp` / `ChevronDown` controlado por `useState<boolean>` (`foldersCollapsed`).
- Quando colapsado: esconder a linha de botões (Nova nota / Nova pasta / Importar), o campo de busca e a árvore. Mostrar só o header.
- Persistir preferência em `localStorage` (`personal-outlines.folders-collapsed`) para sobreviver entre sessões.

## 3. Modo esboço alternável a qualquer momento

Hoje o botão "Editar nota" só aparece quando `mode === "outline"` e "Salvar" só em `mode === "edit"`. Trocar pelo padrão:

- No topo do `NoteEditor` (linhas 633–653), substituir o `Badge` por um **toggle de dois estados** ("Modo edição" / "Modo esboço") sempre visível e clicável, chamando `onModeChange("edit" | "outline")`. Usar `ToggleGroup` (`@/components/ui/toggle-group`) ou par de botões `variant="default" / "outline"`.
- Permite alternar a qualquer momento sem depender da barra inferior.

## 4. Centralizar a barra de ações inferior

Na sticky action bar (linha 764) substituir `justify-end` por `justify-center` e manter os 4 botões:

- "Editar nota" — visível só em modo esboço (continua como atalho rápido, agora redundante com o toggle do topo, mas mantido conforme pedido).
- "Exportar" — sempre.
- "Excluir" — sempre.
- "Salvar" — visível só em modo edição.

Sem mexer no `pb-24` do container, no `RichNoteEditor` nem no fullscreen.

## Validação

- `bun test` (suíte do parser deve continuar passando).
- Conferir em `/meu-perfil` que o card aparece acima de Backup e abre o diálogo.
- Conferir em `/consideracoes-campo`: colapsar/expandir pastas, alternar modo livremente, barra inferior centralizada com os 4 botões.
