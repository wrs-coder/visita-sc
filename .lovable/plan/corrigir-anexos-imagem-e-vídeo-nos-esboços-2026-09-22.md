# Corrigir anexos (imagem e vídeo) nos esboços

## O que está acontecendo

Ao anexar uma foto, o app guarda apenas um "endereço temporário" do arquivo, válido enquanto a tela não é recarregada. Assim que a nota é salva, sincronizada ou a tela recarrega, esse endereço morre e sobra o ícone de imagem quebrada. No aparelho instalado, o caminho gravado é um caminho absoluto que pode mudar a cada atualização do app, com o mesmo efeito. Vídeos locais têm exatamente o mesmo problema. Links (vídeo/publicação) continuam funcionando, porque guardam só a URL.

Além disso, quando o arquivo não abre, a tela mostra o ícone quebrado em vez de avisar o usuário.

Decisões já tomadas: anexos ficam **somente no aparelho** e fotos grandes são **reduzidas automaticamente**.

## O que será feito

1. **Guardar o arquivo de verdade, não um endereço temporário**
   - No aparelho instalado: continua gravando o arquivo na área privada do app, mas guardando o caminho relativo (estável entre atualizações).
   - No navegador/PWA: o arquivo passa a ser guardado no armazenamento local do navegador, de modo que continua abrindo depois de recarregar a página.

2. **Abrir o anexo sob demanda**
   - Miniatura e tela de visualização passam a pedir o arquivo na hora de mostrar, com indicador de carregamento.
   - Se o arquivo realmente não existir mais, aparece "Anexo indisponível neste aparelho" em vez de ícone quebrado, com opção de remover.

3. **Reduzir fotos grandes**
   - Redimensionamento para no máximo 2000px no maior lado e conversão para JPEG (inclusive fotos HEIC do iPhone, que o app não conseguia exibir).

4. **Funcionar em todos os modos**
   - Modo edição, modo esboço (leitura), modo imersivo e o modo tela cheia do painel inicial usam o mesmo componente corrigido; todos serão verificados.
   - Anexos antigos que só tinham endereço temporário serão exibidos como indisponíveis, sem quebrar a nota.

5. **Verificação**
   - Testes automatizados dos anexos, verificação de tipos, compilação e um teste real no preview: anexar imagem, abrir, recarregar a página e abrir de novo.
   - Versão do app atualizada para 4.2.5 (versionCode 15) para gerar o novo pacote Android.

## Detalhes técnicos

- `src/lib/outline-attachments.ts`: gravação passa a devolver `{ storage: "fs" | "idb", path }`; nativo usa `Filesystem` com caminho relativo + `getUri`/`convertFileSrc` no momento da exibição; web usa `idb-keyval` guardando o `Blob` e gerando `URL.createObjectURL` sob demanda (com revoke no unmount). Campo `uri` legado continua sendo lido para compatibilidade.
- Novo `resolveAttachmentSrc(attachment)` assíncrono + hook `useAttachmentSrc` consumido por `OutlineAttachmentsBar`, `AttachmentLightbox` e `AttachmentVideoLightbox`; `onError` das tags `img`/`video` marca o anexo como indisponível.
- Nova função de compressão em canvas (`downscaleImage`) aplicada em `savePhotoAttachment`; vídeos mantêm o limite atual de 200 MB e passam a ser gravados em `Blob` (sem base64) quando possível, para evitar picos de memória.
- `normalizeAttachment`/`serializeAttachments` ganham os novos campos e mantêm o round-trip com `content_json` sem perder entradas existentes.
- `deleteFileAttachment` remove tanto do sistema de arquivos quanto do armazenamento do navegador.
- Sem mudanças em banco, RLS, Bíblia offline ou login/PIN.
