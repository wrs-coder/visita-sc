# App do celular com failover entre os 3 endereços

## Situação atual

Testei agora os três endereços e todos responderam normalmente (código 200):

- visita-sc.lovable.app
- visitasc.com.br
- www.visitasc.com.br

Os dois domínios próprios estão ativos e o app está publicado. Ou seja, a queda que você viu foi momentânea (instabilidade de rede/DNS no celular), não uma configuração errada.

O problema real é outro: o aplicativo instalado aponta **fixo** para um único endereço (visita-sc.lovable.app). Se esse endereço falhar por qualquer motivo, o app fica em tela branca — mesmo com os outros dois endereços funcionando.

## O que vou fazer

Transformar o aplicativo em "multi-endereço": ao abrir, ele testa os três endereços em sequência e entra pelo primeiro que responder.

1. **Tela de entrada dentro do app** (empacotada no APK/AAB, funciona sem internet):
   - mostra a logo e "Conectando…";
   - testa, em ordem, o endereço salvo da última vez, depois `www.visitasc.com.br`, `visitasc.com.br` e `visita-sc.lovable.app`;
   - abre o primeiro que responder e memoriza qual funcionou;
   - se nenhum responder, mostra uma mensagem clara com botão "Tentar novamente" e a opção de escolher o endereço manualmente.
2. **Liberar a navegação para os três domínios** dentro do aplicativo, para que o app não trate a troca de endereço como "site externo".
3. **Atualizar o guia de publicação** (`ANDROID_RELEASE.md` e `CAPACITOR.md`) explicando o novo comportamento e como gerar o novo AAB.
4. **Subir a versão** para 4.0.1 (`versionCode` 2), já que é preciso enviar um novo pacote à Play Store para o failover valer nos celulares.

Nada muda no site aberto pelo navegador, nem no banco de dados, login, sincronização ou modo offline.

## Detalhes técnicos

- Novo diretório `android-shell/` com `index.html` autocontido (sem build), usado como `webDir` no `capacitor.config.ts`.
- Remoção de `server.url` fixo; a troca de origem passa a ser feita pela shell via `location.replace()`, preservando as server functions do TanStack Start (que continuam sendo chamadas em caminhos relativos no domínio escolhido).
- Sonda de disponibilidade: `fetch(origin + '/manifest.webmanifest', { method: 'GET', cache: 'no-store' })` com `AbortController` e timeout de ~4s por endereço; ordem persistida em `localStorage` da shell.
- `capacitor.config.ts`: `server.androidScheme: 'https'`, `server.allowNavigation: ['visita-sc.lovable.app', 'visitasc.com.br', 'www.visitasc.com.br', '*.supabase.co']`.
- `android/app/build.gradle`: `versionCode 2`, `versionName "4.0.1"`; `package.json` alinhado em `4.0.1`.
- `AndroidManifest.xml` e `assetlinks.json` permanecem como estão (já cobrem os três hosts).

## Observação sobre a sessão de login

Cada domínio guarda a sessão separadamente no navegador interno. Se o app entrar por um endereço diferente do habitual, pode ser necessário fazer login uma vez naquele endereço. Por isso a shell sempre prioriza o último endereço que funcionou.
