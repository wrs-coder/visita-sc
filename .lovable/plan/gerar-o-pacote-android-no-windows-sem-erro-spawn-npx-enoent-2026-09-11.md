# Gerar o pacote Android no Windows sem erro "spawn npx ENOENT"

## Problema

No Windows, `npx` é um arquivo `.cmd`. O script que monta a casca local do app
chama o `npx` diretamente, sem passar pelo interpretador de comandos do Windows,
e o Node v24 responde `spawn npx ENOENT`. Resultado: o comando de release para
antes de gerar o APK.

## O que será feito

1. **Compatibilidade com Windows**
   Ajustar a chamada do subprocesso em `scripts/build-app-shell.mjs` para rodar
   com `{ shell: true }` (e usar `npx.cmd` quando a plataforma for `win32`),
   mantendo o comportamento atual em Linux/macOS.

2. **Fallback sem subprocesso algum**
   Se o servidor local não puder ser iniciado (ou falhar por qualquer motivo),
   o script passa a montar o `index.html` sozinho:
   - localiza o bundle de entrada em `assets/` da saída do cliente
     (`dist/client`, `.output/public` ou `dist/public`), lendo o manifesto do
     Vite quando existir e, na ausência dele, o arquivo `index-*.js`;
   - escreve uma página HTML mínima e completa (doctype, `<div id="root">`,
     `<script type="module">` apontando para esse bundle, mais os `<link>` de
     CSS, ícone e manifesto encontrados);
   - copia toda a pasta de saída para `dist-app/`.

3. **Validação mantida**
   A verificação atual continua valendo para qualquer origem da casca: doctype,
   `<script type="module">` e referência a `/assets/`. Se nada válido for
   produzido, o comando falha com mensagem clara em vez de gerar um APK de tela
   preta.

4. **Ordem final de tentativa**
   casca oficial do build → servidor local (agora compatível com Windows) →
   montagem estática direta a partir dos arquivos já gerados.

5. **Documentação**
   Nota curta em `ANDROID_RELEASE.md` explicando que no Windows o processo
   funciona sem passos manuais e que, se o servidor local não subir, a casca é
   montada diretamente dos arquivos da build.

## Detalhes técnicos

- Arquivo alterado: `scripts/build-app-shell.mjs` (novas funções
  `captureShellFromServer` com `shell: true` e `buildStaticShell()`).
- Nenhuma mudança em código do aplicativo, Capacitor, Gradle ou versão.
- O site no navegador continua servido pelo build normal; nada muda para ele.
