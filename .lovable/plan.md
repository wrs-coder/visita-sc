# Corrigir erro ao trocar para "Modo edição" e reabrir esboço após "← Esboços"

## 1. Erro "Cannot read properties of null (reading 'cached')"
Causa confirmada no registro do aparelho: ao trocar de modo, o editor de texto antigo já foi desmontado, mas uma rotina de sincronização ainda tenta ler o conteúdo dele e quebra a tela.
- Correção: essa rotina passa a ignorar um editor já encerrado (e não derruba a tela se a leitura falhar). Conteúdo e salvamento não mudam.

## 2. "← Esboços" e reabrir o mesmo esboço
Causa confirmada no código: a tela só sai da lista quando o esboço aberto muda. Tocar de novo no mesmo esboço não muda nada, então a lista continua na frente.
- Correção: tocar num esboço (ou criar um novo) sempre leva para a leitura, mesmo que seja o mesmo.

## Verificação
- Verificação de tipos e todos os testes.
- No celular (393px), com sua conta: abrir esboço, alternar Esboço/Edição várias vezes sem erro; tocar "← Esboços" e reabrir o mesmo esboço.

## Detalhes técnicos
- `RichNoteEditor.tsx`, efeito de sincronização de `value` (~linha 248) e o handler de update (~linha 235): retornar se `editor.isDestroyed`; envolver `getHTML()` em try/catch.
- `_app.consideracoes-campo.tsx`: `selectNote` e `handleNewNote` chamam `setShowLibrary(false)`; o efeito por `draft?.id` permanece.
