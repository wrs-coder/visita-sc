## Diagnóstico

Verifiquei o projeto: **não existe `android/keystore.properties` nem nenhum arquivo `.keystore` no repositório** (eles estão no `.gitignore`, o que é correto). E o `android/app/build.gradle` (linhas 40-42) aplica a assinatura de release **apenas se `keystore.properties` existir**:

```gradle
if (keystorePropertiesFile.exists()) {
    signingConfig signingConfigs.release
}
```

Ou seja: se você rodou `npm run android:release:aab` na sua máquina sem esse arquivo, o Gradle **não falha** — ele simplesmente gera o AAB assinado com a chave de debug. É exatamente isso que produz a mensagem "O APK enviado tem uma assinatura diferente". A causa é essa falha silenciosa, não o Package Name.

Boa notícia, considerando suas respostas: você tem a keystore e as senhas, o app nunca foi publicado, e a **Assinatura de apps do Google Play está ativada**. Isso significa que:

- **Não é preciso mudar o Package Name.** Mantemos `app.lovable.visitasc`.
- **Nenhum usuário será afetado** — não há instalações em produção.
- Com o Play App Signing ativo, sua keystore é apenas a **chave de upload**; o Google detém a chave final de distribuição. Chave de upload pode ser redefinida no futuro sem perder o app, o ID ou os usuários.

---

## Ponto crítico sobre o `assetlinks.json`

O fingerprint hoje em `public/.well-known/assetlinks.json` é `2C:EA:E9:...:61:CA` — a sua **chave de upload**. Com Play App Signing ativado, o app instalado pelos usuários é assinado pela **chave de distribuição do Google**, que tem um SHA-256 diferente. Se o `assetlinks.json` não tiver esse segundo fingerprint, os App Links (`visitasc.com.br`, `visita-sc.lovable.app`) **não vão abrir no app** depois de publicado.

A correção é listar **ambos** os fingerprints.

---

## Plano de execução

### Passo 1: Tornar a falha de assinatura visível (a raiz do problema)
Adicionar em `android/app/build.gradle` uma guarda via `gradle.taskGraph.whenReady` que **interrompe o build com mensagem explicativa** quando uma tarefa de release (`assembleRelease`, `bundleRelease`, `package*Release`) é executada sem `android/keystore.properties`. Builds de debug continuam funcionando normalmente para clones sem keystore.

### Passo 2: Adicionar comando de verificação de assinatura
Incluir em `package.json` o script `android:verify:signature`, rodando `keytool -printcert -jarfile` sobre o AAB gerado para imprimir o SHA-256 da assinatura. Assim você confere, **antes** de subir na Play, se o fingerprint bate com `2C:EA:E9:...:61:CA`.

### Passo 3: Preparar o `assetlinks.json` para os dois fingerprints
Reestruturar `public/.well-known/assetlinks.json` mantendo o fingerprint de upload atual, com o array já pronto para receber o SHA-256 da chave de distribuição do Google.

> Ajuste em relação à versão anterior do plano: **não** vou inserir um placeholder textual no JSON. Uma string inválida no array faz o verificador do Google reprovar o arquivo inteiro e quebraria os App Links. O segundo fingerprint entra assim que você me enviar o valor real do Play Console.

### Passo 4: Reescrever a seção de assinatura do `ANDROID_RELEASE.md`
Documentar de forma inequívoca:
- que `android/keystore.properties` é **obrigatório** para builds de release;
- o passo de verificação do fingerprint antes do upload;
- a diferença entre chave de upload e chave de distribuição do Google;
- como obter o SHA-256 da chave de distribuição (Play Console → Configuração → Integridade do app);
- o procedimento de "Solicitar redefinição da chave de upload", caso a keystore seja perdida no futuro;
- reforço de backup da keystore em dois locais.

### Passo 5: Validar
Rodar `bunx tsc --noEmit` para garantir que nada quebrou no app web. Nenhuma mudança toca em código React, server functions, banco ou service worker — o app em si permanece intacto.

---

## O que você faz na sua máquina depois

1. Criar `android/keystore.properties` (baseado em `android-signing/keystore.properties.example`), apontando `storeFile` para o seu `.keystore` real dentro de `android/app/`.
2. Rodar `npm run android:release:aab`. Agora, se faltar a keystore, o build **para com erro** em vez de gerar um AAB inválido.
3. Rodar `npm run android:verify:signature` e confirmar que o SHA-256 é `2C:EA:E9:...:61:CA`.
4. Subir o AAB na Play Console.
5. Copiar o SHA-256 da chave de assinatura do Google Play e me enviar — eu completo o `assetlinks.json` e você republica o site.

> Se, mesmo com a keystore correta, a Play continuar recusando: como o app **nunca foi publicado**, existe a saída simples de excluir o rascunho e criar o app novamente, registrando a chave certa desde o início. Isso não é possível depois da primeira publicação — por isso vale resolver agora.

---

## Resumo do impacto

| Item | Situação |
|---|---|
| Package Name | **Mantido** — `app.lovable.visitasc` |
| Usuários existentes | Nenhum impacto (app em rascunho) |
| Perda de dados / conta | Nenhuma |
| Código do app (web/React) | Nenhuma alteração |
| Arquivos alterados | `android/app/build.gradle`, `package.json`, `public/.well-known/assetlinks.json`, `ANDROID_RELEASE.md` |