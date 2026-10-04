# Corrigir erro ao anexar vídeo MP4 nos esboços

## Causa provável
Quando você escolhe um vídeo no celular, o app tenta transformar o arquivo **inteiro de uma vez** em texto para gravar no aparelho. Esse texto fica cerca de 35% maior que o vídeo e passa todo de uma vez pela ponte entre a tela e o Android. Com vídeos a partir de algumas dezenas de MB, a memória acaba e a gravação falha. O app tenta então um segundo local de armazenamento, que no Android também tem limite de tamanho, e aí aparece "Não foi possível adicionar o anexo". Fotos funcionam porque são reduzidas antes.

Essa causa ainda não está confirmada no seu aparelho. Por isso, o primeiro passo é registrar o motivo exato da falha.

## O que será feito
1. **Gravar o vídeo em partes**: gravar o vídeo em pedaços pequenos (cerca de 1 a 2 MB), um depois do outro, em vez de tudo de uma vez. Assim o consumo de memória fica baixo e estável, mesmo perto do limite de 200 MB.
2. **Não usar o segundo armazenamento para vídeos grandes** no celular: se a gravação em partes falhar, o app apaga o arquivo incompleto e mostra uma mensagem clara.
3. **Mensagens mais claras**: "Pouco espaço no aparelho", "Vídeo muito grande" ou "Falha ao gravar o vídeo", em vez da mensagem genérica. O motivo técnico também fica registrado para diagnóstico.
4. **Indicador de progresso** no botão "Adicionar" durante a gravação, para vídeos maiores.
5. Versão **4.2.13 / versionCode 23**. A versão anunciada como nova continua a mesma até a Play Store aprovar.

Fotos, links, outros dados do app, Bíblia, login e PIN não mudam.

## Detalhes técnicos
- `src/lib/outline-attachments.ts`: novo `writeLocalFileChunked` para uso nativo: `Filesystem.writeFile` no primeiro pedaço e depois `Filesystem.appendFile`. Cada pedaço vem de `blob.slice()` convertido com `blobToBase64`, com tamanho múltiplo de 3 bytes para o base64 continuar válido. `saveVideoAttachment` passa a usar essa função e aceita um `onProgress` opcional. Em caso de erro, roda `deleteFile` e lança `VIDEO_WRITE_FAILED` ou `STORAGE_FULL`. Na versão web/PWA, o vídeo continua sendo guardado no armazenamento do navegador.
- `AttachmentAddDialog.tsx`: mostra a porcentagem durante a gravação e trata os novos códigos de erro.
- Traduções pt/en/es para as novas mensagens.
- Testes da divisão em pedaços (o base64 juntado é igual ao original), typecheck e testes existentes.
