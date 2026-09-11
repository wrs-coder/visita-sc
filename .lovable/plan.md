# Corrigir a geração da casca local do aplicativo Android

## O que está acontecendo

A tela preta com "código" aparece porque o arquivo inicial que vai dentro do aplicativo (`dist-app/index.html`) não é gerado de forma confiável. Hoje ele é capturado subindo um servidor local durante o empacotamento: se esse servidor demorar, responder erro ou devolver outra coisa, o arquivo salvo deixa de ser uma página e o aplicativo mostra o conteúdo bruto.

Também há um descompasso de pastas: na sua máquina a saída aparece em `.output/public`, enquanto o empacotamento procura em `dist/client`.

## O que vou fazer

1. **Gerar a casca pelo caminho oficial.** Ativar o modo de casca estática do próprio framework, que produz um arquivo inicial pronto no fim do build — sem depender de subir servidor nenhum.
2. **Montagem automática da pasta do aplicativo.** Um único comando passa a: fazer o build, localizar a pasta de saída (procurando tanto `dist/client` quanto `.output/public`), copiar os arquivos e gravar o arquivo inicial em `dist-app`.
3. **Verificação obrigatória antes de empacotar.** Se o arquivo inicial não for uma página válida (sem `<!DOCTYPE html>` ou sem o script de inicialização), o comando falha com mensagem clara em vez de gerar um APK quebrado.
4. **Manter a captura por servidor local apenas como reserva**, usada só se o caminho oficial não produzir a casca.
5. **Ajustar os comandos** para que gerar APK ou AAB seja um comando só, sem copiar nada à mão.

Nada muda no site do navegador, no banco de dados, nas contas, no cronômetro, nos esboços, nos anexos ou no funcionamento offline. A escolha automática entre os três endereços de dados continua igual.

## Outra sugestão segura (recomendo incluir)

Uma **tela de diagnóstico na primeira abertura do aplicativo**: se a casca carregar mas nenhum dos três endereços responder, o app mostra uma mensagem explicando e um botão "tentar novamente", em vez de tela preta. Custo baixo e evita que qualquer falha futura pareça um app quebrado.

## Detalhes técnicos

- `vite.config.ts`: adicionar `tanstackStart.spa = { enabled: true, maskPath: "/", prerender: { enabled: true, outputPath: "/_shell", crawlLinks: false, retryCount: 1 } }`. Se o prerender falhar no ambiente Cloudflare/Nitro (erro já observado antes), manter o build atual e cair para a rota de reserva do item 4 — a decisão fica no script, não no desenvolvedor.
- `scripts/build-app-shell.mjs`: reescrito em três etapas — (a) resolver `CLIENT_DIR` entre `dist/client` e `.output/public`; (b) obter a casca de `<clientDir>/_shell.html` (ou `_shell/index.html`); (c) fallback: `wrangler dev` + captura de `/` como hoje, com timeout e `process.exit`.
- Validação: a casca precisa começar com `<!DOCTYPE html`, conter `<script type="module"` e um `src`/`import("/assets/...")`; caso contrário `process.exit(1)`.
- Cópia: `cp` recursivo do client dir para `dist-app`, depois gravar `index.html`; remover `dist-app` antes.
- `package.json`: `app:package` = `build` + `app:shell`; `android:release:apk` / `android:release:aab` continuam chamando `app:package && cap sync android`. Sem alteração de versão (segue 4.1.0 / versionCode 3) salvo pedido seu.
- `capacitor.config.ts`: mantém `webDir: "dist-app"`, `androidScheme: "https"`, sem `server.url`; sem mudanças necessárias além de confirmação.
- Diagnóstico opcional: bloco em `src/lib/api-origin.ts` + aviso na inicialização quando todas as origens falharem na sondagem.
