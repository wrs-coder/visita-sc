# Toast de confirmação e cancelamento de recorte em Esboços Pessoais

## 1. Toast de confirmação ao mover, recortar ou colar notas e pastas

Ajustar as funções `moveNoteTo`, `moveFolderTo`, `handleCutNote` e `handlePasteNote` para exibir `toast.success(...)` com mensagens específicas em vez da mensagem genérica atual. Cada ação terá sua própria chave i18n sob `personalOutlines.folders`:
- `noteMoved`: "Nota movida."
- `folderMoved`: "Pasta movida."
- `noteCut`: "Nota recortada."
- `notePasted`: "Nota colada na pasta."

No diálogo `MoveToDialog`, ao confirmar, o toast será exibido pelo callback `onConfirm` (já via `handleConfirmMove` → `moveNoteTo`/`moveFolderTo`).

## 2. Botão para cancelar o recorte (limpar clipboard)

Já existe um link "Cancelar" no banner do clipboard. Trocar esse link por um botão visível (variant `outline`, tamanho `sm`, ícone `X`) ao lado do hint de recorte, para melhor descoberta. O botão chama `setClipboardNoteId(null)` e exibe `toast.info(t("personalOutlines.folders.clipboardCleared"))`.

Chaves i18n novas necessárias (pt/en/es):
- `personalOutlines.folders.noteMoved`
- `personalOutlines.folders.folderMoved`
- `personalOutlines.folders.noteCut`
- `personalOutlines.folders.notePasted`
- `personalOutlines.folders.clipboardCleared`

## Arquivos afetados
- `src/routes/_app.consideracoes-campo.tsx` — ajustes nos handlers de mover/recortar/colar e no botão de cancelar recorte.
- `src/i18n/locales/pt.json`, `en.json`, `es.json` — novas chaves de tradução.
