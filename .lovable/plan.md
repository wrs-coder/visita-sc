# Mover notas entre pastas + Popup bíblico arrastável

## Parte 1 — Mover notas/pastas entre pastas em "Esboços Pessoais"

Hoje uma nota só pode ser criada dentro da pasta selecionada — não há como movê-la depois. Solução simples, segura e que funciona bem no toque (sem drag-and-drop frágil):

### 1a. "Mover para…" (principal, 1 toque)
- No menu `⋮` de cada **nota** e de cada **pasta**: novo item **"Mover para…"**.
- Abre um `Dialog` com a árvore de pastas do tipo atual + opção **"📁 Raiz (sem pasta)"** no topo.
- Toque na pasta destino → `saveNote({...note, folderId})` ou `saveFolder({...folder, parentId})` → recarrega.
- Validações de segurança:
  - Não permite mover uma pasta para dentro de si mesma ou de uma descendente (checagem anti-ciclo via `isDescendant`).
  - Pasta atual aparece desabilitada com rótulo "aqui".

### 1b. Recortar/Colar (opcional, para mover várias em sequência)
- Menu `⋮` da nota: **"Recortar"** → guarda id em estado de sessão (`clipboardNoteId`) e mostra um aviso discreto no topo ("1 nota recortada — Cancelar").
- Enquanto há clipboard, aparece **"Colar aqui"** ao lado de cada pasta e da raiz.
- Colar → atualiza `folderId` → limpa clipboard → toast.
- Clipboard só na sessão (estado React), não persiste.

Ambos os caminhos chamam o mesmo `saveNote`/`saveFolder`, então o Modo Offline continua funcionando automaticamente (mutação entra na fila).

## Parte 2 — Popup bíblico arrastável

Hoje o popup que aparece ao tocar numa citação bíblica é um Radix `Popover` ancorado à palavra. Vamos permitir que o usuário **arraste para qualquer canto da tela** e o popup permaneça lá enquanto estiver aberto. Funciona em todos os modos: edição, esboço (somente leitura) e tela cheia.

### Como
- Em `src/components/bible/BibleVersePopover.tsx`, dentro do `PopoverContent`:
  - Adicionar uma **barra superior de "alça"** (handle) com ícone `GripHorizontal` à esquerda e botão fechar `X` à direita.
  - Implementar drag manual com `pointerdown`/`pointermove`/`pointerup` (funciona em mouse e toque) aplicando `transform: translate(dx, dy)` ao próprio `PopoverContent`.
  - Apenas a alça inicia o arrasto (o resto do popup mantém scroll/seleção de texto).
  - Clamp para manter o popup dentro da viewport (margem de 8px) — evita perder o popup fora da tela.
  - Reset do offset ao fechar (`onOpenChange(false)`), para que reabrir comece ancorado.
- Z-index já é `z-[110]`, mantém-se acima do modo tela cheia.
- Em telas pequenas, manter `max-w-[90vw]` e `max-h-[60vh]`.

### Compatibilidade com os 3 modos
- **Edição** e **Esboço**: `VerseLink` é o mesmo componente nos dois (usado em `RichOutlineContent`), então a mudança vale para ambos automaticamente.
- **Tela cheia**: o `PopoverContent` é renderizado em `Portal` fora do container, então o arrasto não fica preso ao retângulo do modo tela cheia.

## Arquivos a alterar

- `src/routes/_app.consideracoes-campo.tsx` — UI de mover/recortar/colar + `MoveToDialog`.
- `src/components/bible/BibleVersePopover.tsx` — alça + lógica de arrasto + clamp na viewport.
- `src/i18n/locales/{pt,en,es}.json` — novas chaves:
  - `personalOutlines.folders`: `moveTo`, `moveHere`, `root`, `cut`, `paste`, `pasted`, `moved`, `cannotMoveIntoSelf`, `clipboardHint`, `clearClipboard`.
  - `bibleVerse`: `dragHandle`, `close`.

## Detalhes técnicos
- Sem mudanças no banco de dados, RLS ou schema do IndexedDB — `saveNote`/`saveFolder` e `folderId`/`parentId` já existem.
- Sem dependências novas; o drag usa Pointer Events nativos.
- Sem impacto em APK/PWA/navegador — APIs padrão e sem mudança no service worker.
- Continua acessível: a alça tem `aria-label`, e o popup pode ser fechado por `Esc` (Radix) ou pelo botão `X`.

## Fora de escopo
- Drag-and-drop de notas (ruim em mobile).
- Persistir a posição do popup entre reaberturas (reseta ao fechar — comportamento mais previsível).
