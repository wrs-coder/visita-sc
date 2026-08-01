# Build de Produção Android (APK / AAB assinado para Play Store)

Este guia cobre **gerar a keystore**, **compilar o AAB assinado** e a **checklist da Play Console**.

> Pré-requisito: `npm install`, `npm run cap:install` e `npm run cap:add:android` já executados (veja `CAPACITOR.md`). A pasta `android/` já está versionada neste repositório.

---

## 1. Gerar a keystore (apenas uma vez na vida do app)

⚠️ **CRÍTICO**: guarde o arquivo `.keystore` + as senhas em local seguro (gerenciador de senhas + backup offline). Se perder, **não conseguirá mais atualizar** o app na Play Store — será preciso publicar como aplicativo novo.

```bash
npm run android:keystore
```

Gera `android/app/visita-sc-release.keystore`. O comando pede:

- Senha do keystore (anote!)
- Nome, organização, cidade, etc.
- Senha da chave (pode ser a mesma do keystore)

---

## 2. Criar o `android/keystore.properties`

Use o exemplo em `android-signing/keystore.properties.example`:

```properties
storeFile=visita-sc-release.keystore
storePassword=SUA_SENHA_DO_KEYSTORE
keyAlias=visita-sc
keyPassword=SUA_SENHA_DA_CHAVE
```

Esse arquivo e os `.keystore` já estão no `android/.gitignore` — **nunca commite**.

---

## 3. Assinatura no Gradle — já configurada ✅

Não é necessário editar nada. O `android/app/build.gradle` já:

- carrega `android/keystore.properties` no topo;
- define `signingConfigs { release { ... } }`;
- aplica `signingConfig signingConfigs.release` no `buildTypes.release` **somente quando o `keystore.properties` existe** (assim, quem clonar o repositório sem a keystore ainda consegue compilar);
- mantém `minifyEnabled false` de propósito, para evitar regressões de R8/ProGuard nesta submissão.

O snippet em `android-signing/build.gradle.snippet` fica apenas como referência histórica.

---

## 4. Modo de carregamento do app

O `capacitor.config.ts` aponta para `https://visita-sc.lovable.app`. **Mantenha assim.**

> ❌ **Não remova o bloco `server` hoje.**
> O app é TanStack Start com SSR: 20 módulos usam `createServerFn` em caminhos relativos (login, congregações, esboços, sincronização, relatórios, backups). Com `webDir` local, essas chamadas iriam para o próprio dispositivo, sem servidor, e falhariam.
> O empacotamento 100% offline é uma migração de arquitetura (mover as server functions para chamadas com URL absoluta ao backend + testes de autenticação em WebView), planejada para uma onda futura.

O uso sem internet continua coberto pelo cache offline-first do app e pelo service worker.

---

## 5. Gerar o APK ou o AAB assinado

```bash
# AAB (formato exigido pela Play Store)
npm run android:release:aab
# → android/app/build/outputs/bundle/release/app-release.aab

# APK (instalação direta / testes)
npm run android:release:apk
# → android/app/build/outputs/apk/release/app-release.apk
```

Envie o `.aab` em **Play Console → Produção (ou Teste interno) → Criar nova versão**.

---

## 6. Versionamento (toda nova publicação)

Incremente em `android/app/build.gradle`:

```gradle
defaultConfig {
    versionCode 8        // +1 a cada upload na Play (atual: 7)
    versionName "4.0.1"  // visível ao usuário (atual: 4.0.0)
}
```

Mantenha o `version` do `package.json` alinhado ao `versionName`.

---

## 7. Conformidade já aplicada no projeto

- `targetSdkVersion 36` e `compileSdkVersion 36` (`android/variables.gradle`) — acima do mínimo exigido pela Play.
- `android:allowBackup="false"`, `android:fullBackupContent="false"` e `data_extraction_rules.xml` excluindo todos os domínios — nenhum dado do app entra em backup na nuvem ou transferência entre aparelhos.
- `android:usesCleartextTraffic="false"` explícito.
- Sem `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE`: backups, modelos e anexos usam o diretório privado via `@capacitor/filesystem` e o seletor do sistema via `@capacitor/share`. Única permissão declarada: `INTERNET`.
- Política de privacidade pública em **https://visita-sc.lovable.app/politica-privacidade** (PT/EN/ES).

---

## Checklist Play Console

- [ ] Keystore gerada e com backup seguro (+ senhas)
- [ ] `android/keystore.properties` criado localmente
- [ ] `versionCode` incrementado e `versionName` atualizado
- [ ] AAB gerado com `npm run android:release:aab`
- [ ] URL da política de privacidade preenchida na ficha do app
- [ ] Formulário de **Segurança dos dados (Data Safety)** preenchido:
      coleta de e-mail/nome/telefone para funcionamento do app, dados
      criptografados em trânsito, usuário pode solicitar exclusão
- [ ] Ícone 512x512 PNG
- [ ] Feature graphic 1024x500
- [ ] Screenshots (mínimo 2 de celular)
- [ ] Descrição curta e completa da loja
- [ ] Classificação de conteúdo respondida
- [ ] Público-alvo definido (não direcionado a crianças)
