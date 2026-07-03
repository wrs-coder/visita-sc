## Objetivo

Tornar a barra de miniaturas de anexos (fotos, vídeos, publicações) visível também nos dois modos "tela cheia":

1. Tela cheia da aba **Esboços Pessoais** (`src/routes/_app.consideracoes-campo.tsx`, componente interno de fullscreen ~linha 2157).
2. Tela cheia do **Dashboard** (`src/components/dashboard/FieldNoteFullscreenDialog.tsx`).

Ambos são somente-leitura, portanto a barra entra com `readOnly` — sem botão de remover, mas com clique funcional (foto abre `AttachmentLightbox`, link abre via `openExternalUrl`).

## Alterações

### 1) `src/routes/_app.consideracoes-campo.tsx` — fullscreen do esboço
- Ler `note.attachments ?? []` (já existente no tipo `FieldNote`).
- Renderizar `<OutlineAttachmentsBar attachments={...} readOnly />` logo abaixo do header (linha ~2191), antes do container scrollável do conteúdo.
- Nenhum ajuste de altura obrigatório: o container do conteúdo é `flex-1 overflow-y-auto`, então a barra (5rem fixa) apenas ocupa espaço acima sem quebrar o layout. Se ausente, a função `OutlineAttachmentsBar` já retorna `null`.

### 2) `src/components/dashboard/FieldNoteFullscreenDialog.tsx`
- Importar `OutlineAttachmentsBar` de `@/components/notes/OutlineAttachmentsBar`.
- Renderizar `<OutlineAttachmentsBar attachments={note?.attachments ?? []} readOnly />` entre o header (linha ~194) e o `DialogDescription`/conteúdo scrollável (linha ~204).
- Mesmo raciocínio: o `flex-1 overflow-y-auto` do conteúdo se acomoda automaticamente.

## O que NÃO muda

- Nenhuma mudança no modelo de dados, sync, `personal-outlines.functions.ts`, toolbar do editor ou lógica de persistência.
- `AttachmentAddDialog` continua acessível apenas pelo editor em modo edição — tela cheia é somente-leitura.
- Fotos usam `toDisplaySrc` (com `Capacitor.convertFileSrc`) e links usam `openExternalUrl` (deep-link com fallback silencioso), reaproveitando o componente já em produção.

## Validação

- `bunx tsc --noEmit` limpo.
- Abrir nota com anexos no fullscreen do esboço e no fullscreen do dashboard: miniaturas aparecem, X não aparece (readOnly), clique em foto abre lightbox, clique em link abre no navegador/app.
