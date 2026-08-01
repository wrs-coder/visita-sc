## O que essa mensagem significa

`app.lovable.visitasc` **já está registrado no Google Play por outra conta/chave** (é o namespace padrão `app.lovable.*` da plataforma). O Google só liberaria esse nome para quem comprovar a posse da chave de assinatura já associada a ele — chave que não é sua. O fingerprint `2C:EA:E9:…:61:CA` é apenas identificação pública e não prova posse.

Portanto não existe correção de assinatura possível: a solução é publicar com um Package Name próprio, exatamente como a Play Console já havia sugerido: **`com.waorodrigues.visitasc`**.

## Isso quebra o aplicativo?

Não. Verifiquei o projeto: o app carrega o site publicado (`server.url = https://visita-sc.lovable.app`), então login, banco, dados dos usuários e todas as server functions continuam iguais. O app nunca foi publicado (está em rascunho), então não há base instalada nem avaliações a preservar. Muda apenas o identificador nativo Android.

## Plano

1. **Trocar o ID em todos os pontos**
   - `capacitor.config.ts`: `appId` → `com.waorodrigues.visitasc`
   - `android/app/build.gradle`: `namespace` e `applicationId`
   - `android/app/src/main/res/values/strings.xml`: `package_name` e `custom_url_scheme`
   - `package.json`: script `cap:init`
   - `CAPACITOR.md` e `ANDROID_RELEASE.md`: referências textuais

2. **Mover a Activity nativa**
   - `android/app/src/main/java/app/lovable/visitasc/MainActivity.java` → `.../com/waorodrigues/visitasc/MainActivity.java`, com o `package com.waorodrigues.visitasc;` atualizado e a pasta antiga removida.

3. **Versão limpa para o primeiro envio**
   - `versionCode 1` e `versionName "4.0.0"` (é um app novo na Play; começar em 1 evita confusão futura). `package.json` permanece em `4.0.0`.

4. **Snippet de registro da Play Console**
   - Manter o `resValue "string", "adi_registration_code"` já presente no `build.gradle`, atualizado se a Play Console gerar um novo snippet para o novo pacote.

5. **App Links / `assetlinks.json`**
   - Atualizar `public/.well-known/assetlinks.json` com `package_name: com.waorodrigues.visitasc` e deixar o array de fingerprints pronto para receber, após a primeira publicação, o SHA‑256 da **chave de upload** (sua keystore) e o da **chave de distribuição** do Google.

6. **Assinatura**
   - Fluxo já existente permanece: `android/keystore.properties` local (nunca versionado) → `npm run android:release:aab` → `npm run android:verify:signature`. Como o pacote é novo, **qualquer keystore sua serve**; ela passa a ser a chave de upload oficial deste app. Guarde-a com dois backups.

## Ponto de atenção fora do código

Se você usa login social (Google) com deep link nativo, o esquema de URL passa a ser `com.waorodrigues.visitasc://`. Depois do rename, será preciso registrar esse novo esquema nas URIs de redirecionamento da autenticação. Hoje, com o app carregando o site publicado via HTTPS, o login web continua funcionando normalmente — só o fluxo nativo exigiria esse ajuste.

## Detalhes técnicos

Nenhuma alteração em banco de dados, RLS, server functions ou código React. O `routeTree`, o Supabase e o domínio `visitasc.com.br` ficam intactos. Após as edições, rodar `npm run android:build` para o Capacitor sincronizar o novo ID no projeto nativo.
