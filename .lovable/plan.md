## Viabilidade

Sim, é totalmente viável e de baixo risco — o modelo `NoteAttachment` já reserva o tipo `"video"` e a barra já renderiza um ícone `PlayCircle`. Basta destravar o fluxo de arquivo local e o player. A única decisão sensível é **como tocar** o vídeo local no Android; a forma mais segura (sem novos plugins e sem quebrar o APK) é usar o elemento `<video>` HTML5 em um lightbox fullscreen — o Android e a WebView tratam isso como player nativo (com botão de tela cheia do próprio sistema, PIP, controles). Isso preserva build limpo e evita adicionar `@capacitor/file-opener` só para isso.

## Escopo (zero alteração de schema)

Todo o metadado continua dentro do `content_json.attachments`, respeitando o coalescing da fila offline. Nenhuma tabela nova.

## Mudanças por arquivo

**1. `src/lib/outline-attachments.ts`**
- Ampliar `NoteAttachment` com campo opcional `source?: "link" | "file"` (default `"link"` para retrocompat) e `mime?: string`.
- Ajustar `normalizeAttachment` para preservar `source`/`mime`; entrada antiga (sem `source`) continua válida.
- Nova função `saveVideoAttachment(file, noteId, id?)` espelhando `savePhotoAttachment`, mas gravando em `outline-attachments/<noteId>/<id>.<ext>` com Filesystem no nativo e Blob URL no web.
- Extensão MIME: reutilizar helper `extFromMime` expandido (mp4/webm/mov/mkv/3gp).
- Validação de tamanho: recusar arquivos > 200 MB com mensagem clara (evita OOM no `readAsDataURL`).
- `deletePhotoAttachment` renomeada logicamente via wrapper `deleteFileAttachment` (mesma implementação; alias exportado, sem breaking).

**2. `src/components/notes/AttachmentAddDialog.tsx`**
- Aceitar `mode="video"` além de `photo`/`link`, ou (melhor) manter os 2 modos atuais e:
  - No modo `link` já existente, o subtipo "Vídeo" continua criando um `kind:"video", source:"link"` (comportamento atual).
  - Adicionar **novo modo** `mode="videoFile"`: `<input type="file" accept="video/*">`, título obrigatório, salva via `saveVideoAttachment` e emite `kind:"video", source:"file", uri, mime`.
- Chamada a partir da toolbar por um novo botão (ícone `Video`/`FileVideo`).

**3. `src/components/notes/RichNoteToolbar.tsx`**
- Adicionar prop opcional `onAddVideoAttachment?: () => void` (mesma cadeia de `onAddPhotoAttachment`/`onAddLinkAttachment`).
- Renderizar botão `<Video>` (lucide) ao lado dos existentes, tanto no modo compacto quanto no default.

**4. `src/components/notes/RichNoteEditor.tsx`**
- Novo estado `attachDialog: "photo" | "link" | "videoFile" | null`.
- Passar `onAddVideoAttachment={() => setAttachDialog("videoFile")}` ao toolbar quando `onAttachmentsChange` estiver definido.

**5. `src/components/notes/OutlineAttachmentsBar.tsx`**
- Já mostra `PlayCircle` para `kind === "video"`. Ajustar `handleClick`:
  - `video` + `source === "file"` (ou tem `uri` sem `url`): abrir novo `AttachmentVideoLightbox` com `toDisplaySrc(uri)`.
  - `video` + `source === "link"` (ou só `url`): manter `openExternalUrl(url)` → aciona deep-link nativo via `@capacitor/browser` (já instalado).
- Diferenciação visual sutil: badge minúsculo no canto do card (`link` = seta externa; `file` = ícone de download/arquivo). Tokens de cor do tema — sem hex inline.
- Remoção: já chama `deletePhotoAttachment(uri)`; funciona igualzinho para vídeo local (mesmo diretório).

**6. Novo `src/components/notes/AttachmentVideoLightbox.tsx`**
- Espelha `AttachmentLightbox` (mesmas garantias de `stopPropagation`/ESC capture para não fechar o Dialog pai).
- Renderiza `<video src={src} controls playsInline autoPlay className="max-h-[100dvh] max-w-full">`.
- Botão nativo de fullscreen do `<video>` no Android abre o player em tela cheia do sistema (comportamento equivalente ao "player nativo" pedido). Web funciona idêntico.

**7. Sync (`personal-outlines.functions.ts`) — nada a fazer**
- O sync já serializa `content_json` como JSONB opaco. `serializeAttachments` preserva os novos campos automaticamente porque `normalizeAttachment` retorna o objeto tipado.

**8. i18n (`pt.json`, `en.json`, `es.json`)**
- Novas chaves: `personalOutlines.attachments.addVideoFile`, `addVideoFileTitle`, `addVideoFileDesc`, `videoFile`, `videoTooLarge` (mensagem de limite).

## Diretrizes atendidas

- **Reaproveitamento**: 100% dentro de `OutlineAttachmentsBar` + `AttachmentAddDialog`; nenhum componente paralelo.
- **Identificação visual premium**: `PlayCircle` já existe; badge sutil `link/file` usando tokens `text-muted-foreground`/`bg-accent`. Título curto continua abaixo (`truncate`).
- **Player inteligente**: link → `@capacitor/browser` (deep-link Android); arquivo → `<video controls>` em lightbox, com fullscreen nativo do próprio elemento.
- **Zero alteração de tabelas**: campo `source` vive dentro do `content_json.attachments[]`.
- **Tokens semânticos**: todas as cores via classes shadcn/tema; sem hex inline.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Vídeos grandes → OOM em `readAsDataURL` | Limite duro de 200 MB com toast claro; recomendar MP4 comprimido |
| Base64 infla memória (+33%) | Aceito para até 200 MB; roadmap futuro: migrar para stream Blob quando `@capacitor/filesystem` v7 estabilizar `writeFile` com Blob |
| `file://` bloqueado no WebView | Já resolvido por `Capacitor.convertFileSrc` (`toDisplaySrc`) — o mesmo caminho das fotos |
| Anexos antigos sem `source` | `normalizeAttachment` default `"link"` quando `url` presente, `"file"` quando só `uri` — retrocompat total |
| Build/tsgo | Nenhum plugin novo; só tipos ampliados. `bunx tsc --noEmit` continua limpo |
| APK | Nenhuma alteração em `android/` necessária, sem bump obrigatório de `versionCode` |

## Fora do escopo

- Miniatura poster real do vídeo (frame extraction) — exige canvas/ffmpeg-wasm; fica para uma onda futura. Por ora, `PlayCircle` sobre fundo `bg-muted`.
- Sincronizar o **arquivo binário** com Supabase Storage — permanece local (mesma regra das fotos).
