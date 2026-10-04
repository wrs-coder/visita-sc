# Vídeo nos esboços (app Android): guardar só a referência e abrir no player do celular

## O que acontece hoje
No app instalado, o anexo de vídeo não guarda só o caminho. Ele tenta **copiar o vídeo inteiro** para dentro do app. Para isso, transforma o arquivo todo em texto de uma vez e manda pela ponte com o Android. Essa etapa falha com vídeos médios ou grandes, mesmo com espaço livre no aparelho. O app então tenta um segundo local de armazenamento, que também falha, e aparece "Não foi possível adicionar o anexo". As fotos já tiveram a mesma falha pelo mesmo motivo. No navegador (PWA) o caminho é outro, e por isso lá funciona.

A seleção de arquivos que o app usa hoje não dá acesso ao caminho real do vídeo no celular, só ao conteúdo. Por isso o app acabava copiando.

## O que será feito
1. **No app Android, o vídeo não será mais copiado.** Ao tocar em "Anexar vídeo", abre o seletor de arquivos do Android. O app guarda só a referência ao vídeo, com permissão permanente de leitura, mais o nome e o tamanho para mostrar no cartão.
2. **Reprodução no player nativo do Android.** Ao tocar no anexo, o vídeo abre no aplicativo de vídeo do celular, e não mais dentro do app.
3. **Se o vídeo for apagado ou movido** no celular, o cartão mostra "Vídeo não encontrado neste aparelho" e oferece remover o anexo. O app não trava.
4. **Sem limite de 200 MB** no app Android, porque nada é copiado.
5. **PWA/navegador sem mudança**: continua funcionando como hoje.
6. Vídeos já anexados que foram copiados continuam abrindo como antes.
7. Versão **4.2.13 / versionCode 23**. A versão anunciada como nova só muda depois que a Play Store aprovar.

Fotos, links, Bíblia, login e PIN não mudam.

## Atenção
- Como só a referência fica guardada, apagar ou mover o vídeo no celular faz o anexo parar de abrir.
- A referência vale só neste aparelho. Ao sincronizar, o anexo aparece nos outros aparelhos como indisponível.

## Detalhes técnicos
- Novos plugins: `@capawesome/capacitor-file-picker` (`pickVideos`, que devolve um `content://` com permissão persistente) e `@capawesome-team/capacitor-file-opener` (`openFile` com `mimeType`, que abre via Intent ACTION_VIEW). Depois, rodar `npx cap sync android`.
- `outline-attachments.ts`: novo `storage: "ref"` com `path = content://...`, mais `name`/`size`. Novo `pickNativeVideoReference()`. `openLocalVideo(a)` usa o FileOpener para `ref` e `fs`. A verificação de existência é feita no momento de abrir. `normalizeAttachment` aceita `ref`, e `deleteFileAttachment` ignora `ref` (o arquivo do usuário nunca é apagado).
- `AttachmentAddDialog.tsx`: no app nativo, o modo `videoFile` troca o campo de arquivo por um botão "Escolher vídeo" ligado ao plugin. No web, nada muda.
- `OutlineAttachmentsBar.tsx`: no app nativo, o toque no vídeo chama `openLocalVideo` em vez de abrir o lightbox. Se der erro, mostra o estado de indisponível.
- Traduções pt/en/es. Testes de normalização e do round-trip com `ref`. Typecheck e testes.
- Fora do plano (modo planejamento): registrar a tarefa no roadmap quando a implementação começar.
