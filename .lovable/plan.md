# Vídeo nos esboços (app Android): cópia segura em partes + abertura no player do celular

## Por que falha hoje
No app instalado, o vídeo é copiado para dentro do app, mas de um jeito ruim: o arquivo inteiro vira texto de uma vez e passa de uma só vez pela ponte com o Android. Isso estoura o limite da ponte, mesmo com bastante memória livre no celular, e aparece "Não foi possível adicionar o anexo". As fotos já tiveram a mesma falha antes. No PWA o caminho é outro, e por isso funciona.

## Recomendação (mais robusta a longo prazo)
Guardar só o caminho do vídeo é frágil: o anexo quebra se o vídeo for movido, apagado ou "limpo" pela galeria, ou se o Android revogar a permissão. Por isso, o melhor é **manter a cópia dentro do app, mas feita do jeito certo**:

1. **Cópia em partes pequenas** (cerca de 1 MB por vez). O consumo de memória fica baixo e estável, e a ponte nunca estoura. Funciona até o limite de 200 MB.
2. **Reprodução no player nativo do Android**: ao tocar no anexo, o vídeo abre no aplicativo de vídeo do celular, a partir da cópia guardada no app.
3. **Cópia que não fica pela metade**: se faltar espaço ou algo falhar, o arquivo incompleto é apagado e aparece uma mensagem clara, como "Pouco espaço no aparelho" ou "Falha ao gravar o vídeo".
4. **Progresso visível** ("Gravando… 45%") enquanto o vídeo é copiado.
5. **A mesma correção vale para fotos grandes**, para a falha antiga não voltar.
6. Anexos antigos continuam abrindo. O PWA não muda.
7. Versão **4.2.13 / versionCode 23**. A versão anunciada como nova só muda depois que a Play Store aprovar.

O vídeo fica salvo de verdade no app, então não depende de você manter o arquivo original. Em troca, ocupa espaço no celular. Ao remover o anexo, a cópia é apagada.

## Detalhes técnicos
- `outline-attachments.ts`: `writeLocalFile` nativo passa a gravar em pedaços. O primeiro vai com `Filesystem.writeFile` e os seguintes com `Filesystem.appendFile`. Cada pedaço vem de `blob.slice()` com tamanho múltiplo de 3 bytes, para o base64 continuar válido. Aceita `onProgress`. Para vídeo, no app nativo, não há mais fallback para IndexedDB. Em caso de erro, roda `deleteFile` e lança `VIDEO_WRITE_FAILED` ou `STORAGE_FULL`.
- Novo plugin `@capawesome-team/capacitor-file-opener`: `openLocalVideo(a)` pega o caminho com `Filesystem.getUri` e chama `openFile({ path, mimeType })`. Se falhar, usa o lightbox atual.
- `AttachmentAddDialog.tsx`: mostra o progresso e as novas mensagens de erro. `OutlineAttachmentsBar.tsx`: no app nativo, o toque no vídeo abre o player do Android.
- Traduções pt/en/es. Teste da divisão em pedaços (o base64 juntado é igual ao original). Typecheck e testes. Depois, rodar `npx cap sync android`.

## Zoom nas fotos (incluído)
Hoje o visualizador de fotos não tem zoom próprio. Quando o zoom "funciona", é o zoom da página inteira, que o celular às vezes permite e às vezes bloqueia.
- O zoom passa a funcionar sempre: **pinça com dois dedos** para aproximar e afastar, **toque duplo** para alternar entre 2x e o tamanho normal, e **arrastar** para mover a foto com zoom. No computador, também com a **roda do mouse**.
- Botões **+ / − / tamanho normal** no visualizador. O zoom volta ao normal ao trocar de foto ou fechar.
- Técnico: `react-zoom-pan-pinch` (`TransformWrapper`/`TransformComponent`) em `AttachmentLightbox.tsx`, com `touch-action: none` na área da foto, zoom entre 1x e 5x e `doubleClick` com zoom.
