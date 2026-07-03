# Anexos em Miniatura nos Esboços Pessoais

Adicionar suporte a anexos (fotos locais, links de vídeo, links de publicação) com título/tema em cada esboço, sem alterar toolbar existente, sync, cache, autenticação ou dashboard.

## Escopo (apenas adição)

- Aba **Esboços Pessoais** / **Considerações de Campo** (`src/routes/_app.consideracoes-campo.tsx`) — mesmo editor imersivo.
- Modo Edição e Modo Esboço (leitura/tribuna).
- Nada muda em: relatórios, rotas, dashboard, autenticação, sync inteligente do Supabase, cache local, lógica de persistência, layout base da toolbar de duas linhas.

## Modelo de dados

Campo opcional `attachments` em `FieldNote` (`src/lib/bible-notes-store.ts`) e no schema server (`src/lib/personal-outlines.functions.ts` → `outlineContentSchema`), 100% retrocompatível (default `[]`).

```ts
export type NoteAttachmentKind = "photo" | "video" | "publication";
export interface NoteAttachment {
  id: string;
  kind: NoteAttachmentKind;
  title: string;        // "Cântico 120", "Vídeo da Ilustração" (max 60)
  uri?: string;         // photo: caminho relativo no Filesystem
  url?: string;         // video/publication: URL externa
  created_at: number;
}
```

- Fotos: `@capacitor/filesystem` grava em `Directory.Data`, subpasta `outline-attachments/<noteId>/<attachmentId>.<ext>`. Salvamos o caminho relativo; resolvemos o path absoluto via `Filesystem.getUri`.
- Web (sem Capacitor nativo): fallback armazena bytes como Blob no IndexedDB (infra já existe em `bible-notes-store.ts`), mesma forma de nota.
- Sem bucket novo no Supabase. Sync existente serializa `attachments` como parte do `content_json` (jsonb livre). Fotos ficam apenas no dispositivo (privacidade + custo zero).

## UI — Toolbar Premium (2 linhas, preservada)

Em `src/components/notes/RichNoteToolbar.tsx`, adicionar **dois ícones compactos** ao final da linha de ações existente:
- `ImagePlus` → "Anexar Imagem"
- `LinkIcon` → "Vincular Link"

Sem reorganizar botões, sem alterar altura da toolbar.

## UI — Barra de Miniaturas (nova, abaixo da toolbar)

Novo `src/components/notes/OutlineAttachmentsBar.tsx`, renderizado logo abaixo do `<RichNoteToolbar />` dentro do `RichNoteEditor`, e também no bloco de leitura do route.

- Linha horizontal com scroll-x suave (carrossel), **altura fixa 5rem**.
- Cada card 48×48 px, `rounded-lg`, borda sutil, botão `X` discreto no canto superior direito (visível ao hover / sempre em mobile).
- **Tema em uma única linha com `truncate`** (largura máxima igual à do card), garantindo altura absoluta constante da barra — sem deformação com títulos longos. Título completo em `title=`/tooltip.
- Ícones por tipo:
  - `photo` → preview `<img>` da URI.
  - `video` → `PlayCircle` destacado (accent).
  - `publication` → `FileText` / `BookOpen`.
- **Android/iOS**: URI das fotos é passada por `Capacitor.convertFileSrc()` antes do `<img src>` para contornar o bloqueio do WebView a `file://` — obrigatório. No web, usa o URL do Blob direto.
- Estado vazio: barra não renderiza (altura zero, layout intacto).

## Fluxo de adição

Dialog leve (shadcn `Dialog`) disparado pelos botões da toolbar:
1. **Foto**: `<input type="file" accept="image/*">` (cobre Galeria + Downloads no Android WebView). Bytes copiados para `Directory.Data` via Capacitor Filesystem.
2. **Link (vídeo/publicação)**: campo URL + toggle tipo, validação `http/https` ou `jwlibrary://`.
3. Sempre: campo **"Tema/Título"** obrigatório (max 60 chars).

## Altura do editor (preservação rígida)

Em `_app.consideracoes-campo.tsx` (linhas 2034-2035), subtrair a altura constante da barra quando há anexos:

```ts
const attachRow = draft.attachments?.length ? "5rem" : "0rem";
minHeight={metaCollapsed ? `calc(100dvh - 14rem - ${attachRow})` : "22rem"}
maxHeight={metaCollapsed ? `calc(100dvh - 14rem - ${attachRow})` : "60vh"}
```

Como o tema é truncado em 1 linha, a barra tem altura garantida — o cálculo permanece exato e o scroll interno vertical do texto continua impecável.

## Modo Esboço (leitura / tribuna)

No bloco `mode === "outline"` (linha ~2042) renderiza a mesma `OutlineAttachmentsBar` em modo somente-leitura (sem `X`, sem botão adicionar) acima do conteúdo. Clique dispara as mesmas ações abaixo.

## Ações ao clicar

- **Foto** (edição ou leitura): `AttachmentLightbox` — Dialog fullscreen `bg-black/95`, imagem `max-h-[100dvh] max-w-full object-contain`, X e clique no backdrop fecham; foco volta ao editor.
- **Link** (vídeo/publicação): helper `openExternalUrl(url)` em `src/lib/outline-attachments.ts`:
  1. Tenta `Browser.open({ url })` do `@capacitor/browser` (permite deep-link para JW Library etc.).
  2. **Fallback silencioso**: qualquer erro (plugin indisponível, app inexistente, web puro) cai em `window.open(url, "_blank", "noopener")`. Sem toast de erro, sem clique morto.

## Sync / cache

- `attachments` viaja no `content_json`; pipeline `useOutlinesSync` + `pushOutlineToCloud` / `pullOutlineFromCloud` já persiste jsonb livre — sem alteração.
- Ao puxar em outro device: `uri` ausente → miniatura mostra placeholder com o tema e badge "somente neste dispositivo".
- Lixeira / soft-delete inalterados.

## Detalhes técnicos

Novos arquivos:
- `src/components/notes/OutlineAttachmentsBar.tsx`
- `src/components/notes/AttachmentAddDialog.tsx`
- `src/components/notes/AttachmentLightbox.tsx`
- `src/lib/outline-attachments.ts` (helpers Filesystem + `convertFileSrc` + `openExternalUrl` com fallback)

Editados:
- `src/lib/bible-notes-store.ts` — `attachments?: NoteAttachment[]` em `FieldNote`.
- `src/lib/personal-outlines.functions.ts` — `outlineContentSchema` recebe `attachments: z.array(...).optional().default([])`.
- `src/components/notes/RichNoteEditor.tsx` — props `attachments`, `onAttachmentsChange`, `readOnlyAttachments`; renderiza barra logo abaixo da toolbar.
- `src/components/notes/RichNoteToolbar.tsx` — 2 ícones novos + callback `onRequestAddAttachment(kind)`.
- `src/routes/_app.consideracoes-campo.tsx` — passa `draft.attachments`, `onPatch("attachments", ...)`, ajusta altura, renderiza barra no modo leitura.

Deps novas: `@capacitor/browser` (via `bun add`). `@capacitor/filesystem` já presente. `Capacitor.convertFileSrc` vem de `@capacitor/core` já instalado.

i18n: chaves novas sob `personalOutlines.attachments.*` em `src/i18n/locales/{pt,en,es}.json`.

## Validação

- Notas antigas (sem `attachments`) abrem, editam e sincronizam normalmente.
- Toolbar mantém as duas linhas atuais; barra de anexos não deforma altura mesmo com títulos longos (truncate).
- Fotos renderizam no Android via `convertFileSrc` (sem bloqueio de WebView).
- Links abrem em app nativo quando disponível; fallback silencioso para `window.open`.
- `bunx tsc --noEmit` passa 100% limpo.
