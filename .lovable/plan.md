# Corrigir a tela branca do aplicativo Android

## O que o erro indica

O aparelho tentou carregar `https://localhost/assets/index-CtCLhd6T.js` e não conseguiu. Ou seja: a página inicial pediu um arquivo de programa que **não existe dentro do aplicativo instalado**.

Há duas causas prováveis, e as duas serão tratadas:

1. **Cache antigo dentro do aplicativo.** O app registra o mesmo mecanismo de cache offline usado no site (service worker). Dentro do aplicativo instalado ele guarda a página inicial de uma versão anterior e volta a servi-la depois da atualização — apontando para arquivos que não existem mais no pacote novo. É o cenário que melhor explica o nome de arquivo antigo.
2. **Pacote incompleto.** Hoje o script que monta a pasta do aplicativo não confere se todos os arquivos citados na página inicial realmente foram empacotados; um pacote incompleto vira tela branca sem aviso.

## Sobre a sugestão de desativar o carregamento dinâmico

Desativar o "code-splitting" no Vite não é a melhor opção: junta tudo num arquivo gigante, deixa a abertura mais lenta e não resolve a causa (arquivo ausente/cache velho). O que faremos é garantir integridade e eliminar o cache conflitante — mais seguro e sem inchar o app.

Nada de banco de dados, login, sincronização offline de conteúdo ou telas será alterado.

## O que será feito

1. **Desligar o cache de páginas dentro do aplicativo instalado**
   - Em `src/components/PwaRegister.tsx`, não registrar o service worker quando o app roda em modo nativo (Capacitor / origem `localhost`), e, nesse caso, remover registros antigos e apagar os caches `html-*` e `static-*` deixados por versões anteriores. No site publicado nada muda.
   - Isso não afeta o funcionamento offline do app: no aparelho os arquivos já vêm empacotados, e os dados continuam no armazenamento local (React Query persister + fila offline).

2. **Carregar a página inicial de forma direta**
   - Em `scripts/build-app-shell.mjs`, a casca gerada passa a usar `<script type="module" src="/assets/…">` (com `modulepreload` dos pedaços necessários) em vez de um `import()` dinâmico. Menos um passo assíncrono e falhas visíveis em vez de tela branca silenciosa.

3. **Conferência obrigatória do pacote**
   - Ainda em `scripts/build-app-shell.mjs`, após montar `dist-app`: extrair todas as referências `/assets/…` da página inicial e do arquivo de entrada, e confirmar que cada arquivo existe na pasta. Se faltar qualquer um, o comando falha com a lista do que faltou — nunca mais gera um APK de tela branca.

4. **Rede de segurança em tempo de execução**
   - Reaproveitar `src/components/ChunkErrorBoundary.tsx`: se um pedaço de programa falhar ao carregar no aplicativo, limpar caches e recarregar a página inicial uma única vez (com marcação em `sessionStorage` para não entrar em laço).

5. **Nova versão e validação**
   - Subir para `4.1.1` (`versionCode` +1) em `package.json` e `android/app/build.gradle`, e registrar em `ANDROID_RELEASE.md` que o empacotamento agora valida os arquivos.
   - Rodar `npm run app:package` no ambiente e verificar que `dist-app/index.html` referencia apenas arquivos presentes.

## Detalhes técnicos

- `PwaRegister`: detectar nativo por `Capacitor.isNativePlatform?.()` ou `location.hostname === "localhost"` com protocolo `https:` e ausência de servidor remoto; em nativo chamar `unregister()` em todos os registros e `caches.delete()` nos caches de HTML/estáticos.
- `build-app-shell.mjs`: ler o `manifest.json` do Vite para o `isEntry` e seus `imports`, gerar `<link rel="modulepreload">` para cada um e validar existência em disco; manter os três caminhos atuais de obtenção da casca (oficial, servidor local da build, montagem estática).
- Nenhuma mudança em `vite.config.ts`, em `src/lib/api-origin.ts` ou nas funções de servidor.

## Depois de aprovado

Gerar o pacote com `npm run android:release:apk` (ou `:aab`) e testar a abertura no aparelho, inclusive atualizando por cima da versão instalada.
