# Corrigir o empacotamento: casca apontando para arquivos de outra build

## O que os arquivos mostram

A verificação nova funcionou como esperado: ela impediu a geração de um pacote quebrado. Mas o motivo não é exatamente o descrito.

- O script **já considera** `.output/public` (é um dos três lugares onde ele procura a saída do cliente).
- O script **já remove a barra inicial** ao conferir os arquivos em disco (`/assets/x.js` vira `assets/x.js`), então esse não é o motivo da falha.

O que de fato acontece: existem **duas pastas de saída na sua máquina** (`dist/client` de uma build anterior e `.output/public` da build atual). O script escolhe a primeira que encontrar — a antiga — enquanto a casca (página inicial) é obtida da build nova. Os nomes dos arquivos mudam a cada build (`index-Bu3iej49.js`), então a casca nova cita arquivos que só existem na pasta nova. Resultado: a lista de "arquivos não existem em dist-app/".

## O que será feito

1. **Escolher sempre a saída mais recente.** Em vez de pegar a primeira pasta que existir, comparar a data de modificação de `dist/client`, `.output/public` e `dist/public` e usar a mais nova; registrar no log qual foi escolhida.
2. **Limpar saídas antigas antes de montar.** No começo do empacotamento, apagar as pastas de saída obsoletas para que nunca sobre resíduo de uma build anterior.
3. **Conferência cruzada com correção automática.** Se, mesmo assim, a casca citar arquivos ausentes, o script procura esses arquivos nas outras pastas candidatas; se todos estiverem em outra pasta, refaz a cópia a partir dela em vez de falhar. Só falha se realmente não existirem em lugar nenhum.
4. **Caminhos relativos na página inicial do aplicativo.** Na casca gravada em `dist-app/index.html`, `/assets/...` passa a `./assets/...` (script, folha de estilo e pré-carregamentos), com `<base href="./">`. No aparelho o conteúdo é servido da raiz, então o comportamento não muda; a mudança apenas elimina qualquer dependência do caminho absoluto no WebView.
5. **Mensagem de erro melhor.** Quando faltar arquivo, o log passa a mostrar de qual pasta a casca veio e de qual pasta os arquivos foram copiados, para o diagnóstico ser imediato.

Nada muda no site publicado, no banco de dados, no login, na sincronização offline, no cronômetro ou nas telas. A alteração é apenas no empacotamento do aplicativo.

## Detalhes técnicos

- `scripts/build-app-shell.mjs`:
  - `pickClientDir()`: `statSync(...).mtimeMs` de cada candidato, ordenar decrescente, usar o mais recente; log com o caminho relativo e a data.
  - Antes de montar: `rm -rf` nos candidatos não escolhidos (apenas quando a build acabou de rodar via `app:package`; controlado por `--clean-stale`, ligado por padrão).
  - `verifyPackagedAssets`: manter a normalização atual da barra inicial; ao encontrar faltantes, tentar `resolveFromOtherCandidates()` — se todos os faltantes existirem em outro candidato, refazer `cp` e revalidar uma única vez; caso contrário `process.exit(1)` com a lista.
  - `normalizeShell` / `buildStaticShell`: emitir `<base href="./">` e reescrever `href`/`src` de `/assets/...` para `./assets/...`, inclusive nos `modulepreload`.
- `package.json`: sem alteração de comandos; `app:package` continua `build` + `app:shell`.
- Sem mudança em `vite.config.ts`, `capacitor.config.ts`, versão ou `versionCode`.

## Depois de aprovado

Rodar `npm run android:release:apk` (ou `:aab`) e conferir no log qual pasta de saída foi usada e a contagem de arquivos conferidos.
